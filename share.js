// ADD SHARE BADGES

(function($){

	$('header .tools .share').click(function(){

		var $btn = $(this).addClass('active');

		var s = $('<div></div>').share(document.title + (channel().id? ' ['+channel().id+']' : ''));

		$('<div style="max-width:450px;">Share: <q>'+document.title+'</q></div>').append(s).alert(function(){

			$btn.removeClass('active');

		});

	});


	// Add an event listener to share a URL with services
	$(window).bind('share', function(e,label,link){

		var $btn = $(this).addClass('active');

		link  = (window.location.href.replace(/[\#\?].*/,'') + link);

		var s = $('<div></div>').share('Checkout my playlist "' + label + '"',link);
		$('<div style="max-width:450px;"><h2>Share your playlist, <q>'+label+'</q></h2><p><input type="text" value="' + link + '" /></p></div>').append(s).alert(function(){

			$btn.removeClass('active');

		});
	});
})(jQuery);