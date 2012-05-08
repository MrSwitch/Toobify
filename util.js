// the channel described the method that widgets can use to communicate.
// In this example we are using the #hash change event to pass information to the player



/**
 * Hashchange alternative
 */
(function(){
	if( typeof window.onhashchange === 'undefined' || ($.browser.msie&&$.browser.version==='7.0') ){
		var hash = window.location.hash;
		setInterval(function(){
			if(window.location.hash!==hash){
				$(window).trigger('hashchange');
				hash = window.location.hash;
			}
		}, 500);	
	}
})();

// 
function channel(p){
	var a,m,i,x,b;
	if(typeof p !== 'object'){
		if(!p || p.length === 0){
			p = location.hash;
		}
		if(!p || p.length === 0){
			p = location.search;
			// Safari bug the location is wrong when using pushState
			if(document.URL&&p!==document.URL.replace(/^[^?]*/,'')){
				p = document.URL.replace(/^[^?]*/,'');
			}
		}
		a={};
		m = p.replace(/.*[#\?]/,'').match(/([^=\/\&]+)=([^\/\&]+)/g);
		if(m){
			for(i=0;i<m.length;i++){
				b = m[i].split('=');
				a[b[0]] = decodeURIComponent( b[1] );
			}
		}
		return a;
	} else {
		// create a string of parameters
		a =[];
		for(x in p){if(p.hasOwnProperty(x)){
			a.push(x + '=' + encodeURIComponent(p[x]).replace(/%20/g,' '));
		}}
		return "#"+ a.join('&');
	}
}

/**
 * Change the channel
 */
function change(hash){
	if(typeof hash=== 'object'){
		hash = channel(hash);
	}
	
	if(!!history.pushState){
		// Goodbye hashchange, you weren't interoperable with my server but you did create a nice UX.
		// Is this a change in location?
		if(channel(hash).id!==channel().id){
			var s = window.location.search;
			var href = hash.replace('#','?').replace('/title','&title');
			history.pushState( {}, channel(hash).title, href );
			// Safari doesn't update our search string
			$(window).trigger('popstate');
			
		}
		return false;
	}

	window.location.hash = hash;
}

/**
 * If this page has been opened with a querystring and the browser can't rewrite it
 */
if( window.location.search && !history.pushState ){
	// Change to the hash window
	window.location = window.location.pathname+channel(channel());
}

/***************************************************************
 * Logging
 ***************************************************************/

function log() {
	if (typeof(console) === 'undefined'||typeof(console.log) === 'undefined'){
		 return;
	}
	else if (typeof console.log === 'function') {
		console.log.apply(console, arguments); // FF, CHROME, Webkit
	}
	else{
		console.log(Array.prototype.slice.call(arguments)); // IE
	}
}

/*************************************************
 * MODAL
 *************************************************/
(function($){

	// Open up a modal window
	$.modal = function(title,content){
		// Do the modal items exist?
		if($('div.modal-bg').length !== 0){
			$('.modal-close').trigger('click');
		}

		var $m = $('<iframe class="modal-bg"></iframe>'+
				'<div class="modal-bg"></div>'+
				'<div class="modal"><button class="modal-close">&#10005;</button><h2>'+title+'</h2><div></div></div>')
				.hide()
				.appendTo('body')
				.fadeIn()
				.bind('close', function(){
					$m.fadeOut('fast', function(){
							$(this).remove();
						});
				})
				.filter(".modal-bg")
				.add(".modal-close")
					.click(function(){
						$m.trigger('close');
					})
				.end().end()
				.find('div')
					.html(content)
				.end();
	

		
		/**
		$m.filter('.modal').hide().fadeIn('fast').animate({
			width : "90%",
			left : "5%",
			height : "90%",
			top : "5%"
		},'fast');
		*/
	};
})(jQuery);


/**
 * Add many live events at once
 * @param object { "selector event" => function, ...} 
 * @return
 */

jQuery.live = function(o){
	// Bind all events listeners to this Widget
	// Attach controls.
	var x,m;
	for( x in o ){
		m = x.match(/(.* )?([a-z\,]+)$/i);
		if(m[2]==='scroll'&&!m[1]){
			$(m[1]||window).scroll(o[x]);
		}
		else 
			$(m[1]||window)[m[1]?'live':'bind'](m[2].replace(',',' '), o[x]);
	}

};


// Store client side data helper.
var store = {};
if(localStorage&&localStorage.json&&typeof(JSON) !== 'undefined'){
	store = JSON.parse( localStorage.json );
}

store.save = function(n,o){
	if(n){
		store[n] = o;
	}
	if( typeof(JSON) !== 'undefined' ){
		localStorage.json = JSON.stringify( store );
	}
};


/*************************************************
 * Does this browser support Toobify?
 *************************************************/

if(typeof(JSON)==='undefined'){
	$.modal("Update your browser", "Whooops toobify demands a better browser, you may close this message and try anyway.");
}