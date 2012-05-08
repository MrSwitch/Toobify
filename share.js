// ADD SHARE BADGES

(function($){

	(function share(){
		// Add/Update Share buttons
		var $share = $('header .tools').share( document.title + (channel().id? ' ['+channel().id+']' : '') ).find('span.label').text('').end();

		// Listen for changes to the environment and update the stats accordingly
		$(window).bind('hashchange popstate', share);
	})();

	// Add an event listener to share a URL with services
	$(window).bind('share', function(e,label,link){
		link  = (window.location.href.replace(/[\#\?].*/,'') + link);

		var s = $('<div><span style="font-size:1.3em">Via: </span> </div>').share('Checkout my playlist "' + label + '"',link);
		$.modal('Share your playlist: <a href="' + link + '" target=_blank>'+label+'</a>', s);
	});
})(jQuery);