//
// Player.js
// Listens for changes to the hashtag and changes the content of the ou player.
//



function onYouTubePlayerReady(playerId) {
	if (!playerId) { return; }
	document.getElementById('fplayer').addEventListener('onStateChange', 'toob._stateChange');
}


// Bind event listeners to the hashtag
// Bind media listeners for media controls, play, pause, next, prev
$.live({
	//
	// MAIN VIDEO CONTROL
	//
	'hashchange,popstate' : function(){
		// Has the video changed?
		// Apply all the features to the video if this has not already been done
		// this gets triggered when we get a hasnchange event on the page
		if(toob.player()){
			// Add active class
			$('article').addClass('active').siblings().removeClass('active');
		}
		else{
			$('.frame:first').addClass('active').siblings().removeClass('active');
		}
	}
});



	// REMOTE
	// Called from remote window, browser control
message.listen('toobifyRemote', function(data){
	log('toobifyRemote');
	if(!(toob.fplayer=document.getElementById('fplayer'))) return;

	// If no data is passed then merely trigger the current state
	if(!data){
		toob.triggerState();
		return;
	}

	log("Button clicked pause/play/move video",data);
	if(data.next===true){
		// User has changed video
		nav.next(true);
	}
	else if(data.prev===true){
		nav.prev(true);
	}
	else if(("state" in data) && data.state !== toob.fplayer.getPlayerState()){
		// execute the youtube command to play/pause
		toob.fplayer[(data.state===1?'play':'pause')+'Video']();
	}
});


var ytvideo;



var toob = {
	//
	// Player
	//
	player : function(){
	
		var p =  channel();
		
		log(p);

		if(!p||!p.id){
			$('article').html('<div id="player"></div>');
			return false;
		}

		$('h1').html((document.title = p.title));
		
		$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+p.id+'?v=2&alt=json-in-script&callback=?', function(json){
			console.log(json);
			var img = json['entry']['media$group']['media$thumbnail'];
			$('meta[name=image_src]').attr('content',img.length>2?img[2]['url']:img[0]['url']);
			toob.triggerState();
		});

		if(!ytvideo){

			if(swfobject.hasFlashPlayerVersion('10')){

				log('Loading SWF');

				swfobject.embedSWF('http://www.youtube.com/v/'+ p.id +'?color1=0x000000&color2=0x000000&version=3&enablejsapi=1&playerapiid=ytplayer',
					"player",
					"100%",
					"100%",
					"9",
					null,
				{}, { allowScriptAccess: "always", bgcolor: "#cccccc" }, { id: "fplayer" });

				ytvideo = document.getElementById('fplayer');

			}
			// Else have we loaded the Javascript library yet?
			else if(!document.getElementById('yt_player_api')){
				// lets try the chromeless player
				log('Loading the HTML5 player');
				// 2. This code loads the IFrame Player API code asynchronously.
				var tag = document.createElement('script');
				tag.src = "http://www.youtube.com/player_api";
				tag.id = 'yt_player_api';
				var firstScriptTag = document.getElementsByTagName('script')[0];
				firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

				// 3. This function creates an <iframe> (and YouTube player)
				//    after the API code downloads.
				window.onYouTubePlayerAPIReady = function() {
					log('onYouTubePlayerAPIReady');
					ytvideo = new YT.Player('player', {
						height: '100%',
						width: '100%',
						videoId: p.id,
						events: {
							'onReady': function(){log('player onReady fired');},
							'onStateChange': toob._stateChange
						}
					});
				};
			}

		} else if( p.id !== ytvideo.getVideoUrl().match(/[\?\&]v=([^&]+)/)[1] ){
			log('changing the video');
			ytvideo.loadVideoById(p.id);
		}
		else{
			return true;
		}

		// Prepend to the playlist
		store.playlist.push(p.id);

		// Store the view of the item
		if(! (store.played[p.id]++) ) {
			store.played[p.id] = 1;
		}
	
		// Store a list of video title references for general use.
		store.videos[p.id] = p.title;

		$(window).trigger('savetabs');
		return true;
	},
	//
	// State Change
	//
	_stateChange : function(state){

		log('newstate: '+(['ended','playing','paused','buffering','','video cued'][state] || 'uncertain/unstarted'));


		// ENDED
		if( state === 0 ){

			// if the new state has changed, and it is the current item playing
			var href = $('nav.results ul li.selected a').attr('href');

			// then play the next one
			if( ( href && (channel(href).id === channel().id) ) && $('button.continuous').is('.active') && $('nav.results li.selected').next().length ){
				nav.next();

				return;
			}
		}
		// BUFFERING?
		else if ( state === 3 ){

			var id;
			try{
				id = ytvideo.getVideoUrl().match(/[\?\&]v=([^&]+)/)[1];
			}catch(e){}

			if( (id !== channel().id) ){
				// The user has changed the video and it is no longer the same as our data.
				$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=?', function(json){
					$('nav.results ul li.selected').removeClass('selected');
					change({
						id : id,
						title : json.entry.title['$t']
					});
				});
			}
		}
		// CUED
		else if( state === 5 ){
			// start playing
			ytvideo.playVideo();
		}
		// PLAYING
		else if( state === 1 ){
			// trigger a change in player which should update the
		}

		// Trigger state change
		toob.triggerState();
	},
	//
	// Broadcast the current state of the player, and the next and previous elements to play
	//
	triggerState	: function(){
		message.send('toobifyState', {
			state	: ytvideo.getPlayerState(),
			title	: channel().title,
			play	: channel(channel()),
			img		: $('meta[name=image_src]').attr('content'),
			next	: $('nav.results ul li.selected').next().find('a').attr('href'),
			prev	: $('nav.results ul li.selected').prev().find('a').attr('href')
		});
	}
};
