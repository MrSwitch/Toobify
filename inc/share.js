// ADD SHARE BADGES

(function($){
	function share(title, link){
		/*
		<button data-href="http://www.google.com/buzz/post?url={$url}&message={$message}&imageurl={$image}" data-dimension="700x450">\
				<img src="http://code.google.com/apis/buzz/images/google-buzz-16x16.png"> Buzz\
			</button>
			*/
		return $('<button data-href="http://profile.live.com/badge?url={$url}&title={$message}&screenshot={$image}" data-dimension="900x500">\
				<img src="http://img.wlxrs.com/$Live.SN.MessengerBadge/icon16wh.png" /> Messenger\
			</button><button data-href="http://twitter.com/share?url={$url}&text={$message}+%5B{$id}%5D" data-dimension="550x300">\
				<img src="http://twitter.com/favicon.ico" /> Twitter\
			</button><button data-href="http://www.facebook.com/sharer.php?u={$url}&t={$message}" data-dimension="550x300">\
				<img src="http://facebook.com/favicon.ico" /> Facebook\
			</button><button data-href="http://buzz.yahoo.com/vote/?language={$lang}&votetype=1&loc={$url}&guid={$url}&assettype=video&from=pub&headline={$message}&summary={$message}" data-dimension="850x700">\
				<img src="http://buzz.yahoo.com/favicon.ico"> Yahoo\
			</button>')
		.each(function(){
			this.title = "Share with " + $(this).text().replace(/\s*/g,'');
	
			// If the screen width can't accompdate all this, just display images
			if(screen&&screen.width<2000)
				// Remove the text
				$(this).html($('img',this)); 
		})
		.click(function(){
			var a = {
				url 	: ( link || (document.URL || window.location.href).replace(/[\(\)]/g,'')),
				message	: ( title || document.title.replace(/\#.*/,'') ), // CAPTURE #, for some reason this ia a bug in IE
				image	: $('meta[name=image_src]').attr('content'),
				lang	: (window.navigator.browserLanguage||window.navigator.language),
				id		: channel().id || ''
			};
			var w=800,h=500,m;
			if( $(this).attr('data-dimension') && ( m = $(this).attr('data-dimension').match(/[0-9]+/ig) ) ){
				w = m[0];
				h = m[1];
			}
			var l = (screen.width/2)-(w/2), t = (screen.height/2)-(h/2);
			window.open( $(this).attr('data-href').replace(/\{\$(.*?)\}/ig, function(m,p1){
				return (p1 in a)?encodeURIComponent(a[p1]):'';
			}), 'buzz', 'width='+w+'px,height='+h+'px,left='+l+'px,top='+t+'px,resizeable,scrollbars');
		});
	}
	var $easyshare = share();
	$easyshare.appendTo('header div.share');

	$(window).bind('hashchange popstate', (function getCount(){
		var url = (document.URL || window.location.href).replace(/[\(\)]/g,''), 
			// Populates the button span.count element
			addCount = function(srv,i){ 
				i = i||'';
				var $but = $('header div.share button[data-href*='+srv+']');
				if(!$but.find('.count').length)
					$but.append('<span class="count">'+i+'</span>');
				else 
					$but.find('.count').html(i);
			};
	
		// We can get the number of Buzz's from Google
		$.getJSON('http://www.google.com/buzz/api/buzzThis/buzzCounter?url='+encodeURIComponent(url)+'&callback=?', function(o){
			addCount('google', o[url]);
		});
		
		// And the number of FaceBooks
		$.getJSON('http://api.ak.facebook.com/restserver.php?v=1.0&method=links.getStats&urls=%5B%22'+ encodeURIComponent(url) +'%22%5D&format=json&callback=?', function(json){
			addCount('facebook', json[0].total_count);
		});
		
		// And the number of tweets
		// HAD Trouble with the twitter caching locally and failing to return the number of tweets.
		$.getJSON('http://urls.api.twitter.com/1/urls/count.json?url='+encodeURIComponent(url)+'&noncache='+Math.random()+'&callback=?', function(json){
			addCount('twitter', json.count);
		});
		return getCount;
	})());

	// Add an event listener to share a URL with services
	$(window).bind('share', function(e,label,link){
		// Creates a popup with the message we're sharing
		// In the popup the user may select a service to post the message too.
		// FACEBOOK: Share wall, 
		// (Optionally) Connect to facebook and share with an indvidual.
		// Messenger: Activity post
		// (Optionally) Connect to Messenger and select a user to share with, either IM or Email
		// (Optionally) Add to the Application Messages
		// FriendConnect: launch the messenger connect invite.
		link  = (window.location.href.replace(/[\#\?].*/,'') + link);
		var s = $('<div><span style="font-size:1.3em">Share with everyone on:</span> </div>').append(share('Checkout my playlist "' + label + '"',link));
		$.modal('Share your playlist: <a href="' + link + '" target=_blank>'+label+'</a>', s);
	});
})(jQuery);