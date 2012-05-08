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
			$('article').addClass('active').siblings().removeClass('active')
		}
		else{
			$('.frame:first').addClass('active').siblings().removeClass('active');
		}
	},
	// REMOTE
	// Called from remote window, browser control
	'toobifyRemote' : function(e, data){
		console.log();
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
	}
});


var toob = {
	//
	// Player
	//
	player : function(){
	
		var p =  channel();
		
		console.log(p);

		if(!p||!p.id){
			$('article').html('<div id="player"></div>');
			return false;
		} 

		$('h1').html((document.title = p.title));
		
		$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+p.id+'?v=2&alt=json-in-script&callback=?', function(json){
			$('meta[name=image_src]').attr('content',json['entry']['media$group']['media$thumbnail'][0]['url']);
		});

		if(!document.getElementById('fplayer')){
			swfobject.embedSWF('http://www.youtube.com/v/'+ p.id +'?color1=0x000000&color2=0x000000&version=3&enablejsapi=1&playerapiid=ytplayer', "player", "100%", "100%", "9", null, 
			{}, { allowScriptAccess: "always", bgcolor: "#cccccc" }, { id: "fplayer" });
			toob.fplayer = document.getElementById('fplayer');

		} else if( p.id !== document.getElementById('fplayer').getVideoUrl().match(/[\?\&]v=([^&]+)/)[1] ){
			document.getElementById('fplayer').loadVideoById(p.id);
		}
		else{
			return true;
		}

		// Prepend to the playlist
		store.playlist.push(p.id);

		// Store the view of the item
		store.played[p.id]++ || (store.played[p.id]=1);
	
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
		var id = (toob.fplayer=document.getElementById('fplayer')).getVideoUrl().match(/\?v=([^&]+)/)[1];
		// if the new state has changed, and it is the current item playing
		var href = $('nav.results ul li.selected a').attr('href');
		if( state === 0 && ( href && (channel(href).id === channel().id) ) && $('nav.results li.selected').next().length ){
			// then play the next one
			toob.next();
			return;
		}
		else if ( state === 3 && (id !== channel().id) ){
			// The user has changed the video and it is no longer the same as our data.
			$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=?', function(json){
				$('nav.results ul li.selected').removeClass('selected');
				change({
					id : id,
					title : json.entry.title['$t']
				});
			});
		} else if( state === 5 ){
			toob.fplayer.playVideo();
		} else if( state === 1 ){
			// trigger a change in player which should update the 
		}

		// Trigger state change
		toob.triggerState();
	},
	//
	// Broadcast the current state of the player, and the next and previous elements to play
	//
	triggerState	: function(){
		$(window).trigger('toobifyState', [{
			state	: toob.fplayer.getPlayerState(),
			title	: channel().title,
			play	: channel(channel()),
			next	: $('nav.results ul li.selected').next().find('a').attr('href'),
			prev	: $('nav.results ul li.selected').prev().find('a').attr('href')
		}]);
	}
};
