(function(){
	var notification = new SharedWorker('./notify/worker.js');
	// Revision number, only send 
	var rev = 0;
	notification.port.addEventListener('message', function(event) {
		if ( event.data.rev !== rev ) {
			// The data has changed
			rev = event.data.rev;
			message.send(event.data.type,event.data);
		}
	}, false);

	// START THE CONNECTION TO SHAREDWORKER
	// REQUIRED WHEN USING "addEventListener()"
	notification.port.start();
	
	// Listen to "player state" Events
	message.listen('toobifyState', function(data){
		// Update the revision counter so we can ignore the response
		rev++;

		if(!data){
			data={};
		}
		data.type = 'toobifyRemote';

		// Post the response
		notification.port.postMessage(data);
	});


	// Listen to "player state" Events
	message.listen('hello', function(data){
		// Update the revision counter so we can ignore the response
		rev++;

		if(!data){
			data={};
		}

		data.type = 'hello';

		// Post the response
		notification.port.postMessage(data);
	});

})();