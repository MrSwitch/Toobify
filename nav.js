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

	// Search list
	$ol : $('nav.search ul'),

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

		if(!store.favourites || !("push" in store.favourites) )
			store.favourites = [];

		if(!store.tabs || store.tabs.length === 0){
//		if(true){
			store.tabs = [
				{
					title : "@toobify",
					time : (new Date()).getTime(),
					type : 0 // search
				}
			];
		}

		// Attach controls.
		$.live(nav.EVENTS);


		
		store.tabs.reverse();

		$(store.tabs).each(function(i,o){
			if(!o) return;
			var ul = nav.tab(o);
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

		// Put it back
		store.tabs.reverse();


		// trigger click
		var id = $('nav.search ul li:not(.add):first')
						.trigger('click')
						.attr('data-id');
		// Button view
		$('nav > ul[data-id='+id+'] div button.view').trigger('click');
		
		// remove all 'active' state from the frames
		$('nav.search').showFrame();


		// Has the user passed in a query?
		if(channel().q){
			// Create a new tab with the search results
			var ul = nav.tab({title:channel().label || channel().q} ),
				q = channel().q || channel().label;

			nav.search(q.replace(/\|/g,' | '), ul);
			id = $(ul).attr('data-id');
			$('nav.results > ul[data-id='+id+'] div button.view, nav.search li[data-id='+id+']').trigger('click');
		}

		// Trigger resize
		$(window).trigger('hashchange').trigger('resize');
		
		
	},

	EVENTS : {
		//
		// Tab switcher
		//
		'nav.search ul li:not(.add) click' : function(){
			$('nav.results ul[data-id='+ $(this).attr('data-id') +']')
				.add(this)
				.addClass('selected')
				.trigger('updatelist')
				.siblings('.selected')
				.removeClass('selected');

			$("nav.results").showFrame();
		},
		'header .logo click' : function(){
			change("/");
		},
		// Edit Tabs
		'nav.search ul li:not(.add) selectstart' : function(e){
			e.preventDefault();
			return false;
		},
		'nav.search ul li:not(.add) dblclick' : function(e){
			e.preventDefault();

			var li = this;

			$("<p>What do you want to call this bucket?</p>").prompt( $(this).text(), function(e){
				if( !e.response || e.response.length===0 ){ return; }
				$(li).text(e.response);
				$(window).trigger('savetabs');
			});
			
			return false;
		},

		'nav.search ul li span.remove click' : function(){
			var $li = $(this).parent('li'),
				i = $li.attr('data-id');
			
			$('nav > [data-id='+i+']').add($li).remove();

			$(window).trigger('savetabs');
		},

		// Save the current tabs
		'savetabs' : function(){
			var a=[];
			// loop through all the tabs and build up the tab list
			$('nav.search ul li').each(function(){
				var id = parseInt($(this).attr('data-id'),10);
				a.push({
					title	: $(this).attr('data-label'),
					list	: nav.getIds($('nav.results ul[data-id='+id+']')),
					info	: ($('nav ul[data-id=' + id + '] > i').html()),
					time	: $(this).attr('data-time')
				});
			});
			store.tabs = a;
			store.save();
		},
		//
		// Searching
		//
		'nav.search form submit' : function(e){

			e.preventDefault();

			var s = $('input', this).val();

			// remove the text
			$('input', this).val('');

			var $ul = nav.tab({title:s});

			// for pagination
			if(s)store.queries.push(s);

			// search
			$($ul).trigger('search');

			// Add active class
			$("nav.results").showFrame();
			
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
			}

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
		'nav select.options change' : function(){
			if(this.value===""){
				return;
			}
			var sort = {
					'a-z' : function(a,b){
						a = $(a).text().toLowerCase();
						b = $(b).text().toLowerCase();
						return a<b?-1:(a>b?1:0);
					},
					'z-a' : function(a,b){
						a = $(a).text().toLowerCase();
						b = $(b).text().toLowerCase();
						return a<b?1:(a>b?-1:0);
					},
					'latest' : function(a,b){
						a = parseInt($(a).attr('data-time'),10);
						b = parseInt($(b).attr('data-time'),10);
						return a<b?1:(a>b?-1:0);
					},
					'oldest' : function(a,b){
						a = parseInt($(a).attr('data-time'),10);
						b = parseInt($(b).attr('data-time'),10);
						return a<b?-1:(a>b?1:0);
					}
				},
				v = this.value;

			if(v in sort){
				var $ul= $('ul:visible', this.parentNode),
					li = $ul.find('li').detach().sort(sort[v]);

				$ul.append(li);
			}
			else{
				var ul = nav.tab({title:this.value});
				// Run the search and populate the tab
				$(ul).trigger('search');
			}
		},
		'nav.results ul scroll' : function(e){
			// Load images
			$(this).trigger('updatelist');

			// HIT THE BOTTOM
			if( e.target.scrollHeight <= (e.target.scrollTop + e.target.offsetHeight)+5){
				$(this).trigger('search');
			}
		},
		//
		// Double Click starts playing defines the item as selected
		//
		'nav.results ul li a click'	: function(){
			// Remove any selected video
			nav.anchorplaying = this;

			// Remove any other item which is marked as selected
			$('nav.results ul li.selected').removeClass('selected');

			// Mark this as selected
			$(this).parent('li').addClass('selected');

			// Change HASH
			change($(this).attr('href'));
			
			return false;
		},
		'nav.results ul li a dblclick'	: function(){
			nav.anchorplaying = this;
			$('button.continuous').toggleClass('active');
		},
		'nav.results ul li span.remove click'	: function(e){
			e.stopPropagation();
			e.preventDefault();
			$(this).parent().remove();
			$(window).trigger('savetabs');
		},
		'nav.results ul li span.favourite click' : function(e){
			e.stopPropagation();
			e.preventDefault();
			var p = channel( $(this).siblings('a').attr('href') );

			if( $(this).parent('li').toggleClass('favourite').is('.favourite') ){
				store.favourites.push(p.id);
			}
			else{
				var i = store.favourites.indexOf(p.id);
				if(i>-1){
					store.favourites.splice(i,1);
				}
			}
			store.save();
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

		//
		// Drag and Drop
		//
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
			}

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
		//
		// Switch list views
		//
		"nav div.control button.view click"	: function(){
			// change the view
			var action = ($(this).hasClass('active') ? 'remove' : 'add');
			$(this)[action+'Class']('active').parents('nav')[action+'Class']($(this).attr('data-toggle'));

			// loop through all the items in the list and load the images into the placehlders
			$(this).parents('nav').find('.selected').trigger('updatelist');
		},

		//
		// Auto play items in the list
		//
		"nav div.control button.continuous click"	: function(){
			// change the view
			$(this).toggleClass('active');
		},

		//
		// Random Play
		//
		"nav div.control button.random click"	: function(){
			// change the view
			$(this).toggleClass('active');
		},


		"nav div.control button.next click"	: function(){
			// change the view
			nav.next();
		},
		"nav div.control button.prev click"	: function(){
			// change the view
			nav.prev();
		},
		
		//
		// Share the playlist
		//
		"nav div.control button.share click"	: function(){
			var a=[],
				$ul=$(this).parents("nav").find('ul.selected'),
				label=$ul.attr('data-label');

			$(nav.getIds($ul)).each(function(k,v){
				try{ a.push(v.match(/id=([^\&]+)/)[1]); }
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
	tab:	function(opt,i){

		var t = opt.title,
			id = opt.id,
			time = opt.time || (new Date()).getTime(),
			c = (t?t.toUpperCase().replace(/[^A-Z0-9\_]+/ig,''):null);

		this.tabs_length++;
		
		// Tab Id
		i = i || (parseInt(id,10) >= 0 ? parseInt(id,10) : this.tabs_length );
		
		// Same name can't exist elsewhere must not be null
		if( !t || t.length===0 ){
			return;
		}

		var ol = this.$ol;

		// Add tab
		$li = $('li[data-id='+i+']', ol);
		if($li.length===0){
			$li = $('<li onclick="void(0)"></li>').prependTo(ol);
			$('<option></option>').text(t).val(t).prependTo('#autocomplete');
		}

		$ul = this.results(opt,i);

		$li.attr( "data-id", i ).attr( "data-label", t ).attr( "data-time", time ).attr( "title", "Click to select" ).html(t.replace(/ /g,'&nbsp;')+'<span class="remove" onclick="void(0)"></span>').trigger('click');
		
		return $ul;
	},
	results: function(opt, i){

		//opt
		opt = opt || {};

		// Vars
		i = (i || this.tabs_length++);

		var $ul = $('ul[data-id='+i+']', $(this.$ol).parent() );
		if($ul.length===0){
			$ul = $('<ul ondragenter="cancelEvent()" ondragover="cancelEvent()" ondrop="nav.EVENTS[\'nav ul drop\'](this)"></ul>').appendTo($('nav.results'));
		}
		$ul.attr( "data-id", i ).attr( "data-label", opt.title );

		return $ul;
	},
	search:	function(s,i,callback){
	
		var data = [];

		// Special searches
		if( s.match(/^(PLAYED|STARS)\s*\:/i) ){
			var a = [];

			if(s.match(/^PLAYED/i)){
				a = store.playlist;
			}
			else if(s.match(/^STARS/i)){
				a = store.favourites;
			}

			// Search through the played list
			$(a).each(function(i,x){
				data.push({
					id : x,
					title : store.videos[x]
				});
			});

			data.reverse();

			callback({data:data});
			return;
		}
		// Does the search start with a @
		else if(s[0]==='@'){
			// We should update this... but instead we're going to ignore it.there are no more results
			if(i<100&&i>0) return;
			// This is a twitter search
			$.getJSON('https://proxy-server.herokuapp.com/https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name='+s.replace(/@/,'')+'&count=100&include_rts=true&clientsource=CUSTOM&callback=?', function(json){

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

		$.getJSON( 'https://gdata.youtube.com/feeds/api/' + s + '&alt=json-in-script&max-results=50&start-index='+(i||1)+'&callback=?', function(json){

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
	//
	// List navigation
	//
	next	: function(force){
		nav.move('next',force);
	},
	prev	: function(force){
		nav.move('prev',force);
	},
	move	: function (move,force){

		var $cur = $('nav.results ul li.selected');

		if($cur.length===0){
			$cur = $(nav.anchorplaying);
		}
		if($cur.length===0){
			return;
		}
		// Remove selected
		$cur.removeClass('selected');

		// Change $cur
		if( $('button.random').is('.active') ){

			// Does the current increment value exist?
			if( !this.playlist ){
				this.playlist = [];
				this.playlistposition = 0;
			}
			// Play position
			this.playlistposition += ( move ==='next' ? 1 : -1);

			// If we are moving outof playlist bounds
			if(this.playlistposition<=0 || this.playlistposition>this.playlist.length){

				// Get a random item in the playlist
				var $sib = $cur.siblings();
				$cur = $sib.eq(parseInt(($sib.length-1)*Math.random(),10));

				// Is this moving prev?
				if(this.playlistposition<=0){
					this.playlist.unshift($cur);
					this.playlistposition = 0;
				}
				else{
					this.playlist.push($cur);
					//this.playlistposition = this.playlist.length;
				}
			}else{
				// This could potentially play something which isn't in the list.
				// But oh well.
				$cur = this.playlist[this.playlistposition-1];
			}
		}
		else{
			$cur = $cur[move]();
		}

		// Get the new Cur
		var href = $cur.find('a')
						.trigger('click')
						.attr('href');


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

		var link = channel({id:id,title:title}),
			fav = store.favourites.indexOf(id) > -1;
		
		// Create a list item with an anchor including an image tag which is initally empty.
		// When the user switches between views then we size the image. And insert its value where we can
		return '<li '+ (fav?'class="favourite"':'') +'>'+(editable?'<span class="favourite" title="Favourite" onclick="void(0)"></span><span class="remove" title="Remove" onclick="void(0)"></span>':'')+'<a href="'+link+'" draggable=true ondragend="nav.EVENTS[\'nav ul li a dragend\']();" title="Click to play, Double Click to playall from here"><img data-src="https://i.ytimg.com/vi/'+id+'/default.jpg"/>'+ title +'</a></li>';
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