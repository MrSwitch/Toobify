var i = 0;
var data = {};
onconnect = function (event) {
	var port = event.ports[0];
	var thread = i;

	port.onmessage = function (event) {
		// REPLY TO RENDERER, updating the revision
		event.data.rev = ++i;
		data = event.data;
		port.postMessage(data);
	};
	port.start();
	setInterval(function(){
		// is this thread up to date
		if(thread<i)
			port.postMessage(data);
		thread=i;
	},200);
};