// Javascript file for embedding a youttube player in the site and adding controls.
// Author Andrew Dodson

// Store client side data helper.
var store = {};
if(localStorage&&localStorage.json){
	store = JSON.parse( localStorage.json );
}
store.save = function(n,o){
	if(n)
		store[n] = o;
	if( typeof(JSON) !== 'undefined' )
		localStorage.json = JSON.stringify( store );
}

// Load the toob object on windowload
$(document).ready(function(){
	toob.init();
});



//  action="javascript:$(this).trigger(\'submit\');void(0);"
var toob = {
	appname: 'Toobify:',
	mousedown : false,
	lastSearchCount : false,
	// REMOTE
	state	: false,
	
	init : function(){
		$('body').addClass('toobwidget');
		$('nav.left').html('\
			<ol class="searches"><li class="selected results">SEARCH<\/li><li class="played">PLAYED<\/li><\/ol>\
			<form class="results selected" action="./#whoops"><input type="search" placeholder="Search YouTube"/><button title="Search YouTube">&#9658;</button><button type="button" title="Save search" class="save">&#9733;</button></form>\
			<ul class="results selected"></ul>\
			<form class="played" action="./#whoops"><input type="search" placeholder="Search Play History"/><button>Search</button></form>\
			<ul class="played"><\/ul>\
			<button class="rh resize"></button>\
			<ol class="playlists"><li class="selected PLAYLIST"><span>PLAYLIST</span><\/li><li class="add" title="Create a new Playlist">+</li><\/ol>\
			<ul class="PLAYLIST selected dropzone" ondragenter="cancelEvent()" ondragover="cancelEvent()" ondrop="toob.EVENTS[\'nav ul.dropzone drop\'](this)"><span class="placeholder">Drag video links to playlist</span></ul>\
			<button class="rv resize"></button>').show();

		$('nav.right').append('<ol><\/ol><button class="lv resize"><\/button>');
		// Attach controls.
		var x,m;
		for( x in toob.EVENTS ){
			m = x.match(/(.* )?([a-z\,]+)$/i);
			if(m[2]==='scroll')
				$(m[1]||window).scroll(toob.EVENTS[x]);
			else 
				$(m[1]||window)[m[1]?'live':'bind'](m[2].replace(',',' '), toob.EVENTS[x]);
		}

		
		// Restore the playlist
		if(localStorage){
			if(localStorage.query){
				store.query = localStorage.query;
				delete localStorage.query;
			}
			if(store.query)
				$('nav form.results input').val(store.query);

			if(localStorage.played){
				$('nav ul.played').html(localStorage.played);
			}
		}
		
		// PLAYLISTS
		if(!store.playlists){
			store.playlists = {};
		} else {
			if(!store.playlisttitles){
				store.playlisttitles = {};
			}
			for( var x in store.playlists ){ if(store.playlists.hasOwnProperty(x)){
				$('nav ol.playlists li.add').trigger('click',[store.playlisttitles[x]||'PLAYLIST',store.playlists[x]]);
				if(!store.playlists.PLAYLIST){
					$('ul.PLAYLIST').add('ol li.PLAYLIST').remove();
				}
			}}
			$('nav ol.playlists li:first').trigger('click');
		}
		// PLAYED
		if(!store.played || typeof store.played !== 'object' )
			store.played = {}
		
		// QUERIES
		if(!store.queries)
			store.queries = [];

		// SEARCHES
		if(!store.searches){
			store.save('searches', ['@toobify']);
		}
		$ol = $('nav.left ol.searches');
		$(store.searches).each(function(i,s){
			// Save the search results into a new tab
			var ul = toob.tab(s, $ol);
			// Run the search and popupate the tab
			toob.search(s, ul);
		});
		
		// RESIZE
		if(!store.margins){
			store.margins = {};
		} else {
			for( var x in store.margins){
				var w = store.margins[x];
				$('nav.'+x.toLowerCase()).css({width : w});
				$('div.main').css('margin'+x,w);
			}
		}

		/* Override form submit, jQuery bug with IE8, see also e.preventDefault()
	    $('form').each( function() {
	        this.submit = function(e){ e.preventDefault();$(this).trigger("submit");};
	    });
	    */
		// Initial search
		$('nav form.results').submit();
		
		// Show all items in the showed list
		$('nav form.played').submit();
		
		$(window).trigger('hashchange');
	},
	
	prevEvent : null,
	mouseDown : null,

	EVENTS : {
		/* MAIN VIDEO CONTROL */
		'hashchange,popstate' : function(){
			// Has the video changed?
			// Apply all the features to the video if this has not already been done
			// this gets triggered when we get a hasnchange event on the page
			if(!toob.player()){
				toob.defaultMain();
			}
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
			var c = $(this).attr('class');
			
			$(this).addClass('selected').siblings('.selected').removeClass('selected').each(function(){
				$('.'+$(this).attr('class'), $(this).parents('nav') ).removeClass('selected');
			});

			$(this).parent('ol').siblings('.'+c).addClass('selected');
		},

		// Edit Tabs
		'nav ol li:not(.add) selectstart' : function(){
			return false;
		},
		'nav ol.playlists li:not(.add) dblclick' : function(){
			var o = $(this).attr('class').match(/[A-Z0-9]+/)[0],
				t = prompt("Rename playlist: What would you like to call it?", $(this).text().replace(/X$/,'') ),
				c = (t?t.toUpperCase().replace(/[^A-Z0-9]+/,''):null);

			if( !t || t.length==0 ) return;
			if( $('ul.'+c).length > 0 ){
				alert('"'+t+'" or a name like it is in use.');
				return;
			}

			$(this)
				.html(t+'<span class="remove">X</span>')
				.add('ul.'+o,this.parentNode.parentNode)
				.removeClass(o)
				.addClass(c);

			store.playlisttitles[c] = t;
			store.playlists[c] = $('ul.'+c,this.parentNode.parentNode).html();
			delete store.playlists[o];
			delete store.playlisttitles[o];
			store.save();

			return false;
		},
		'nav ol.playlists li.add click' : function(event, t, content){
			var t = (typeof(t)==='string'?t:prompt("Create a new playlist: What would you like to call it?","")),
				h = $(this.parentNode).next('ul').height()+'px',
				c = (t?t.toUpperCase().replace(/[^A-Z0-9]+/,''):null),
				u = '<ul class="dropzone '+c+'" ondragenter="cancelEvent()" ondragover="cancelEvent()" ondrop="toob.EVENTS[\'nav ul.dropzone drop\'](this)">'+(content||'<span class="placeholder">Drag video links to playlist</span>')+'</ul>';

			// Same name can't exist elsewhere must not be null
			if( !t || t.length==0 ) return;

			// Same name exists
			if(content){
				$('ul.'+c).html(content);
			}

			if( $('ul.'+c).length > 0 ){
				if(!content){
					alert('"'+t+'" or a name like it is in use.');
				}
				return;
			}

			$ul = $(u).insertAfter(this.parentNode).height(h);
			$('<li class="'+c+'">'+t+'<span class="remove">X</span></li>').insertBefore(this).trigger('click');

			if(!store.playlisttitles){
				store.playlisttitles = {};
			}
			store.playlisttitles[c] = t;
			store.playlists[c] = $ul.html();
			store.save();
		},

		'nav ol.playlists li span.remove click' : function(){
			var $li = $(this).parent('li'),
				c = $li.attr('class').match(/[A-Z0-9]+/)[0];
				
			// if this is the only one do not delete.
			if($li.siblings(":not(.add)").length===0){
				log("Can't delete the last one");
				return;
			}

			$li.parent('ol').siblings('ul.'+c).remove();
			$li.siblings(":first").trigger('click');
			$li.remove();
			
			delete store.playlists[c];
			delete store.playlisttitles[c];
			store.save();
		},
		/**
		 * Searching
		 */
		'nav form.results submit' : function(){
			try{
				var s = $('input', this).val();
				
				// for pagination
				if(s!==store.query){
					// reset the counter
					toob.lastSearchCount = 0;
					// prefill the results area
					// add star results to the list
					$('nav ul.results').html('');
					if(s)store.queries.push(s);
					store.query = s;
					store.save();
				}
	
				toob.search(s,$('nav ul.results'),toob.lastSearchCount++);
			}catch(e){
				log("Errr this bad, search failed");
			}

			return false;
		},
		'nav form button.save click'	: function(){
			var s= $('input', this.form).val();
			if(store.searches.indexOf(s)===-1){
				store.searches.push(s);
				store.save();
				var ul = toob.tab(s, $(this).parent().prevAll('ol'));
				toob.search(s, ul);
			}
		},
		'nav ol.searches li span.remove click' : function(){
			var $li = $(this).parent('li'),
				c = $li.attr('data-label'),
				$ol = $li.parent('ol');
				
			// if this is the only one do not delete.
			if($li.siblings(":not(.add)").length===0){
				log("Can't delete the last one");
				return;
			}

			$ol.siblings().filter(function(){ $(this).attr('data-label')===c } ).remove();
			$li.siblings(":first").trigger('click');
			$li.remove();
			
			if($ol.hasClass('playlists')){
				delete store.playlists[c];
				delete store.playlisttitles[c];
			}
			else if($ol.hasClass('searches')){
				store.searches = $.grep( store.searches, function(n,i){
					return n!=c&&!!n;
				});
			}
			store.save();
		},
		'nav ul.results scroll' : function(e){
			// HIT THE BOTTOM
			if( e.target.scrollHeight === (e.target.scrollTop + e.target.offsetHeight)){
				$('nav form.results').submit();
			}
		},
		'nav form.played input keyup,click' : function(){
			$(this).parent('form').trigger('submit');
		},
		'nav form.played submit' : function(){
			var s = $('input',this).val().toLowerCase();
			$("nav ul.played li a").each(function(){
				$(this).parent('li')['fade'+($(this).html().toLowerCase().match(s)?'In':'Out')]('fast');	
			});
			
			return false;
		},
		'nav ul.results li a,nav ul.played li a click' : function(){
			// Remove any activity in the playlist
			$('nav ul.dropzone li.selected').removeClass('selected');
		},
		/**
		 * Double Click starts playing defines the item as selected
		 */
		'nav.left ul li a click'	: function(){
			// Remove any selected video
			toob.anchorplaying = this;
			$('nav.left ul li').removeClass('selected');
			
			// PushState
			if(!!history.pushState){
				// Goodbye hashchange, you weren't interoperable with my server but you did create a nice UX.
				var href = $(this).attr('href');
				// Is this a change in location?
				if(channel(href).id!==channel().id){
					history.pushState( {}, channel(href).title, href.replace('#','?').replace('/title','&title') );
					$(window).trigger('popstate');
				}
				return false;
			}
		},
		'nav.left ul li a dblclick'	: function(){
			toob.anchorplaying = this;
			$(this).parent().addClass('selected');
		},
		/**
		 * ADD TO PLAYLIST
		 */
		'nav ul li span.add click' : function(){
			var $li = $(this).parent(),
				p = channel($li.find('a').attr('href'));
			// Get the current playlist
			$ul = $('nav.left ol.playlists').nextAll('ul.selected:eq(0)').append(toob.item(p.id,p.title,true));

			// if the placeholder is present removeit
			$('.placeholder',$ul).remove();

			// Store in the localStorage
			var tab = $ul.attr('class').match(/[A-Z0-9]+/)[0];
			store.playlists[tab] = $ul.html();
			store.save();
		},
		
		/**
		 * Playlist
		 */
		'nav ul.dropzone li span.remove click' : function(){
			// Store in the localStorage
			var $ul = $(this).parents('ul.dropzone'),
				tab = $ul.attr('class').match(/[A-Z0-9]+/)[0];
			$(this).parent().remove();
			store.playlists[tab] = $ul.html();
			store.save();
		},

		/**
		 * Played list
		 */
		'nav ul.played li span.remove click' : function(){
			$(this).parent().remove();
			// Store in the localStorage
			if(localStorage){
				localStorage.played = $('nav ul.played').html();
			}
		},
		/**
		 * Drag and Drop
		 */
		'nav ul.results li a dragstart' : function(ev) {
			var dt = ev.originalEvent.dataTransfer;
			ev.effectAllowed = 'move'; // only allow moves
			$('nav ul.dropzone').addClass('active');
			return true;
		},
		'nav ul.results li a dragend' : function(ev) {
			$('nav ul.dropzone').removeClass('active');
//			$('nav ul.playlist.dragover, nav ul.playlist .dragover').removeClass('dragover');
			return false;
		},
        'nav ul.dropzone dragenter' : function(ev) {
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
		'nav ul.dropzone dragleave' : function(ev) {
/*			if(target.tagName.match(/UL|DIV/)){
				$((target.tagName==='UL'?target:$('ul', target))).removeClass('dragover');
			}
			else {
				$(target).removeClass('dragover').parents('li').removeClass('dragover');
			}
*/
			return false;
		},
		'nav ul.dropzone dragover' : function(ev) {
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
		'nav ul.dropzone drop' : function(e) {
			var ev = (e&&e.originalEvent?e.originalEvent:window.event);
			if(!ev)
				return;
			
			var	dt = ev.dataTransfer,
				target = ev.target || e,
				p = channel(dt.getData('Text')),
				url = dt.getData('Text'),
				s = toob.item(p.id, p.title, true);

			if(!p.title||(target&&target.href===url)){
				return false;
			}
			// if href already exists in the list then we must remove it!
			var $ul = (target.tagName === 'UL'?$(target):$(target).parents('ul.dropzone')),
				$orig = $ul.find('a[href*="'+p.id+'"]').parents('li');
			if($orig.length){
				s = $orig;
				$orig.remove();
			};

			if(target.tagName.match(/UL|SPAN/)){
				$(s).appendTo(target.tagName==='UL'?target:$(target).parent('ul.dropzone'));
			}
			else{
				$(s).insertBefore(target.tagName==='LI'?target:$(target).parents('li'));
			}
			
			// if the placeholder is present removeit
			$('ul.dropzone .placeholder').remove();

			// Store in the localStorage
			var tab = $ul.attr('class').match(/[A-Z0-9]+/)[0];
			
			store.playlists[tab] = $ul.html();
			store.save();
			
			return false;
		},
		
		/**
		 * Resize
		 */
		'nav button selectstart' : function(){
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
			$(this).parent('nav').css({width : w});
			if($(this).hasClass('rv')){
				var o = {marginLeft : w}
				store.margins.Left = w;
			}else{ 
				var o = {marginRight : w}
			}
			store.save();
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
				if( $(toob.resizeControl).hasClass('rv') ){
					var width = (toob.mouseDown - (toob.prevEvent.pageX - e.pageX)) + 'px';
					var o = {marginLeft : width};
					store.margins.Left = width;
				}else {
					var width = (toob.mouseDown + (toob.prevEvent.pageX - e.pageX)) + 'px';
					var o = {marginRight : (toob.mouseDown + (toob.prevEvent.pageX - e.pageX)) + 'px'};	
				}
				$parent.css({width : width});
				$('div.main').css(o);
				store.save();
			}
		},
		'nav mouseup' : function(e){
			toob.mouseDown = toob.prevEvent = toob.resizeControl = null;
		}
	},
	player : function(){
	
		var p =  channel();
		if(!p||!p.id) return false;

		$('h1').html((document.title = 'Toobify | ' + p.title));
		
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
		
		// Store the view of the item
		store.played[channel(p)]++ || (store.played[channel(p)]=1);
		store.save();

		// STORE THIS IN THE PLAYED LIST IF WE HAVEN'T ALREADY
		if(p.id&&$('ul.played li a[href*="'+p.id+'"]').length===0){
			$('ul.played').prepend(toob.item(p.id,p.title, true));
			// Store in the localStorage
			if(localStorage){
				localStorage.played = $('ul.played').html();
			}
		}
		
		return true;
	},
	tab		: function(t, ol){
		var h = $(ol).nextAll('ul').height(),
			c = (t?t.toUpperCase().replace(/[^A-Z0-9\_]+/ig,''):null),
			u = '<ul class="'+c+'"></ul>';
		

		// Same name can't exist elsewhere must not be null
		if( !t || t.length==0 ) return;

		if( $('ul.'+c).length > 0 ){
			if(!content){
				alert('"'+t+'" is already in the list.');
			}
			return;
		}


		$li = $('<li class="'+c+'">'+t.replace(/ /g,'&nbsp;')+'<span class="remove">X</span></li>').attr( "data-label", t ).appendTo(ol);
		$ul = $(u).attr( "data-label", t ).insertAfter(ol);
		if(h) $ul.height(h+'px');
		return $ul;
	},
	search	: function(s, ul,i){
		if(!i)i=0;
		// Does the search start with a @
		if(s[0]==='@'){
			// This is a twitter search
			$.getJSON('http://api.twitter.com/1/statuses/user_timeline.json?screen_name='+s.replace(/@/,'')+'&count=100&include_rts=true&clientsource=CUSTOM&callback=?', function(json){
				if( !$.isArray(json) )
					return;
				s ='<i>video tweets from <a href="http://twitter.com/'+s.replace(/@/,'')+'" target=_blank >'+s+'</a></i>';
				for( var x in json ){
					if(!json[x].text) continue;
					var m = json[x].text.match(/\|\s*(.*?)\s*\[(.*?)\]/i);
					if(!m) return;
					s += toob.item(m[2],m[1]);
				}
				$(ul).append(s);
			});
			return false;
		}
		
		var p = channel();

		if(s){
			s = 'videos?v=2&format=1&q='+ encodeURIComponent(s);
		}else if((p.id)){
			s = 'videos/'+p.id+'/related?v=2';
		} else {
			s = "standardfeeds/top_rated?v=2";
		}

		$.getJSON( 'http://gdata.youtube.com/feeds/api/' + s + '&alt=json-in-script&max-results=50&start-index='+((50*i)+1)+'&callback=?', function(json){
			var s = '';
			for(var x in json.feed.entry){if(json.feed.entry.hasOwnProperty(x)){
				if(typeof( json.feed.entry[x]['app$control'] ) === 'object') continue; // this video is restricted... its better not to show them i feel.
				s += toob.item( json.feed.entry[x].id['$t'].match(/video:([^:]+)/)[1], json.feed.entry[x].title['$t'] );
			}};
			// Overwrite / Append the results
			$(ul).append(s);

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
				$('nav ul li.selected').removeClass('selected');
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

	defaultMain : function(){
		// Play video ... if there is a link
		// If we arn't launching a video
		if( !toob.player() ){
			$('h1').html((document.title = 'Toobify'));
			$.getJSON( 'http://gdata.youtube.com/feeds/api/standardfeeds/recently_featured?v=2&max-results=30&alt=json-in-script&callback=?', function(json){

				var s = '';
				for(var x in json.feed.entry){if(json.feed.entry.hasOwnProperty(x)){
					try{
						var link = 	channel( { 
							id : json.feed.entry[x].id['$t'].match(/video:([^:]+)/)[1], 
							title : json.feed.entry[x].title['$t'] 
						});
						s += '<figure>'+('<img src="'+ json.feed.entry[x]['media$group']['media$thumbnail'][0].url +'" /><figcaption>' + (json.feed.entry[x].title['$t'])+'</figcaption>').link(link)+'</figure>';
					}catch(e){}
				}};

		        $('div.main').html('<div id="player">'+s+'</div>')
		        	.find('#player figure')
		        	.each(function(i){
		        		$('img', this).bind('load', function(){$(this).parents('figure').animate({opacity:1},'slow')});
/*		        		var that = this;
		        		setTimeout( function(){ $(that).fadeIn('slow') }, i*100 );
		        		*/
		        	});
			});
		}
	},
	
	item : function(id,title,editable){
		var link = channel({id:id,title:title});
		return '<li>'+(editable?'<span class="remove" title="Remove">X</span>':'')+'<span class="add" title="Add to current playlist">&#43;</span><a href="'+link+'" draggable=true ondragend="toob.EVENTS[\'nav ul.results li a dragend\']();" title="Click to play, Double Click to playall from here">'+title+'</a></li>';
		// !!! IE wont let us dynamically attach any drag events to an element
	}
};


function onYouTubePlayerReady(playerId) {
	if (!playerId) { return; }
	document.getElementById('fplayer').addEventListener('onStateChange','toob._stateChange');
}

function cancelEvent() {
	if(window.event)
		window.event.returnValue = false;
}