//
// Player.js
// Listens for changes to the hashtag and changes the content of the ou player.
// 


function onYouTubePlayerReady(playerId) {
	if (!playerId) { return; }
	document.getElementById('fplayer').addEventListener('onStateChange', 'toob._stateChange');
}


$(function(){

	// Bind event listeners to the hashtag

	// Bind media listeners for media controls, play, pause, next, prev

	/**
	 * State change
	 */
	_stateChange : function(state){

		log('newstate: '+(['ended','playing','paused','buffering','','video cued'][state] || 'uncertain/unstarted'));
		var id = (toob.fplayer=document.getElementById('fplayer')).getVideoUrl().match(/\?v=([^&]+)/)[1];
		// if the new state has changed, and it is the current item playing
		var href = $('nav.left ul li.selected a').attr('href');
		if( state === 0 && ( href && (channel(href).id === channel().id) ) && $('nav.left li.selected').next().length ){
			// then play the next one
			toob.next();
			return;
		}
		else if ( state === 3 && (id !== channel().id) ){
			// The user has changed the video and it is no longer the same as our data.
			$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=?', function(json){
				$('nav.left ul li.selected').removeClass('selected');
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
	};

	//
	// Broadcast the current state of the player, and the next and previous elements to play
	//
	this.triggerState = function(){
		$(window).trigger('toobifyState', [{
			state	: toob.fplayer.getPlayerState(),
			title	: channel().title,
			play	: channel(channel()),
			next	: $('nav.results li.selected').next().find('a').attr('href'),
			prev	: $('nav.results li.selected').prev().find('a').attr('href')
		}]);
	};


});