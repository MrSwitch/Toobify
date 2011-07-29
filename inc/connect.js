/**
 * Social JS
 * This attaches social tools for the user to signin to a service of their choice.
 * And seemlessly be able to post in a generic form to anyone of their desired networks.
 * 
 * This shall work with:
 * LX: My library for Messenger Connect
 * FB: Facebooks library
 * Friend Connect: The opensocial aggregator (inclues twitter, google)
 */

(function(){

var comments = [],
	$ul = false,
	connect = {

	// Google Friend Connect ID
	gfc	:	{
		loggedin : false,
		id : {'sandbox.knarly.com':'10922289347407527576',
				'sandbox.knarly.local':'12249073376194964461',
				'toobify.appspot.com':'01878999487682637238',
				'toobify.com':'09069002496516642031'
		}[window.location.host],
		init : function(){
			var self = this;
			// Get a list of all the memebers on the site
			// add to the List
			// location of rpc_relay.html and canvas.html
			google.friendconnect.container.setParentUrl('/api/');
			google.friendconnect.container.initOpenSocialApi({ 
				site: connect.gfc.id,
				onload: function() { 
					var p = {},
						req = opensocial.newDataRequest(),
						idspec = new opensocial.IdSpec({'userId' : 'OWNER', 'groupId' : 'FRIENDS'}),
						o = opensocial.Person.Field;
		
					p[opensocial.DataRequest.PeopleRequestFields.PROFILE_DETAILS] = [o.ID,o.NAME,o.THUMBNAIL_URL,o.PROFILE_URL];
					
					req.add(req.newFetchPersonRequest(
						'VIEWER', p), 
						'viewer');
					req.add(req.newFetchPeopleRequest(
						idspec, p), 
						'ownerFriends');
	
					req.add(req.newFetchActivitiesRequest(
						idspec),
						'activities');
	
					req.send(function(data){
						// Display a list of members
						var s='';
						$.each( data.get('ownerFriends').getData().asArray(), function(i){
							if(i>10){return;}
							if(!document.getElementById(this.getField("id"))){
								s += "<li><img title='" + this.getField("displayName") + "' id='"+this.getField("id")+"' src='" + this.getField("thumbnailUrl")  + "'/><\/li>";
							}
						});
						$('nav.right ul.connect h2:contains(members)').after(s);
	
						// Is the current user signed in?
						var viewer = data.get('viewer').getData();
						if(viewer){
							$('ul.connect div.profile').html('<img src="' + viewer.getField("thumbnailUrl") + '">\
								<span class="name"> ' +  viewer.getField("displayName") + '</span> \
								<a class="settings">Settings</a> | \
								<a class="invite">Invite</a> | \
								<a class="signout">signout</a>');

							self.loggedin = true;
							$('ul.connect').addClass('signedin').removeClass('signedout').removeClass('signingin');
							// if the user has something waiting to post, send it.
							$('ul.connect form').submit();
						}
						// Add activties
						self.activities(data);
					});
				}
			});
		},
		activities : function(data){
			// Is the current user signed in?
			if(data.get('activities')){
				$.each(data.get('activities').getData().asArray(), function(i){
					connect.addComment({
						author : this.getField("userName"),
						picture	: this.getField("userThumbnailUrl"),
						message : this.getField('title', {escapeType: 'none'}),
						date : (this.getField('updated', {escapeType: 'none'}) || "").replace(/T.*$/,'')
					});
				});
			}
		},
		refreshActivity : function(){
			var req = opensocial.newDataRequest(),
				idspec = new opensocial.IdSpec({'userId' : 'OWNER', 'groupId' : 'FRIENDS'});
	
			req.add(req.newFetchActivitiesRequest(
				idspec),
				'activities');
			req.send(connect.gfc.activities);
		}
	},
	
	// Face Book ID
	fb	: {
		loggedin : false,
		id : {
			'sandbox.knarly.local' : '4d959abe58d5ff31272ce19efa539d7b',
			'sandbox.knarly.com' : '98fd1a536c2bbe1a69a5f8a451c3b20f',
			'toobify.com' : '237ec0c5eb831e70781358164b99b820',
			'appspot.toobify.com' : '7c62cc9c99b94f8a5d99bfeafc5e1056'
		}[window.location.host],
		appid : {
			'sandbox.knarly.local' : '359288236870',
			'sandbox.knarly.com' : '166008711508',
			'toobify.com' : '175720269105905',
			'appspot.toobify.com' : '108884335847725'
		}[window.location.host],

		AsyncInit : function() {
			$('body').append('<div id="fb-root"></div>');
			FB.init({appId: connect.fb.id, status: true, cookie: true, xfbml: false});
			FB.Event.subscribe('auth.login', function(response){
				log(response);
				connect.fb.auth();
			});
			FB.getLoginStatus(function(json){
				if(json.status === 'connected')
					connect.fb.auth();
			});
		},
		auth : function(){
			$(".connect").addClass('signedin').removeClass('signedout').removeClass('signingin');
			this.loggedin = true;
			FB.api('/me', function(json) {
				if(json.error)
					return;
				$(".connect .profile .name").html(connect.fb.username = json.name);
				$(".connect .profile img").attr('src','http://graph.facebook.com/'+json.id+'/picture');
			});
		},
		msgs: function(){
			FB.api('/'+connect.fb.appid+'/feed',function(response){
				$.each(response.data, function(i){
					connect.addComment({
						author : this.from.name,
						picture	: 'http://graph.facebook.com/' + this.from.id + '/picture',
						message : this.message,
						date : this.updated_time.replace(/T.*$/,'')
					});
				});
			});
		}

	},

	// Messenger Connect - LiveX
	lx : {
		loggedin : false,
		id :{
			'sandbox.knarly.local':'000000004403AD10',
			'sandbox.knarly.com':'000000004803E258',
			'toobify.appspot.com':'000000004403EA3B',
			'toobify.com':'0000000044039A0A'
		}[window.location.host],
		init : function(){
			LX.init({
				channelUrl : "./lx/xd.htm",
				callbackUrl : "./lx/token.php",
				clientId : this.id
			});
			LX.getSession(function(	o ){
				if(o&&o.signedIn){
					connect.lx.auth();
				}
			});
		},
		auth : function(){
			// Make requests to get the activities posted from the users friends.
			this.loggedin = true;
			LX.api('Activities/ContactsActivities[ApplicationId='+this.id+']', function(json){
				log("Contacts Activities", json);
			});

			// Profiles
			LX.api('Profiles', function(json){
				$(".connect").addClass('signedin').removeClass('signedout').removeClass('signingin');
				$(".connect .profile .name").html(connect.lx.username = json.Entries[0].FirstName + ' ' + json.Entries[0].LastName);
				$(".connect .profile img").attr('src',json.Entries[0].ThumbnailImageLink);
			});
		}
	},

	/**
	 * Add the tab to the right menu, including forms
	 * Prepopulate by connecting to each of the services and accessing the Public API, and contacts/messages stored against this domain
	 * Add messages to the social pannel
	 * Attach events to the form controls.
	 */
	init : function(){

		$ul = $('<ul class="connect social selected signedout" data-id="connect">\
				<div class="isoffline">Signed out <button>Sign In</button><\/div>\
				<div class="issigningin">Signing in... <a href="javascript:void(0);">Problems signing in?<\/a><\/div>\
				<div class="profile"><img /><span class="name"></span> <a class="invite">invite<\/a> | <a class="signout">sign out<\/a><\/div>\
				<h2>members</h2>\
				<h2>comments</h2>\
				<form>\
					<input placeholder="insert comment"\/>\
					<button type="submit">Go</button>\
				<\/form>\
			</ul>')

		// Add social application to the right nav tabs
		$('nav.right ol:first')
			.append('<li class="connect social selected" data-id="connect">Connect<\/li>')
			.after($ul);

		// Bind all events listeners to this Widget
		var x,m;
		for( x in this.EVENTS ){
			m = x.match(/(.* )?([a-z]+)$/);
			$(m[1]||window)[m[1]?'live':'bind'](m[2], this.EVENTS[x]);
		}

		// Load in the libraries that this script requires and iniitate the load
		// GFC
		$.getScript("http://www.google.com/friendconnect/script/friendconnect.js?key=notsupplied&v=0.8", function(){
			connect.gfc.init();
		});

		// Assign the callback
		window.fbAsyncInit = this.fb.AsyncInit;

		// FC
		$.getScript(document.location.protocol +'//connect.facebook.net/en_US/all.js', function(){
			connect.fb.msgs();
		});

		// Sandbox LiveX
		$.getScript('http://sandbox.knarly.com/mslivelabs/livex/js/lx.js', function(){
			connect.lx.init();
		});
	},
	
	/**
	 * Events
	 */
	EVENTS : {
		'ul.connect .isoffline button click' : function(){
			// Display a popup with a dialogue displaying on the left the services that you may connect to.
			var $s = $('<div><button class="facebook">Facebook</button><button class="windowslive">Windows Live</button><button class="friendconnect">Google, Twitter, etc...</button></div>');
			
			$s.find('button.facebook').click(function(){
				FB.login(connect.fb.auth,{perms:'read_stream,publish_stream'});
			});
			$s.find('button.windowslive').click(function(){
				LX.login(connect.lx.auth);
			});
			$s.find('button.friendconnect').click(google.friendconnect.requestSignIn);
			$s.find('button.friendconnect').click(function(){
				$s.parents(".modal").trigger("close");
			});

			$.modal("Connect",$s);
		},
		'ul.connect .profile .signout click' : function(){
			FB.logout();
			LX.logout();
			google.friendconnect.requestSignOut();
			$(".connect").removeClass('signedin').addClass('signedout').removeClass('signingin');
		},
		'ul.connect .profile .settings click' : function(){
			google.friendconnect.requestSettings();
			return false;
		},
		'ul.connect .profile .invite click' : function(){
			google.friendconnect.requestInvite("Check it out!");
			return false;
		},
		'ul.connect li img click' : function(){
			google.friendconnect.showMemberProfile($(this).attr('id'));
		},

		'ul.connect form submit' : function(e){
			e.preventDefault();
			
			if(!$ul.hasClass('signedin')){
				$ul.find('.isoffline button').trigger('click');
			} else if($('input', this).val()==''){
				return false;
			}
			
			// Comment to facebook
			if(connect.fb.loggedin){
				var msg = $('input', this).val();
				FB.api('/'+connect.fb.appid+'/feed',
					'post',
					{
						message: msg,
						link : document.location.href
					},
					function(response){
						if (!response || response.error) {
							log('Error occured');
						}
						else{
							setTimeout(connect.fb.msgs,3000);
						}
					}
				);
				$('input', this).val('');
			}

			return false;
		},
		'div.contact-picker button click' : function(){
			var b = $(this).hasClass('active');
			$(this)[(b?'remove':'add')+'Class']('active');
		},
		'ul.connect .profile .invite click' : function(){
			// Invite people from your messenger connect list via email
			var $s = $("<form class='invite'><div class='left contact-picker'>Loading...</div><div class='right'><h3>Steps</h3><ol><li>Select one or more users on the left</li><li>Add your message below</li></ol><div class='message'><b>Message:</b><br /><textarea placeholder='Message'>I think you'll like Toobify</textarea></div><button class='submit' type='submit'>Send Invite</button><div></form>").submit(function(){
				try{
					if( $(".contact-picker .active",this).each(function(){
						FB.api('/'+$(this).attr('data-id')+'/feed', 'post', 
							{
								message: $("textarea", this).val(), 
								link : document.location.protocol +'//'+ document.location.host
							}, 
							function(response) {
								if (!response || response.error) {
									log('Error occured');
								}
							});
					}).length === 0){
						alert("Please select a contact first");
						return false;
					}
					$s.parents(".modal").find('h2').html("<h1>Successfully Sent</h1>");
					$s.slideUp(function(){$(this).html('')});
					setTimeout(function(){
						$s.parents(".modal").trigger('close');
					},3000);
				} catch(e){
					log(e);
				}
				return false;
			});
			var j=0;
			(function loadContacts(){
				FB.api("/me/friends", function(json){
					var s='';
					if(json.error){
						s="Failed to load contacts... trying again... " + (++j);
						if(j<3)
							loadContacts();
						else 
							s="Whoops! we have encountered an SMEF!";
					}
					else {
						var a = json.data.sort(function(a,b){
									return (a.name.toLowerCase()>b.name.toLowerCase()? 1 :( a.name.toLowerCase()<b.name.toLowerCase() ? -1 : 0 ) );
								});
						for(var i=0;i<a.length;i++){
							s += '<button type="button" data-id="'+a[i].id+'" title="'+a[i].name+'"><img src="http://graph.facebook.com/'+a[i].id+'/picture"/> <span class="name" >'+a[i].name+'</span></button>';
						}
					}
					$s.find('.contact-picker').html(s)
				});
			})()
			
			$.modal("Invite", $s);
		}
	},
	
	addComment : function(p){
		var s = JSON.stringify(p);
		if($.inArray(s,comments)>-1) return;

		$('<li class="comment"><img title="' + p.author + '" src="' + p.picture  + '"/>' + p.message + ' <span class="date">' +p.date + "</span></li>")
			.insertAfter('ul.connect form')
			.hide()
			.css({opacity:0})
			.slideDown()
			.animate({opacity:1}, 'slow');
		
		comments.push(s);
	}
}


	connect.init();

//window.connect = connect;
})();
