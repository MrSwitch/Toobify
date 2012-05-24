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

		var s = $('<div></div>').share('Checkout my playlist "' + label + '"',link);
		$('<div style="max-width:450px;"><h2>Share your playlist, <q>'+label+'</q></h2><p><input type="text" value="' + link + '" /></p></div>').append(s).alert();
	});
})(jQuery);