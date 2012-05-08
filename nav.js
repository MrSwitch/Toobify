// Javascript file for embedding a youttube player in the site and adding controls.
// Author Andrew Dodson
//  action="javascript:$(this).trigger(\'submit\');void(0);"
var nav = {
	appname: 'Toobify:',
	tabs_length : 0,
	lastSearchCount : false,
	images : [], // list of all loaded images, this is used when the onload event fails to fire if an image already exists;
	// REMOTE
	state	: false,

	init : function(){

		// Play History
		if(!store.playlist || !("push" in store.playlist) )
			store.playlist = [];

		// QUERIES
		if(!store.queries || !("push" in store.queries) )
			store.queries = [];

		if(!store.videos || "push" in store.videos )
			store.videos = {};

		if(!store.played || "push" in store.played )
			store.played = {};

		if(!store.tabs || store.tabs.length === 0){
//		if(true){
			store.tabs = [
				{
					title : "@toobify",
					type : 0 // search
				}
			];
		}

		// Attach controls.
		$.live(nav.EVENTS);


		// TABS
		var $ol = $('nav.search ul');
		
		store.tabs.reverse();

		$(store.tabs).each(function(i,o){
			if(!o) return;
			var ul = nav.tab(o.title,$ol,null,o.info,true);
			if(!o.list){
				// Run the search and populate the tab
				$(ul).trigger('search');
			} else {
				var s= '';
				$(o.list).each(function(i,x){
					var p = channel(x);
					s += nav.item(p.id||x,p.title,true);
				});
				$(ul).append(s);
			}
		});



		// trigger click
		var id = $('nav.search ul li:not(.add):first')
						.trigger('click')
						.attr('data-id');
		// Button view
		$('nav > ul[data-id='+id+'] div button.view').trigger('click');
		
		// remove all 'active' state from the frames
		$('nav .active').removeClass('active');
		


	    // Has the user passed in a query?
	    if(channel().q){
	    	// Create a new tab with the search results
			var ul = nav.tab(channel().label || channel().q, $ol,null,null,true ), 
				q = channel().q || channel().label;

			nav.search(q.replace(/\|/g,' | '), ul);
			var id = $(ul).attr('data-id');
			$('nav.results > ul[data-id='+id+'] div button.view, nav.search li[data-id='+id+']').trigger('click');
	    }

		// Trigger resize
		$(window).trigger('hashchange').trigger('resize');
		
		
	},

	EVENTS : {
		/**
		 * Tab switcher
		 */
		'nav.search ul li:not(.add) click' : function(){
			$('nav.results ul[data-id='+ $(this).attr('data-id') +']')
				.add(this)
				.addClass('selected')
				.trigger('updatelist')
				.siblings('.selected')
				.removeClass('selected');

			$(this).parents('.frame').next('.frame').addClass('active').siblings().removeClass('active');
		},
		'header .logo click' : function(){
			change("/");
		},
		// Edit Tabs
		'nav.search ul li:not(.add) selectstart' : function(){
			return false;
		},
		'nav.search ul li:not(.add) dblclick' : function(){
			var t = prompt("What do you want to call this tab?", $(this).text().replace(/X$/,'') );
			
			if( !t || t.length==0 ) return;
			nav.tab( t, $(this).parent(), $(this).attr('data-id') );
			$(window).trigger('savetabs');
			return false;
		},

		'nav.search ul li span.remove click' : function(){
			var $li = $(this).parent('li'),
				i = $li.attr('data-id');

			if($li.siblings(":not(.add):first").trigger('click').length===0){
				nav.tab("NEW TAB",$li.parent());
			}
			
			$('nav > [data-id='+i+']').add($li).remove();

			$(window).trigger('savetabs');
		},
		// Save the current tabs
		'savetabs' : function(){
			var a=[];
			// loop through all the tabs and build up the tab list
			$('nav.search ul li').each(function(){
				var id = parseInt($(this).attr('data-id'));
				a.push({
					title	: $(this).attr('data-label'),
					list	: nav.getIds($('nav.results ul[data-id='+id+']')),
					info	: ($('nav ul[data-id=' + id + '] > i').html())
				});
			});
			store.tabs = a;
			store.save();
		},
		/**
		 * Searching
		 */
		'nav.search form submit' : function(e){

			e.preventDefault();

			var s = $('input', this).val();

			var $ul = nav.tab(s, $('nav.search ul').get(0));

			// for pagination
			if(s)store.queries.push(s);

			// search
			$($ul).trigger('search');

			// Add active class
			$(this).parents('.frame').next('.frame').addClass('active').siblings().removeClass('active')
			
			return false;
		},
		// because the scroll event cannot be attached via "live" we have a hack
		'nav.results ul mouseenter' : function(e){
			if(!$(this).attr("data-scroll")){
				$(this).scroll(nav.EVENTS['nav.results ul scroll']);
				$(this).attr("data-scroll",true);
			}
		},
		'nav.results ul search' : function(){

			if($(this).hasClass('loading')){
				// do not do anything else
				return;
			};

			// Add Loading
			var $ul = $(this).addClass('loading');

			// search
			nav.search($(this).attr('data-label'), $(this).find("li").length, function(r){

				$ul.removeClass('loading');
				
				var s='';

				$(r.data).each(function(i,o){
					s += nav.item(o.id,o.title,true);
				});

				$ul.append(s).trigger('updatelist');

				$(window).trigger('savetabs');
			});
	
		},
		'nav button.order click' : function(){
			var $ul= $('ul:visible', this);
				li = $ul.find('li').detach().sort(function(a,b){
					return $(a).text()>$(b).text();
				});
			$ul.append(li);
		},
		'nav.results ul scroll' : function(e){
			// Load images
			$(this).trigger('updatelist');

			// HIT THE BOTTOM
			if( e.target.scrollHeight <= (e.target.scrollTop + e.target.offsetHeight)+5){
				$(this).trigger('search');
			}
		},
		/**
		 * Double Click starts playing defines the item as selected
		 */
		'nav.results ul li a click'	: function(){
			// Remove any selected video
			nav.anchorplaying = this;

			$('nav.results ul li.selected').removeClass('selected');
			
			// Change HASH
			change($(this).attr('href'));
			
			return false;
		},
		'nav.results ul li a dblclick'	: function(){
			nav.anchorplaying = this;
			$(this).parent().addClass('selected');
		},
		'nav.results ul li span.remove click'	: function(e){
			e.stopPropagation();
			e.preventDefault();
			$(this).parent().remove();
			$(window).trigger('savetabs');
		},
		'nav.results ul li span.add click' : function(){
			var $li = $(this).parent(),
				p = channel($li.find('a').attr('href'));
			// Get the current playlist
			$ul = $('nav.search ul li.playlists').each(function(){
				$(this).append(nav.item(p.id,p.title,true));
			}).trigger('updatelist');

			// if the placeholder is present removeit
			$('.placeholder',$ul).remove();

			$(window).trigger('savetabs');
		},

		/**
		 * Drag and Drop
		 */
		'nav ul li a dragstart' : function(ev) {
			var dt = ev.originalEvent.dataTransfer;
			ev.originalEvent.dataTransfer.setData("text/plain", this.href);
			ev.effectAllowed = 'move'; // only allow moves
//			$('nav ul').addClass('active');
			return true;
		},
		'nav ul li a dragend' : function(ev) {
//			$('nav ul').removeClass('active');
//			$('nav ul.playlist.dragover, nav ul.playlist .dragover').removeClass('dragover');
			return false;
		},
        'nav ul dragenter' : function(ev) {
/*        
			if(target.tagName.match(/UL|DIV/)){
				$((target.tagName==='UL'?target:$('ul', target))).addClass('dragover');
			}
			else{
				$((target.tagName==='LI'?target:$(target).parents('li'))).addClass('dragover');
			}
			
*/
			return false;
		},
		'nav ul dragleave' : function(ev) {
/*			if(target.tagName.match(/UL|DIV/)){
				$((target.tagName==='UL'?target:$('ul', target))).removeClass('dragover');
			}
			else {
				$(target).removeClass('dragover').parents('li').removeClass('dragover');
			}
*/
			return false;
		},
		'nav ul dragover' : function(ev) {
/*
			if(target.tagName.match(/UL|DIV/)){
				$('ul', target).addClass('target');
			}
			else{
				$(target.tagName==='LI'?target:$(target).parents('li')).addClass('target');
			}
*/
			return false;
		},
		'nav ul drop' : function(e) {
			log(window.event);
			log(e);
			var ev = (e&&e.originalEvent?e.originalEvent:window.event);
			if(!ev)
				return;
			
			var	dt = ev.dataTransfer,
				target = ev.target || e,
				url = dt.getData('Text') || dt.getData('text/plain'),
				p = channel(url),
				s = nav.item(p.id, p.title, true);


			if(!p.title||(target&&target.href===url)){
				return false;
			}
			// if href already exists in the list then we must remove it!
			var $ul = (target.tagName === 'UL'?$(target):$(target).parents('ul')),
				$orig = $ul.find('a[href*="'+p.id+'"]').parents('li');

			if($orig.length){
				s = $orig;
				$orig.remove();
			};

			if(target.tagName.match(/UL|SPAN/)){
				$(s).appendTo(target.tagName==='UL'?target:$(target).parent('ul'));
			}
			else{
				$(s).insertBefore(target.tagName==='LI'?target:$(target).parents('li'));
			}
			
			// if the placeholder is present removeit
			$ul.find('.placeholder').remove();
			
			// Add image paths if we're in image mode.
			$ul.trigger('updatelist');
			
			// Store data structure
			$(window).trigger('savetabs');			
			return false;
		},
		/**
		 * Switch list views
		 */
		"nav div.control button.view click"	: function(){
			// change the view
			var action = ($(this).hasClass('active') ? 'remove' : 'add');
			$(this)[action+'Class']('active').parents('nav')[action+'Class']($(this).attr('data-toggle'));

			// loop through all the items in the list and load the images into the placehlders
			$(this).parents('nav').find('.selected').trigger('updatelist');
		},
		
		/**
		 * Share the playlist
		 */
		"nav div.control button.share click"	: function(){
			var a=[],
				$ul=$(this).parents("nav").find('ul.selected'),
				label=$ul.attr('data-label');

			$(nav.getIds($ul)).each(function(k,v){
				try{ a.push(v.match(/id=([^\&]+)/)[1]) }
				catch(e){}
			});

			$(window).trigger('share', [label, "#label="+label+"&q="+ a.join('|')] );
		},
		'nav ul updatelist'	: function(){
			// SHOWS IMAGES WHEN THEY ARE REQUIRED
			$(this)
				.each(function(){
					var h = $(this).height(),t;
					$('li',this).each(function(){
						t = $(this).position().top; 
						if(t>0&&t<(h+$(this).height())){
							$('img:not([src])',this).each(function(){
								this.src = $(this).attr('data-src');
								$(this).removeAttr('data-src');
								// Have we already loaded this image into the browser?
						    	if( $.inArray(this.src,nav.images) > -1 ){
							    	$(this).animate({opacity:1},'fast');
						    	} else {
						    		$(this).load( function(){$(this).animate({opacity:1},'fast');nav.images.push(this.src);} );
						    	}
							});
						}
					});
				});
		}
	},
	tab		: function(t, ol, id, info){

		var i = (parseInt(id) >= 0 ? parseInt(id) : this.tabs_length ),
			c = (t?t.toUpperCase().replace(/[^A-Z0-9\_]+/ig,''):null);
		
		this.tabs_length++;
		
		// Same name can't exist elsewhere must not be null
		if( !t || t.length==0 ) return;

		// Add tab
		$li = $('li[data-id='+id+']', ol);
		if($li.length===0){
			$li = $('<li></li>').prependTo(ol);
		};

		$ul = $('ul[data-id='+id+']', $(ol).parent() );
		if($ul.length===0){
			$ul = $('<ul ondragenter="cancelEvent()" ondragover="cancelEvent()" ondrop="nav.EVENTS[\'nav ul drop\'](this)"></ul>').appendTo($('nav.results'));
		};

		if($(ol).hasClass('searches')&&t==="NEW TAB"){
			$ul.append(
				'<div class="placeholder">\
					<label><input type="radio" name="type" value="" checked/>YouTube Videos</label><br/>\
					<label><input type="radio" name="type" value="PLAYED:"/>History</label><br/>\
				</div>');
				/*
					<label><input type="radio" name="type" value="WEB:"/>Web</label><br/>\
					<label><input type="radio" name="type" value="PLAYLIST:"/>Youtube Playlists</label><br/>\
				*/				
		} else if(!id||info){
			$ul.append('<span class="placeholder">'+(info?'<i>'+info+'<\/i>':($(ol).attr("data-placeholder")||''))+'</span>');
		}

		
		$ul.attr( "data-id", i ).attr( "data-label", t );
		$li.attr( "data-id", i ).attr( "data-label", t ).attr( "title", "Click to select, Double click to change label" ).html(t.replace(/ /g,'&nbsp;')+'<span class="remove">X</span>').trigger('click');
		
		return $ul;
	},
	search	: function(s,i,callback){
	
		var data = [];

		// Special searches
		if( s.match(/^PLAYED\s*\:/) ){
			// Search through the played list
			for(var i=0,x,s='',a=store.playlist.reverse();i<a.length;i++){
				if(x===a[i]) continue; // dont put two identical items next to one another
				x = a[i];
				
				data.push({
					id : x, 
					title : store.videos[x] 
				});
			}
			callback({data:data});

			return;
		} else if( s.match(/^PLAYLIST:/) ){
			// This is a search for playlists with the title
			// 
			s = s.replace(/^PLAYLIST:/,'');
		}
		// Does the search start with a @
		else if(s[0]==='@'){
			// We should update this... but instead we're going to ignore it.there are no more results
			if(i<100&&i>0) return;
			// This is a twitter search
			$.getJSON('http://api.twitter.com/1/statuses/user_timeline.json?screen_name='+s.replace(/@/,'')+'&count=100&include_rts=true&clientsource=CUSTOM&callback=?', function(json){

				$.each( json, function(i,o){
					if(!o.text) return;
					var m = o.text.match(/\|\s*(.*?)\s*\[(.*?)\]/i);
					if(!m) m = o.text.match(/(.*?)\s*\[(.*?)\]/i);
					if(!m) return;

					data.push({
						id : m[2],
						title : m[1]
					});
				});
				
				callback({data:data});

			});
			return false;
		}

		var p = channel();

		if(s){
			s = 'videos?v=2&format=1&q='+ encodeURIComponent(s).replace(/\%20/g, '+');
		}else if((p.id)){
			s = 'videos/'+p.id+'/related?v=2';
		} else {
			s = "standardfeeds/top_rated?v=2";
		}

		$.getJSON( 'http://gdata.youtube.com/feeds/api/' + s + '&alt=json-in-script&max-results=50&start-index='+(i||1)+'&callback=?', function(json){

			$.each( json.feed.entry, function(i,o){
				//if(typeof( json.feed.entry[x]['app$control'] ) === 'object') continue; // this video is restricted... its better not to show them i feel.
				data.push({
					title : o.title['$t'],
					id :  o.id['$t'].match(/video:([^:]+)/)[1],
					image_src : ''
				});

			});
			callback({data:data});
		});
	},
	/**
	 * List navigation
	 */
	next	: function(force){
		nav.move('next',force);
	},
	prev	: function(force){
		nav.move('prev',force);
	},
	move	: function (move,force){
		var href = $('nav.results ul li.selected')
						.removeClass('selected')
						[move]()
						.find('a')
						.trigger('dblclick')
						.attr('href');

		if(!href&&nav.anchorplaying){
			href = $(nav.anchorplaying)
					.parent()
					[move]()
					.find('a')
					.trigger('click')
					.attr('href');
		}
		if(!href) return false;
		var hash = href.match(/#.*/);
		
		if(hash){
			change(hash[0]);
		}
		else
			log("Whoops, the "+move+" item doesn't have a valid value");
	},

	item : function(id,title,editable,i){

		if(i>=0){
			if(!('list' in store.tabs[i]))
				store.tabs[i].list = [];

			store.tabs[i].list.push(id);
		}

		store.videos[id] = title = (title || store.videos[id]);

		var link = channel({id:id,title:title});
		
		// Create a list item with an anchor including an image tag which is initally empty.
		// When the user switches between views then we size the image. And insert its value where we can
		return '<li>'+(editable?'<span class="remove" title="Remove">X</span>':'')+'<span class="add" title="Add to current playlist">&#43;</span><a href="'+link+'" draggable=true ondragend="nav.EVENTS[\'nav ul li a dragend\']();" title="Click to play, Double Click to playall from here"><img data-src="http://i.ytimg.com/vi/'+id+'/default.jpg"/>'+ title +'</a></li>';
		// !!! IE wont let us dynamically attach any drag events to an element
	},
	
	// takes the html from a list and turns it into an array
	getIds : function(s){
		var a=[];
		$(s).find('li a').each(function(){
		   a.push($(this).attr('href'));
		});
		return a;
	}
};

function cancelEvent() {
	if (window.event)
		window.event.returnValue = false;
}

nav.init();