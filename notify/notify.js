//
// Browser navigation tools
//
// @triggers: toobifyRemote
// @listens: toobifyState
//

// Only IE 9 on Windows 7 supports this so far.
// Its in Beta... but we like innovation
if (("external" in window)&&
	("msIsSiteMode" in window.external)){
	
	// Add site button
	if(!window.external.msIsSiteMode()){
		$('<button title="This adds thumbnail controls to IE9" class="msPinSite">Pin Start</button>')
			.appendTo('header div.tools')
			.find('button')
			.click(function(){
				window.external.msAddSiteMode();
			});
			$(document).bind('mssitemodeinstalled', function() {
				if(confirm("Site pinned successfully to the windows start menu.\nClose this tab?")){
					window.close();
				}
			});
	} else {
		// The button pins the application to the start menu/taskbar as soon as it receives the state of the player
		// These must be .ICO files (yawn!)
		
		var started = false,
			a = [
				window.external.msSiteModeAddThumbBarButton('images/toob_prev.ico', "Prev"),
				window.external.msSiteModeAddThumbBarButton('images/toob_play.ico', "Play/Pause"),
				window.external.msSiteModeAddThumbBarButton('images/toob_next.ico', "Next")
			],
			btnStyles = [];

		$(window).bind('toobifyState', function(e,data){
			log("Toobify state change heard at notify.js",a);

			if(!started){

				// Show thumbnail bar
				window.external.msSiteModeShowThumbBar();
				
				// we can only set styles on buttons which are visible... so we have to add extra logic drag!
				btnStyles = [
					window.external.msSiteModeAddButtonStyle(a[1], 'images/toob_play.ico', 'Play'),
					window.external.msSiteModeAddButtonStyle(a[1], 'images/toob_pause.ico', 'Pause')
				];
				started = true;
				log("Started, set button styles");
			}

			// Hide play/pause button
			window.external.msSiteModeShowButtonStyle(a[1],btnStyles[data.state===1?1:0]);
			
			// Add an overlay to the taskbar, only for play OR paused state
			if(data.state===1||data.state===2)
				window.external.msSiteModeSetIconOverlay('images/toob_'+(data.state===1?'play':'pause')+'.ico', (data.state===1?'Playing':'Paused'));
			else
				window.external.msSiteModeClearIconOverlay();

			// Add event listeners to the button click, replacing all others defined by this.
			$(document).unbind('msthumbnailclick').bind('msthumbnailclick', function(e){
				// Select button control
				var p = [
					{prev:true},
					{state: (data.state===1?2:1)},
					{next:true}
				][a.indexOf(e.originalEvent.buttonID)];

				log("Triggered button",e.originalEvent.buttonID, a, a.indexOf(e.originalEvent.buttonID));

				// send
				$(window).trigger('toobifyRemote', [p]);
			});
		});
		
		// Add the played items to the jump list
		// Do we put in related video's or if the user it
		window.external.msSiteModeCreateJumplist('Recent Videos');
		$(window).bind('hashchange', function(){
			try{
				var title = channel().title;
				if(title){
					log("Adding "+title+" jumplist");
					window.external.msSiteModeAddJumpListItem(title, window.location.hash, 'images/toob_play.ico', 'self');
					window.external.msSiteModeShowJumpList();
				}
			}catch(e){}
		});

	}
}

else if("webkitNotifications" in window){

	// WEBKIT
	(function(){

		var n;

		// Browser supports it :)
		var $btn = $('<button data-icon="&#x21f2;"></button>')
			.appendTo('header div.tools')
			.click(function(){

				var self = this;

				if(!$(this).toggleClass('active').is('.active')){
					try{
						n.cancel();
					}catch(e){}
					return;
				}



				var close = function(){
						$(self).removeClass('active');
					},
					notify = function(){
						n = window
							.webkitNotifications
							.createHTMLNotification('./notify.htm');

						// Attach event to onclose
						n.onclose = n.onerror = close;

						// Show
						n.show();
					};

				if(window.webkitNotifications.checkPermission() !== 0){
					window.webkitNotifications.requestPermission(function(){
						if(window.webkitNotifications.checkPermission() !== 0){
							close();
							return;
						}
						notify();
					});
				}
				else{
					notify();
				}
			});

		// Add script which passes the messages back and forth
		$.getScript('./notify/rend.js', function(){
			// Have we already got a messenger open?
			message.listen('hello', function(data){
				if(data.reply==='remote'){
					$btn.addClass('active');
				}
			});
			message.send('hello', {question:'whoareyou'});
		});


	})();
}

