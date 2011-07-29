(function(){
	var notification = new SharedWorker('./notify/worker.js');
	var rev = 0;
	notification.port.addEventListener('message', function(event) {
		if ( event.data.rev !== rev ) {
			// The data has changed
			$(window).trigger('toobifyRemote',[event.data]);
			rev = event.data.rev;
		}
	}, false);
	 
	// START THE CONNECTION TO SHAREDWORKER
	// REQUIRED WHEN USING "addEventListener()"
	notification.port.start();
	
	// Listen to "player state" Events
	$(window).bind('toobifyState', function(e,data){
		// Update the revision counter so we can ignore the response
		rev++;
		// Post the response
		notification.port.postMessage(data);
	});
})();