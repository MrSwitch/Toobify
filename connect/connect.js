/**
 * Connect is the script which merges all our social scripts.
 * It gives us the power to see which social services we have. 
 * And allows us to add and remove services.
 * All libraries are wrapped to separate the UI from the API logic.
 *
 * @author Andrew Dodson
 * @company Drew81.com
 *
 *	{
		init(callback)
		
		subscribe(event_name, callback)
			success: 
		
		login(callback)

		logout(callback)
		
		get(service, callback)
			
		post(service, data, callback)
	}
 */


var connect = new function(){

	/**
	 * Add our markup to the page
	 */
	var $ul = $('<ul class="connect selected" data-id="connect">'+
			'<div class="profile issignedin"><div class="networks"></div></div>'+
			'<span class="issignedout"><a class="signin">connect<\/a><\/span>' +
			'<div class="settings"><a class="invite">invite<\/a> <span class="issignedin">| <a class="signout">sign out<\/a></span></div>'+
			'<h2>members<\/h2>'+
			'<h2>comments<\/h2>'+
			'<form class="comment">'+
				'<input placeholder="insert comment"\/>'+
				'<button type="submit">Go<\/button>'+
			'<\/form>'+
		'<\/ul>'),
		
		//Default this is the current selected service which the user is signed into
		_default = null,
		
		// Comments left by users
		comments = [],
		
		// This
		self = this;

	/**
	 * Add social application to the right nav tabs
	 */
	$('nav.right ol:first')
		.append('<li class="connect social selected" data-id="connect">Connect<\/li>')
		.after($ul);
	
	/**
	 * niceDate
	 */
	function niceDate(d){
		var D = (new Date),
			T = D.getTime(),
			M = D.getMonth(),
			t = d.getTime(),
			m = d.getMonth(),
			months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');
		
		// older than a year, just show the year
		if( t < (T - 32e9) ){
			return d.getYear();
		}
		// older than a month, just show the month
		if( m != M && t < (T - 24192e5) ){
			return months[m];
		}
		// older than a week?
		if( t < (T - 6048e5)){
			return d.getDate() + ((m != M)?"/"+months[m]:'');
		}
		// older than a day?
		if( t < (T - 864e5)){
			return 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')[d.getDay()];
		}
		// yesterday?
		if( d.getDay()!==n.getDay()){
			return 'Yesterday';
		}
		// Older than an hour
		if( t < (T - 36e5)){
			return 'Today';
		}
		// return number of minutes
		return Math.round(( T - t )/(6e4));
	}
	
	/**
	 * AddComment
	 */
	function addComments(json){
		// Add messages to the page
		$.each(json, function(){
			// Insert After
			var insertAfter = $('ul.connect form');
			this.updated_time = (new Date(this.updated_time));

			// Where does this get inserted?
			for(var i=0,len=comments.length;i<len;i++){
				if( comments[i].updated_time.getTime() <= this.updated_time.getTime() ){
					// Get element to insertAfter
					if(i>0){
						insertAfter = comments[i-1].elem;
					}
					// Add to comments array
					comments.splice(i,0,this);
					break;
				} else if((i+1)===len){
					insertAfter = comments[i].elem;
					comments.push(this);
					i++
					break;
				}
			}
			if(len===0){
				comments.push(this);
			}

			comments[i].elem = $('<li class="comment"><img title="' + this.from.name + '" src="' + this.from.icon  + '"\/>' + this.message + ' <span class="date" title="'+this.updated_time+'">' + niceDate(this.updated_time) + "<\/span></li>")
				.insertAfter(insertAfter);
		});
	}
	
	/**
	 * Add Members
	 */
	function addMembers(json){
		var s = '';
		$.each( json, function(){
			s += "<li><img title='" + this.name + "' id='"+this.id +"' src='" + this.icon  + "'/><\/li>";
		});
		$ul.find('h2:contains(members)').after(s);
	}

	/**
	 * Adds a new service to the connect infrastructure.
	 * @param object
	 * @return
	 */
	this.networks = {};
	this.add = function(network,o){
		// Add the network to the list of networks
		this.networks[network] = o;

		// Ad the signin button to the list of services
		$(".networks").append('<div data-network="'+network+'"><button data-network="'+network+'"><img src="'+o.icon+'"/><span class="name">Connect with '+o.name+'</span><\/button><\/div>')

		// Subscribe to listen for the signed in trigger
		// This has to be set before we initiate the library
		o.subscribe("auth.login", function(json){
			// if the user is signed in.
			if( json.status === 'connected' ){
				// Set default network
				_default = network;
				// get the profile.
				o.get("profile", function(json){

					if(!json.name){
						return false;
					}
					$('.networks div[data-network='+network+']')
						.html('<img src="'+json.icon+'"\/><span class="name">'+json.name+'<\/span>')
						.removeClass('signin');
					log("Connected "+network);
					$ul.find('.issignedout').hide();
					$ul.find('.issignedin').css({display:"inline-block"}); 
				});

				o.signedIn = true;
				
				/**
				 * If contact-picker open
				 */
				if($('.contact-picker').length){
					getFriends($('.contact-picker').parent(),network);
				}
			}
			// if not signed in nowt
		});

		// Assign a callback
		// is the user signed into this network?
		o.init(function(){
			// Get messages
			o.get("comments", addComments);

			// Get Members
			o.get("members", addMembers);
		});
	};
	
	this.getDefault = function(){
		console.log(_default);
	};
	
	/**
	 * Get
	 */
	this.get = function(service, callback, network){
		for(var x in this.networks){
			if("get" in this.networks[x] && (!network || x === network ) ){
				this.networks[x].get(service, callback);
			}
		}
	};
	/**
	 * Post
	 */
	this.post = function(service, data, callback){
		for(var x in this.networks){
			if("post" in this.networks[x]){
				this.networks[x].post(service, data, callback);
			}
		}
	};
	/**
	 * Login
	 */
	this.login = function(network, cb){
		var o = self.networks[network]
			cb = cb || function(){};
		if(o.getSession()){
			cb();
		}
		else{
			o.login(cb);
		}
	};

	/**
	 * Add "live" EVENTS
	 * This is an object containing "selector event" = function
	 */
	jQuery.live({
		'button.signin,a.signin click' : function(){
			// Display a popup with the various services to connect to.
			var s = '',
				x,
				network=$(this).attr('data-network');

			if(!network){
				for( x in self.networks ){if(self.networks.hasOwnProperty(x)){
					s += '<button data-network="'+x+'" class="signin">'+x+'</button>';
				}}
				var $s = $('<div>'+s+'</div>');
				$.modal("Connect",$s);
			}
			else {
				self.networks[network].login();
			}
		},
		'.signout click' : function(){
			var x,
				network=$(this).attr('data-network'),
				a = ( network ? [network] : self.networks );

			for( x in a ){if(a.hasOwnProperty(x)){
				self.networks[x].logout();
			}};

			$(".connect").removeClass('signedin').addClass('signedout').removeClass('signingin');
		},
		'div.profile div.networks div click' : function(){
			var $p = $(this).parent().parent();
			if(!$p.hasClass("active")){
				$p.addClass("active");
			} else {
				$p.removeClass("active");
				var $el = $(this),
					$el2 = $(this),
					$par = $el.parent();

				self.login( $el.attr("data-network"), function(){
					$el2.remove();
					$par.prepend($el);
				});
			}
		},
		'body click' : function(event){
		    if (!$(event.target).closest('div.profile.active').length) {
		        $('div.profile.active').removeClass("active");
		    };
		},
		'li.members img click' : function(){
			return false;
		},
		'form.comment submit' : function(e){

			e.preventDefault();
			
			var msg = $('input', this).val();

			if(!_default){
				$ul.find('button.signin').trigger('click');
				return false;
			}
			else if( msg === '' ){
				return false;
			}

			self.post("comment", {
					message: msg,
					link : document.location.href
				}, function(r){
					if (!r || r.error) {
						log('Error occured');
					}
				});
				$('input', this).val('');
			
			return false;
		},
		'div.contact-picker button click' : function(){
			var b = $(this).hasClass('active');
			$(this)[(b?'remove':'add')+'Class']('active');
		},
		'div.invite .networks div[data-network] click' : function(){
			// is the user signed into the service?
			var network = $(this).attr('data-network'),
				$par = $(this).parents(".invite"); 

			self.login( network );
		},
		'input[name=all] click' : function(){
			$($(this).attr('data-target')).find("button")[($(this).attr("checked")?"add":"remove")+"Class"]("active");
		},
		'a.invite,button.invite click' : function(){

			// Invite people from your messenger connect list via email
			var $s = $("<div class='invite'><div class='column' style='width:20%;min-width:150px;'><h2>1 networks</h2>"+html_networks()+"</div><div class='column' style='width:45%;min-width:200px:'><h2>2 select contacts</h2><div><label>Select all <input type='checkbox' name='all' data-target='.contact-picker'/></label><label>Post to wall <input type='checkbox' name='wall'/></label></div><div class='contact-picker'></div></div><div class='column' style='width:20%;min-width:150px;float:right;'><h2>3 message</h2><div class='message'><b>Message:</b><br /><textarea placeholder='Message'>I think you'll like Toobify</textarea></div><button class='submit' type='submit'>Send Invite</button><div></form></div></div>").find("form").submit(function(){
				try{
					// store the ids in this list
					var a = [];
					
					if( $(this).siblings().find('.contact-picker .active').each(function(){
						a.push($(this).attr('data-id'));
					}).length === 0){
						alert("Please select a contact first");
						return false;
					}
					
					// post all the selected items
					self.post('message', {
							guid : a,
							message: $("textarea", this).val(), 
							link : document.location.protocol +'//'+ document.location.host
						},
						function(r){
							if (!r || r.error) {
								log('Error occured');
							}
						});
					
					$s.parents(".modal").find('h2').html("<h1>Successfully Sent</h1>");
					$s.slideUp(function(){$(this).html('');});
					setTimeout(function(){
						$s.parents(".modal").trigger('close');
					},3000);
				} catch(e){
					log(e);
				}
				return false;
			}).end();
			
			// get friends and append to the list
			getFriends($s);

			$.modal("Invite", $s);
			
			$s.find('.contact-picker').height($s.height()-200);
		}
	});

	function getFriends($s,network){
		self.get('friends', function(json){
			if(!json||json.error){
				return false;
			}
			var i=0,
				s='',
				a = json.sort(function(a,b){
					return (a.name.toLowerCase()>b.name.toLowerCase()? 1 :( a.name.toLowerCase()<b.name.toLowerCase() ? -1 : 0 ) );
				});

			for(;i<a.length;i++){
				s += '<button type="button" data-id="'+a[i].id+'" title="'+a[i].name+'"><img src="'+a[i].icon+'"/> <span class="name" >'+a[i].name+'</span></button>';
			}

			$s.find('.contact-picker').append(s);
		},network);
	}

	/**
	 * Get a list of networks
	 * This is used in all situations where we networks are listed.
	 */
	function html_networks(){
		return '<div class="networks">' + $('.networks').html() + '</div>';
	}
};