// Javascript file for embedding a youttube player in the site and adding controls.
// Author Andrew Dodson
//  action="javascript:$(this).trigger(\'submit\');void(0);"
var toob = {
	appname: 'Toobify:',
	mousedown : false,
	tabs_length : 0,
	lastSearchCount : false,
	images : [], // list of all loaded images, this is used when the onload event fails to fire if an image already exists;
	// REMOTE
	state	: false,

	init : function(){
		$('body').addClass('toobwidget');
		$('nav.left').html('\
			<ol class="searches"><li class="add" title="Start a new search tab">+</li><\/ol>\
			<button class="rh resize"></button>\
			<ol class="playlists" data-placeholder="Drag items here to start list"><li class="add" title="Create a new Playlist">+</li><\/ol>\
			<button class="rv resize"></button>');

		$('nav.right').append('<ol><\/ol><button class="lv resize"><\/button>');
		

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

		if(!store.tabs){
//		if(true){
			store.tabs = [
				{
					title : "PLAYLIST",
					list : (store.playlists ? toob.getIds(store.playlists.PLAYLIST) : null),
					type : 1 // playlist
				},{
					title : "SEARCH YOUTUBE",
					type : 0 // search
				},{
					title : "@toobify",
					type : 0 // search
				}
			];

			// PLAYLISTS
			if(!store.playlists){
				// Add the default playlist
			} else {
				if(!store.playlisttitles){
					store.playlisttitles = {};
				}
	
				for( var x in store.playlists ){ if(store.playlists.hasOwnProperty(x)){
	
					if( $(store.tabs).filter(function(i,o){
						
						return o.title === x && o.type === 1;
					}).length === 0 ){
						store.tabs.push({
							title	: store.playlisttitles[x]||'PLAYLIST',
							list	: toob.getIds(store.playlists[x]),
							type	: 1	// playlist
						});
					}
				}}
			}
			$(store.searches).each(function(i,s){
				if( $(store.tabs).filter(function(i,o){
					return o.title === s;
				}).length === 0 ){
					store.tabs.push({
						title	: s,
						type	: 0
					});
				}
			});
			store.save();
		}
		
		// TABS
		var $ol = [
			$('nav.left ol.searches'),
			$('nav.left ol.playlists')
		];

		$(store.tabs).each(function(i,o){
			if(!o) return;
			var ul = toob.tab(o.title, $ol[o.type],null,o.info,true);
			if(!o.list){
				// Run the search and populate the tab
				toob.search(o.title, ul);
			} else {
				var s= '';
				$(o.list).each(function(i,x){
					var p = channel(x);
					s += toob.item(p.id||x,p.title,true);
				});
				$(ul).append(s);
			}
		});

		for(var i in $ol)
			if($ol[i].find('li:not(.add)').length===0)
				toob.tab("NEW TAB",$ol[i]);

		// Attach controls.
		var x,m;
		for( x in toob.EVENTS ){
			m = x.match(/(.* )?([a-z\,]+)$/i);
			if(m[2]==='scroll'&&!m[1]){
				$(m[1]||window).scroll(toob.EVENTS[x]);
			}
			else 
				$(m[1]||window)[m[1]?'live':'bind'](m[2].replace(',',' '), toob.EVENTS[x]);
		}

		// trigger click
		$('nav ol').each(function(){
			var id = $('li:not(.add):first', this)
						.trigger('click')
						.attr('data-id');
			$('nav.left > ul[data-id='+id+'] div button.view').trigger('click');
		});


	    // Has the user passed in a query?
	    if(channel().q){
	    	// Create a new tab with the search results
			var ul = toob.tab(channel().label || channel().q, $ol[0] ,null,null,true ), 
				q = channel().q || channel().label;

			toob.search(q.replace(/\|/g,' | '), ul);
			var id = $(ul).attr('data-id');
			$('nav.left > ul[data-id='+id+'] div button.view, nav.left > ol li[data-id='+id+']').trigger('click');
	    }
		
		// RESIZE
		//if(!store.margins){
		//}
		store.margins = {Left:"35%", Right:"0"};

		/* Override form submit, jQuery bug with IE8, see also e.preventDefault()
	    $('form').each( function() {
	        this.submit = function(e){ e.preventDefault();$(this).trigger("submit");};
	    });
	    */
		
		$(window).trigger('hashchange').trigger('resize');		
		
	},
	
	prevEvent : null,
	mouseDown : null,

	EVENTS : {
		/* MAIN VIDEO CONTROL */
		'hashchange,popstate' : function(){
			// Has the video changed?
			// Apply all the features to the video if this has not already been done
			// this gets triggered when we get a hasnchange event on the page
			var w = store.margins.Left;
			if(!toob.player()){
				w = ((1-($('nav.right').width()/$(window).width()))*100)+'%';
			}
			$('nav.left').animate({width : w});
			$('div.main').animate({marginLeft: w});
		},
		/* REMOTE */ 
		// Called from remote window, browser control
		'toobifyRemote' : function(e, data){
			
			if(!(toob.fplayer=document.getElementById('fplayer'))) return;

			// If no data is passed then merely trigger the current state
			if(!data){
				toob.triggerState();
				return;
			}

			log("Button clicked pause/play/move video",data);
			if(data.next===true){
				// User has changed video
				toob.next(true);
			}
			else if(data.prev===true){
				toob.prev(true);
			}
			else if(("state" in data) && data.state !== toob.fplayer.getPlayerState()){
				// execute the youtube command to play/pause
				toob.fplayer[(data.state===1?'play':'pause')+'Video']();
			}
		},
		/**
		 * Tab switcher
		 */
		'nav ol li:not(.add) click' : function(){
			if( $(this).hasClass('selected') ) return;

			$(this).addClass('selected').siblings('.selected').removeClass('selected').each(function(){
				$('nav > [data-id='+$(this).attr('data-id')+']').removeClass('selected');
			});

			$(this)
				.parent('ol')
				.nextAll('[data-id='+$(this).attr('data-id')+']')
				.addClass('selected');
			
			try{
				$('nav > form[data-id='+$(this).attr('data-id')+'] input').get(0).focus();
			}catch(e){}
		},
		'header .logo click' : function(){
			change("/");
		},
		// Edit Tabs
		'nav ol li:not(.add) selectstart' : function(){
			return false;
		},
		'nav.left ol li:not(.add) dblclick' : function(){
			var t = prompt("What do you want to call this tab?", $(this).text().replace(/X$/,'') );
			
			if( !t || t.length==0 ) return;
			toob.tab( t, $(this).parent(), $(this).attr('data-id') );
			$(window).trigger('savetabs');
			return false;
		},

		'nav ol li.add click' : function(){
			toob.tab("NEW TAB", $(this).parent() );
		},

		'nav ol li span.remove click' : function(){
			var $li = $(this).parent('li'),
				i = $li.attr('data-id');

			if($li.siblings(":not(.add):first").trigger('click').length===0){
				toob.tab("NEW TAB",$li.parent());
			}
			
			$('nav > [data-id='+i+']').add($li).remove();

			$(window).trigger('savetabs');
		},
		// Save the current tabs
		'savetabs' : function(){
			var a=[];
			// loop through all the tabs and build up the tab list
			$('nav.left ol').each(function(){
				var type = ($(this).hasClass('searches')?0:1);
				$('li:not(.add)', this).each(function(){
					var id = parseInt($(this).attr('data-id'));
					a.push({
						title	: $(this).attr('data-label'),
						list	: toob.getIds($('nav.left ul[data-id='+id+']')),
						type	: type,
						info	: ($('nav ul[data-id=' + id + '] > i').html())
					});
				});
			});
			store.tabs = a;
			store.save();
		},
		/**
		 * Searching
		 */
		'nav.left > form submit' : function(){
			try{
				var s = $('input', this).val() || $(this).attr( "data-label" ),
					i = $(this).attr( "data-id" ),
					l = $(this).attr( "data-label" ),
					$u = $('nav ul[data-id='+ i +']');
					
				if(s==='NEW TAB')
					s='';

				if($u.length===0)
					return;

				toob.tab(s, $(this).prevAll('ol').get(0), i );

				// for pagination
				if(s!==l){
					// add star results to the list
					$u.find('li,.placeholder').remove();
					if(s)store.queries.push(s);
				}
				// search
				toob.search(s,$u);
			}catch(e){
				log("Errr this bad, search failed");
			}

			return false;
		},
		// because the scroll event cannot be attached via "live" we have a hack
		'nav.left ul mouseenter' : function(e){
			if(!$(this).attr("data-scroll")){
				$(this).scroll(toob.EVENTS['nav.left ul scroll']);
				$(this).attr("data-scroll",true);
			}
		},
		'nav.left ul scroll' : function(e){
			// Load images
			$(this).trigger('updatelist');

			// HIT THE BOTTOM
			if( e.target.scrollHeight <= (e.target.scrollTop + e.target.offsetHeight)){
				$('nav form[data-id='+$(this).attr('data-id')+']').submit();
			}
		},
		'nav.left ul div.placeholder input change' : function(){
			// Prepend the current form input
			$(this).parents('ul.selected').prev("form.selected").find('input').val($(this).val()).get(0).focus();
		},
		/**
		 * Double Click starts playing defines the item as selected
		 */
		'nav.left ul li a click'	: function(){
			// Remove any selected video
			toob.anchorplaying = this;

			$('nav.left ul li.selected').removeClass('selected');
			
			// Change HASH
			change($(this).attr('href'));
			
			return false;
		},
		'nav.left ul li a dblclick'	: function(){
			toob.anchorplaying = this;
			$(this).parent().addClass('selected');
		},
		'nav.left ul li span.remove click'	: function(){
			$(this).parent().remove();
			$(window).trigger('savetabs');
		},

		'nav.left ul li span.add click' : function(){
			var $li = $(this).parent(),
				p = channel($li.find('a').attr('href'));
			// Get the current playlist
			$ul = $('nav.left ol.playlists').nextAll('ul.selected:eq(0)').each(function(){
				$(this).append(toob.item(p.id,p.title,true));
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
				s = toob.item(p.id, p.title, true);


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
		"nav ul div button.view click"	: function(){
			// change the view
			var action = ($(this).hasClass('active') ? 'remove' : 'add');
			$(this)[action+'Class']('active').parents('ul')[action+'Class']($(this).attr('data-toggle'));

			// loop through all the items in the list and load the images into the placehlders
			$(this).parents('ul').trigger('updatelist');
		},
		
		/**
		 * Share the playlist
		 */
		"nav ul div button.share click"	: function(){
			var a=[],$ul=$(this).parents("ul"),label=$ul.attr('data-label');
			$(toob.getIds($(this).parents("ul"))).each(function(k,v){
				try{ a.push(v.match(/id=([^\&]+)/)[1]) }
				catch(e){}
			});
			$(window).trigger('share', [label, "#label="+label+"&q="+ a.join('|')] );
		},
		/**
		 * Resize
		 */
		'nav button selectstart' : function(){
			return false;
		},
		'nav selectstart' : function(){
			return false;
		},
		'nav > button.rh mousedown' : function(e){
			toob.mouseDown = {prev:[],next:[]};
			$(this).prevUntil('button.resize').filter('ul').each(function(){
				toob.mouseDown.prev.push($(this).height());
			});
			$(this).nextUntil('button.resize').filter('ul').each(function(){
				toob.mouseDown.next.push($(this).height());
			});
			toob.prevEvent = e || window.event;
			toob.resizeControl = this;
		},
		'nav > button.lv, nav > button.rv mousedown' : function(e){
			toob.mouseDown = $(this).parent('nav').width();
			toob.prevEvent = e || window.event;
			toob.resizeControl = this;
		},
		'nav > button.lv, nav > button.rv dblclick' : function(e){
			var w = ($(this).parent('nav').width() <= 10 ? 300 : 10) +'px';
			$(this).parent('nav').css({width : w}).trigger("resize");
			if($(this).hasClass('rv')){
				var o = {marginLeft : w}
				store.margins.Left = w;
			}else{ 
				var o = {marginRight : w}
			}
			$('div.main').css(o);
		},
		'body mousemove' : function(e){
			e = e || window.event;
			if(!toob.mouseDown) return;
			var $parent = $(toob.resizeControl).parent('nav');
			

			if(typeof(toob.mouseDown) === 'object'){

				if(((toob.mouseDown.prev[0] - (toob.prevEvent.pageY - e.pageY))<20)||((toob.mouseDown.next[0] + (toob.prevEvent.pageY - e.pageY))<20)) return;

				$(toob.resizeControl).prevUntil('button.resize').filter('ul').each(function(i){
					$(this).height( (100*(toob.mouseDown.prev[i] - (toob.prevEvent.pageY - e.pageY))/$parent.height())+'%' );
				});
				$(toob.resizeControl).nextUntil('button.resize').filter('ul').each(function(i){
					$(this).height( (100*(toob.mouseDown.next[i] + (toob.prevEvent.pageY - e.pageY))/$parent.height())+'%' );
				});

			} else {
				var o, w;
				if( $(toob.resizeControl).hasClass('rv') ){
					w = (toob.mouseDown - (toob.prevEvent.pageX - e.pageX)) + 'px';
					o = {marginLeft : w};
					store.margins.Left = w;
				}else {
					w = (toob.mouseDown + (toob.prevEvent.pageX - e.pageX)) + 'px';
					o = {marginRight : w};	
				}
				$parent.css({width : w});
				$('div.main').css(o);
			}
			$parent.trigger('resize');
			
		},
		'nav mouseup' : function(e){
			toob.mouseDown = toob.prevEvent = toob.resizeControl = null;
			
			// save menu position asyuncronously
			setTimeout(function(){
				store.save();
				$('ul',this).trigger('updatelist');
			},100);
		},
		'nav resize'  : function(){
			if($('div.main').width()===0){
				var w = Math.max($('body').width()-$(this).width(),10)+'px';
				$(this)
					.siblings('nav')
					.width(w);
				
				var o;
				if($(this).prevAll('nav').length){
					o = {marginLeft:w};
				}
				else {
					o = {marginRight:w};
				}
				$('div.main').css(o);
			}
		},
		'resize'	: function(){
		    // POSITION
			$('nav.left ol:eq(1)').nextAll('ul').height(((20/screen.height)*100)+'%');
			$('nav.left ol:eq(0)').nextUntil('ol').filter('ul').height((100*($(window).height()-(175+$('nav.left ol:eq(0)').height()))/$(window).height())+'%');
		},
/**		'nav click'	: function(){
			$(this)
				.css({zIndex:1})
				.siblings('nav')
				.css({zIndex:0})
		},	
*/
		'nav ul.thumbs updatelist'	: function(){
			// SHOWS IMAGES WHEN THEY ARE REQUIRED
			$(this)
				.each(function(){
					var h = $(this).height(),t,o=$(this).position().top;
					$('li',this).each(function(){
						t = $(this).position().top - o; 
						if(t>0&&t<(h+$(this).height())){
							$('img:not([src])',this).each(function(){
								var id= $(this).attr('data-id');
								var s = "http://i.ytimg.com/vi/"+id+'/default.jpg';
								this.src = s;
								// Have we allready loaded this image into the browser?
						    	if( $.inArray(id,toob.images) > -1 ){
							    	$(this).animate({opacity:1},'fast');
						    	} else {
						    		$(this).load( function(){$(this).animate({opacity:1},'fast');toob.images.push(id);} );
						    	}
							});
						}
					});
				});
		}
	},
	player : function(){
	
		var p =  channel();
		if(!p||!p.id){
			$('div.main').html('<div id="player"></div>');
			return false;
		} 

		$('h1').html((document.title = p.title));
		
		$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+p.id+'?v=2&alt=json-in-script&callback=?', function(json){
			$('meta[name=image_src]').attr('content',json['entry']['media$group']['media$thumbnail'][0]['url']);
		});

		if($('#fplayer').length===0){
			swfobject.embedSWF('http://www.youtube.com/v/'+ p.id +'?color1=0x000000&color2=0x000000&enablejsapi=1&playerapiid=ytplayer', "player", "100%", "90%", "9", null, 
			{}, { allowScriptAccess: "always", bgcolor: "#cccccc" }, { id: "fplayer" });
			toob.fplayer = document.getElementById('fplayer');

		} else if( p.id !== document.getElementById('fplayer').getVideoUrl().match(/\?v=([^&]+)/)[1] ){
			document.getElementById('fplayer').loadVideoById(p.id);
		}
		else{
			return true;
		}

		// Prepend to the playlist
		store.playlist.push(p.id);

		// Store the view of the item
		store.played[p.id]++ || (store.played[p.id]=1);
	
		// Store a list of video title references for general use.
		store.videos[p.id] = p.title;
		
		$('nav.left ul[data-label^=PLAYED:]').each(function(){
			if( $(this).find('li a[href*="'+p.id+'"]').length===0){
				var t= toob.item(p.id,p.title, true ),
					$t = $(this).find('li:first');
				if($t.length===0)
					$(this).append(t);
				else 
					$t.before(t);
				$(this).trigger('updatelist');
			}
		});

		$(window).trigger('savetabs');
		return true;
	},
	tab		: function(t, ol, id, info){
		var h = $(ol).nextAll('ul').height(),
			i = (parseInt(id) >= 0 ? parseInt(id) : this.tabs_length ),
			c = (t?t.toUpperCase().replace(/[^A-Z0-9\_]+/ig,''):null);
		
		this.tabs_length++;
		
		// Same name can't exist elsewhere must not be null
		if( !t || t.length==0 ) return;

		// Add tab
		$li = $('li[data-id='+id+']', ol);
		if($li.length===0){
			$li = $('<li></li>').appendTo(ol);
		};

		$ul = $('ul[data-id='+id+']', $(ol).parent() );
		if($ul.length===0){
			$ul = $('<ul ondragenter="cancelEvent()" ondragover="cancelEvent()" ondrop="toob.EVENTS[\'nav ul drop\'](this)"></ul>').insertAfter(ol);
		};

		$fm = $('form[data-id='+id+']', $(ol).parent() );
		if($fm.length === 0 && $(ol).hasClass('searches')){		// Does this search have a form?
			$fm = $('<form  class="search" action="#whoops"><input type="search" placeholder="'+t+'"/><button title="Search YouTube">&#9658;</button></form>').insertAfter(ol);
		}

		if(!id)
			$ul.append('<div class="control"><button data-toggle="thumbs" class="view">Thumbs</button><button class="share">Share</button></div>');

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
		$fm.attr( "data-id", i ).attr( "data-label", t );
		$li.attr( "data-id", i ).attr( "data-label", t ).attr( "title", "Click to select, Double click to change label" ).html(t.replace(/ /g,'&nbsp;')+'<span class="remove">X</span>').trigger('click');
		
		if(h) $ul.height(h+'px');
		return $ul;
	},
	search	: function(s,ul,i){
		// Get the start
		if(!i)i=$("li",ul).length;

		// Special searches
		if(s==='SEARCH YOUTUBE')
			s='';
		else if( s.match(/^PLAYED\s*\:/) ){
			// Search through the played list
			for(var i=0,x,s='',a=store.playlist.reverse();i<a.length;i++){
				if(x===a[i]) continue; // dont put two identical items next to one another
				x = a[i];
				s += toob.item( x, store.videos[x] );
			}

			$(ul).append(s);
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
				if( !$.isArray(json) )
					return;
				s ='<i>video tweets from <a href="http://twitter.com/'+s.replace(/@/,'')+'" target=_blank >'+s+'</a></i>';
				for( var x in json ){
					if(!json[x].text) continue;
					var m = json[x].text.match(/\|\s*(.*?)\s*\[(.*?)\]/i);
					if(!m) m = json[x].text.match(/(.*?)\s*\[(.*?)\]/i);
					if(!m) continue;
					s += toob.item(m[2],m[1],true);
				}
				$(ul).append(s).trigger('updatelist');
				$(window).trigger('savetabs');
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
			var s = '';
			for(var x in json.feed.entry){if(json.feed.entry.hasOwnProperty(x)){
				//if(typeof( json.feed.entry[x]['app$control'] ) === 'object') continue; // this video is restricted... its better not to show them i feel.
				s += toob.item( json.feed.entry[x].id['$t'].match(/video:([^:]+)/)[1], json.feed.entry[x].title['$t'], true );
			}};

			// Overwrite / Append the results
			$(ul).append(s).trigger('updatelist');
			$(window).trigger('savetabs');
		});
	},
	/**
	 * List navigation
	 */
	next	: function(force){
		toob.move('next',force);
	},
	prev	: function(force){
		toob.move('prev',force);
	},
	move	: function (move,force){
		var href = $('nav.left ul li.selected')
						.removeClass('selected')
						[move]()
						.find('a')
						.trigger('dblclick')
						.attr('href');

		if(!href&&toob.anchorplaying){
			href = $(toob.anchorplaying)
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

	/**
	 * State change
	 */
	_stateChange : function(state){

		log('newstate: '+(['ended','playing','paused','buffering','','video cued'][state] || 'uncertain/unstarted'));
		var id = (toob.fplayer=document.getElementById('fplayer')).getVideoUrl().match(/\?v=([^&]+)/)[1];
		// if the new state has changed, and it is the current item playing
		var href = $('nav.left ul li.selected a').attr('href');
		if( state === 0 && ( href && (channel(href).id === channel().id) ) && $('nav.left li.selected').next().length ){
			// then play the next one
			toob.next();
			return;
		}
		else if ( state === 3 && (id !== channel().id) ){
			// The user has changed the video and it is no longer the same as our data.
			$.getJSON('http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json-in-script&callback=?', function(json){
				$('nav.left ul li.selected').removeClass('selected');
				change({
					id : id,
					title : json.entry.title['$t']
				});
			});
		} else if( state === 5 ){
			toob.fplayer.playVideo();
		} else if( state === 1 ){
			// trigger a change in player which should update the 
		}

		// Trigger state change
		toob.triggerState();
	},
	/**
	 * Broadcast the current state of the player, and the next and previous elements to play
	 */
	triggerState	: function(){
		$(window).trigger('toobifyState', [{
			state	: toob.fplayer.getPlayerState(),
			title	: channel().title,
			play	: channel(channel()),
			next	: $('nav.left li.selected').next().find('a').attr('href'),
			prev	: $('nav.left li.selected').prev().find('a').attr('href')
		}]);
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
		return '<li>'+(editable?'<span class="remove" title="Remove">X</span>':'')+'<span class="add" title="Add to current playlist">&#43;</span><a href="'+link+'" draggable=true ondragend="toob.EVENTS[\'nav ul li a dragend\']();" title="Click to play, Double Click to playall from here"><img data-id="'+id+'"/>'+ title +'</a></li>';
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


function onYouTubePlayerReady(playerId) {
	if (!playerId) { return; }
	document.getElementById('fplayer').addEventListener('onStateChange', 'toob._stateChange');
}

function cancelEvent() {
	if (window.event)
		window.event.returnValue = false;
}

toob.init();
