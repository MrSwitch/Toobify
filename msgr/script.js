/*********************************************************************
 * This script interacts with the DOM of the page it is loaded into.
 *
 * Dependent Files
 * ./token.php  	- locally hosted server side script to set cookies.
 * ./style.css 	- Styles HTML defined in this doc
 *
 * @author Andrew Dodson, andrew.j.dodson@gmail.com
 *
 * @since June 2010
 *********************************************************************/


/*********************************************
 * Object controls
 *
 *********************************************/

var msgr = {
	//---------------------------
	// MessegnerUser contains the current user session object
	user : null,
	appid: null,
	cred : {
		channelurl:'./msgr/channel.htm' ,
		callbackurl:window.location.href.replace(/#.*/, '').replace(/\/[^\/]*$/,'/')+'token.php' ,
		clientid:{
		'sandbox.knarly.local':'000000004403AD10',
		'sandbox.knarly.com':'000000004803E258',
		'toobify.appspot.com':'000000004403EA3B',
		'toobify.com':'0000000044039A0A'
		}[window.location.host.replace(/\:.*/,'')],
		scope:"WL_Contacts.View,WL_Profiles.View,WL_Activities.Update,Messenger.SignIn" ,
		onload:"msgr.auth"
	},
	
	loaded : false,
	mouseDown : false,
	resizeControl : false,
	prevEvent : false,

	init : function(){

		// Add MSGR application to the right nav tabs
		$('nav.right ol:first')
			.append('<li class="messenger" data-id="messenger">Messenger<\/li>')
			.after('<ul class="messenger social signedout" data-id="messenger">\
				<div class="isoffline">Signed out <button>Sign In</button><\/div>\
				<div class="issigningin">Signing in... <a href="javascript:void(0);">Problems signing in?<\/a><\/div>\
				<div class="issignedin profile"><img /><span class="name"></span> <a class="invite">invite<\/a> | <a class="signout">sign out<\/a><\/div>\
				<h2 class="nocontacts">No contacts online<\/h2>\
				<h2 class="comment">Comment<\/h2>\
				<form>\
					<input placeholder="insert comment"\/>\
					<button type="button">Go</button>\
				<\/form>\
			</ul>');
		// Check whether we think the user is signed in or not
		if( document.cookie.match(/wl_internalState=/) ){
			// YES the user could be signed in... load the libraries and make further checks
			msgr.loadlib();
		}
		else{
			// listen out for a change, chrome doesn't support window.opener for some reason
			
			if("sessionStorage" in window){
				var i = setInterval(function(){
					if(msgr.loaded||sessionStorage.msgrconsentcompleted){
						if(!msgr.loaded)
							msgr.loadlib();
						window.clearInterval(i);
					}
				},1000);
			}
		}
		
		/**
		 * Bind all events listeners to this Widget
		 */
		var x,m;
		for( x in this.EVENTS ){
			m = x.match(/(.* )?([a-z]+)$/);
			$(m[1]||window)[m[1]?'live':'bind'](m[2], this.EVENTS[x]);
		}
	},
	/*******************************
	 * EVENTS - SHOUT CONTROLS
	 * Attach events to the Widget
	 *******************************/
	EVENTS : {
		'hashchange'	: function(){
			if(!msgr.user||msgr.user.get_status()===0) return;
			msgr.broadcastIWatch();
		},
		'ul.messenger .issigningin a, ul.messenger .isoffline button click' : function(){
			document.cookie = 'wl_accessTokenExpireTime=; path=/;';
			log("Click",msgr.user);
			if(!msgr.user||msgr.user.get_status()===0){
				// OAUTH_WRAP query parameters
				var w = 465, h = 380, l = (screen.width/2)-(w/2), t = (screen.height/2)-(h/2);
				window.open('https://consent.live.com/connect.aspx?wrap_client_id='+msgr.cred.clientid+
						'&wrap_callback='+encodeURIComponent(msgr.cred.callbackurl+'?callback=msgr.loadlib')+
						'&wrap_scope='+msgr.cred.scope
						, 'Signin', 'width='+w+',height='+h+',resizeable,scrollbars,top='+t+',left='+l+'');
			} else {
				Microsoft.Live.App.signOut();
			}
		},
		'ul.messenger .signout click' : function(){
			// sign out
			Microsoft.Live.App.signOut();
		},
		'ul.messenger .invite click' : function(){
			// Invite people from your messenger connect list via email
			var subject = msgr.username +" invites you to take a look at toobify.com",
				copy = "I've joined Toobify and think you'll be interested in it as well. To take a look, follow the link: http://toobify.com/\n\n";

			var $s = $("<form class='invite'><div class='left contact-picker'>Loading...</div><div class='right'><h3>Steps</h3><ol><li>Select one or more users on the left</li><li>Add your message below</li></ol><div class='message'><b>Subject:</b> " +subject+"<br/><b>Message:</b> "+copy+"\n<textarea placeholder='Message'></textarea></div><button class='submit' type='submit'>Send Invite</button><div></form>").submit(function(){
				try{
					var a=[];
					$(".contact-picker .active",this).each(function(){
						a.push($(this).attr('data-cid'));
					});
					if(a.length===0){
						alert("Please select a contact first");
						return false;
					}
					var invite = Microsoft.Live.$create_EmailInvitation(msgr.username, subject, copy + $("textarea", this).val(), a),
						invitations = [invite];
					Microsoft.Live.App.get_dataContext().sendInvitations(invitations, function(e){
						$s.parents(".modal").find('h2').html(((e.get_resultCode() === Microsoft.Live.AsyncResultCode.success)?"Successfully Sent":"Whoops failed"));
						$s.slideUp(function(){$(this).html('')});
						setTimeout(function(){
							$s.parents(".modal").trigger('close');
						},3000);
					});
				} catch(e){
					$s.html("<h1>"+((e.get_resultCode() === Microsoft.Live.AsyncResultCode.success)?"Successfully Sent":"Whoops SMEF")+"</h1>");
				}
				return false;
			});
			var j=0;
			(function loadContacts(){
				msgr.getContacts({'$filter':'IsFriend eq true'}, function(d){
					var s='';
					if(!d){
						s="Failed to load contacts... trying again... " + (++j);
						if(j<3)
							loadContacts();
						else 
							s="Whoops! we have encountered an SMEF!";
					}
					else {
						var a=[];
						for(var i=0;i<d.get_length();i++){
							a.push({cid:d.get_item(i).get_cid(),thumb:d.get_item(i).get_thumbnailImageLink(),name:(d.get_item(i).get_formattedName()||d.get_item(i).get_title())})
						}
						a = a.sort(function(a,b){
							return (a.name.toLowerCase()>b.name.toLowerCase()? 1 : ( a.name.toLowerCase()<b.name.toLowerCase() ? -1 : 0 ));
						});
						for(var i=0;i<a.length;i++){
							s += '<button type="button" data-cid="'+a[i].cid+'" title="'+a[i].name+'"><img src="'+a[i].thumb+'"/> <span class="name" >'+a[i].name+'</span></button>';
						}
					}
					$s.find('.contact-picker').html(s)
				});
			})()
			
			$.modal("Invite", $s);
		},
		
		'div.contact-picker button click' : function(){
			var b = $(this).hasClass('active');
			$(this)[(b?'remove':'add')+'Class']('active');
		},

		/**
		 * CONTACTS
		 */
		// START CONVERSATION
	  	'ul.messenger li a.name click' : function(){
			// Start new conversation?
			$li = $(this).parent('li');
			$li[($li.hasClass('selected')?'remove':'add')+'Class']('selected').removeClass('hello');
			
			$li.find('.ConversationControl')['slide'+($li.hasClass('selected')?'Down':'Up')]();
			
			if($li.find('.ConversationControl').length === 0){
				try{
					msgr.chat(msgr.contactFromHTMLList(this)
						/* ,"Hey "+$li.find('.name').text()+"\nI'm currently watching " + $('h1').html() + " and would like to share it with you: " 
						+ window.location.href	*/
					);
				} catch(e){}
			}
			return false;
	  	},
	  	// WATCH WHAT THEY'RE WATCHING
		'ul.messenger li a.watching click' : function(e){
		},
		// DELETE
		'ul.messenger li a.close click' : function(){
			msgr.user
				.get_conversations()
				.create(msgr.contactFromHTMLList(this));
		},
		
		/**
		 * Resize
		 */
		'ul.messenger .ConversationInputControl button.rh mousedown' : function(e){
			msgr.mouseDown = $(this).parents('div.ConversationControl').find('div.ConversationControl_Content').height();
			msgr.prevEvent = e || window.event;
			msgr.resizeControl = this;
		},
		'body mousemove' : function(e){
			e = e || window.event;
			if(!msgr.mouseDown) return;
			$(msgr.resizeControl).parents('div.ConversationControl').find('div.ConversationControl_Content').height( (msgr.mouseDown - (msgr.prevEvent.pageY - e.pageY)) +'px' );
		},
		'nav mouseup' : function(e){
			msgr.mouseDown = msgr.prevEvent = msgr.resizeControl = null;
		},
		'ul.messenger > form button click' : function(){
			$(this).parent().trigger("submit");
		},
		'ul.messenger > form submit' : function(){
			if(!$('ul.messenger').hasClass('signedin')){
				$('ul.messenger .isoffline button').trigger('click');
			} else if($('input', this).val()!=''){
				msgr.postActivity( "Commented",
					$('input', this).val(),
					function(){ /*Update the list?*/ }
				);
				$(this).after("<li>Me: "+$('input', this).val()+"</li>");
				$('input', this).val('');
			}
			return false;
		}

	},


	/********************************************* 
	 * Load Lib
	 * This is triggered when a consent token is found
	 *********************************************/

	loadlib : function(bool){

		/**
		 * We may at this point want to reinitate the authentication... if the user has hit the signout
		 */
		$('ul.messenger')
			.removeClass('signedout')
			.addClass('signingin').find('.issigningin a').fadeIn(3000);
		
		if(msgr.loaded){
			msgr.auth();
			return;
		}
		$.getScript( "http://js.live.net/4.1/loader.js", function(){
			Microsoft.Live.Core.Loader.load(["microsoft.live", "messenger.ui", "microsoft.live.services"], function (e) {
				if(msgr.loaded)
					return;
				msgr.loaded = true;
				Microsoft.Live.App.initialize(msgr.cred);
			});
		});
		// CHROME FIX, loading the libraries in the above method does not trigger Microsoft.Live.App.initialize
		setTimeout(function(){
			if(!msgr.loaded){
				msgr.loadlib(true);
			}
		},(!bool?5000:30000));
		
	},

	/**********************************************************
	 * INITIATION
	 * This is defined in the <msgr:app> tag we previously dynamically created
	 * method to call on authentication of a user
	 **********************************************************/
	auth : function(e){
		//--------------------------------------------
	    // Set the sign in completed event
		// register for notifications when auth state changes
		var auth =  Microsoft.Live.App.get_auth();
		log('appLoaded',auth.get_state());

		// Set Display
		var messengerContext = Microsoft.Live.App.get_messengerContext();
		messengerContext.add_propertyChanged(function(sender, args){
			if(args.get_propertyName() == 'user'){
				log('property changed', auth.get_state() == Microsoft.Live.AuthState.authenticated ? "authenticated" : "unauthenticated" );
				if( (auth.get_state() == Microsoft.Live.AuthState.authenticated ) 
					&& ( msgr.user = Microsoft.Live.App.get_messengerContext().get_user() ) !== null ){
					msgr.appid = msgr.user.get_localEndpoint().get_applicationId();
					msgr.user.add_signInCompleted(msgr.signin);
				}
			}
		});
	},


	/****************************************************************************
	 * SIGNIN EVENT
	 * Triggered when the userOnSignedIn event is triggered
	 ****************************************************************************/
	signin : function(sender, e) {
		log("User signed in, status", msgr.user.get_status());
		$('ul.messenger').addClass('signedin').removeClass('signingin').removeClass('signedout');
		
		//
		// Load Profile
		msgr.getProfile(function(d,i){
			if(!d){
				log("Re-Loading Profile "+i);
				return;
			}
			msgr.username = d.get_profile().get_firstName();
			$('ul.messenger .profile .name').text( d.get_profile().get_firstName() );
			$('ul.messenger .profile img').attr( 'src',  d.get_profile().get_thumbnailImageLink() );
		});

		// Get application messages from contacts
		msgr.getContactsActivities({$filter:"ApplicationId eq '"+msgr.cred.clientid+"'"}, function(d){
			if($('ul.messenger li.comment').length){
				return;
			}
			for(var i=0;i<d.items.length;i++){
				var a = (d.items[i].resource.ActivityObjects[0].TargetLink);
				if(a){
					a = '<a href="'+a+'" class="watching">'+(channel(a).title||a)+"</a>";
				}
				$el = $('<li class="comment"><span class="name">'+d.items[i].resource.ActivityActor.DisplayName+'</span> <span class="comment">'+d.items[i].resource.ActivityObjects[0].Description+'</span> '+a+'<\/li>').appendTo('ul.messenger');
			}
		});

		//--------------------------------------------
		// BROADCASTING CONTROL
		// Set presence factory defaults for broadcasting data to other members
		msgr.user.set_presenceFactory(new PresenceFactory());

		//--------------------------------------------
		// Event - Status
		msgr.user.add_signedIn(msgr.signin);
		msgr.user.add_signedOut(msgr.signout);
		//msgr.user.add_signedOutRemotely(msgr.signout);

		//--------------------------------------------
		// Get online contacts
		// 
		// LISTEN to BROADCASTS
		// For the contacts list
		// Tune in to each contacts broadcasts
		msgr.user.get_onlineContacts().add_collectionChanged(msgr.contactsChanged);
		msgr.user.get_offlineContacts().add_collectionChanged(msgr.offlineContactsChanged);

		//--------------------------------------------
		// AUTO INITIATE CONVERSATIONS 
		// Either the conversation begun on another page load
		// Or initiated by a contact
		msgr.user.get_conversations().add_collectionChanged(msgr.conversationChanged);
	},


	/****************************************************************************
	 * SIGNOUT EVENT
	 * Triggered when a user hits the "Signout from here" link in their 'status' on the top-bar
	 ****************************************************************************/
	signout : function(sender,e) {

		log('Signed out - '+(e&&e.get_reason?
			['locally','remotely','connection lost','server error','endpoint limit exceeded'][e.get_reason()]
			:'Unknown'),
			e.get_reason()
		);
		log("User status" + msgr.user.get_status());

		switch (e.get_reason ? e.get_reason() : -1) {
			case 0://SignedOutByLocalEndpoint
			case 1://signedOutByRemoteEndpoint
				log("Logout");
				Microsoft.Live.App.signOut();
				break;
			case 2://connectionLost
			case 3://serverError
				log("Try to resignin");
				return;
		//		$('button.messenger').trigger('click');
				break;
			case 4://endpointLimitExceeded
			default:
				break;
		}	    
		
		// Set Display
		$('ul.messenger').addClass('signedout').removeClass('signingin').removeClass('signedin');
		
		// Remove the user
		//msgr.user = null;
	},

	
	/**
	 * Contacts Changed
	 */
	contactsChanged : function(sender,e){
		var that = this;
		// FIND IF THIS CONTACT IS IN THE SAME APPLICATION
		if(!e.get_newItems()) return false;

	    // Loop through new contacts
	    for( var i=0, contacts=e.get_newItems(); i < contacts.length; i++ ){

	    	// Add the user to the list of messenger contacts for the "Share control"
	    	msgr.contact(contacts[i]);

			(function(i){
				// Loop through the users 
				var endpoints = contacts[i].get_currentAddress().get_endpoints();
				endpoints.add_collectionChanged((function self(endpoints, e){
					for (var j = 0, count = endpoints.get_count(); j < count; j++) {
						log("??listen", endpoints.get_item(j).get_applicationId());
						if ((endpoints.get_item(j)).get_applicationId() == msgr.appid) {

							log("?listen");
							var extensions = endpoints.get_item(j).get_presence().get_extensions();
							var extension = null;
							extensions.add_collectionChanged((function self(extensions, e){
								log("Listen:");
								log(extensions);
								if ((extension = extensions.get_item('watch')) != null) {
									msgr.listen('watch', extension.get_content(), contacts[i]);
								}
								return self;
							})(extensions, null));
						}
					}
					return self;
				})(endpoints, null));
			})(i);
	    }
	},
	
	/**
	 * Offline contacts changed
	 */
	offlineContactsChanged : function(sender, e){
		if(!e.get_newItems()) return false;
	    // Loop through new contacts
	    for( var i=0, contacts=e.get_newItems(); i < contacts.length; i++ ){
	    	if(contacts[i].get_cid){
				$('ul.messenger li.'+contacts[i].get_cid())
					.addClass('offline');
			}
	    }
	},

	/**
	 * Conversations Changed
	 */
	conversationChanged : function(sender, e){
	    // Loop through additional conversations
	    for (var i = 0, cid, conv = e.get_newItems(); i < conv.length; i++) {
			// log('conv',conv[i].get_history().get_lastReceived());
		    // Do not trigger if started by the Session User... otherwise we make redundant requests
	    	if(msgr.user.get_address().get_cid() != conv[i].get_creator().get_cid()){
	    		msgr.chat(msgr.contact(conv[i].get_creator().get_contact()),false);
	    	}
	    }
	},

	/******************************************************************************
	 * ADD TO LIST OF CONTACTS, WHICH CAN BE ADDED TO LIST OF player CONTACTS
	 ******************************************************************************/
	contact : function (contact){
		var cid = contact.get_cid(), 
			$el = (cid?$('ul.messenger li.'+cid):null),
			name = Microsoft.Live.Messenger.MessengerUtility.emoticonEncode(contact.get_displayName());

		if(!cid || !contact.get_displayName()){
			return;
		}

		// Does this contact already exist in our contacts list?
		if( $el.length === 0 ){
			$el = $('<li class="'+cid+' contact"><a class="name" href="javascript:void(0);"><\/a><a class="watching"><\/a><\/li>').insertAfter('ul.messenger .nocontacts');
		}
		// We have contacts
		$('ul.messenger .nocontacts').html($('ul.messenger li.contact').length + " online contacts");

		// ADD name
		$('.name', $el).html('').append(name);
		$el.removeClass("offline");
		// Broadcast your current playing item
		msgr.broadcastIWatch();
		
		return contact;
	},

	/**
	 * Takes a list elements and extracts the className portion which contains the CID value.
	 * Pass this too the contact element to ensure we have a contact in our main conversations window
	 * Then returns the Contact object
	 */
	contactFromHTMLList : function(el){
		return msgr.contact(msgr
							.user
							.get_onlineContacts()
							.findByCid(el.parentNode.className.match(/-?[0-9]+/)[0]));
	},

	/******************************************************************************
	 * CONVERSATION CONTROL
	 * When a user is clicked to start a new conversation, it passes a click event.
	 * This is also used to automatically send a message to a user
	 *
	 * @param e (Messegner Contact [object] || cid value [scalar] )
	 * @param msg (Message to send to the user || Open conversation window [boolean] )
	 * @return null
	 ******************************************************************************/
	chat : function(contact, msg){

		var cid = contact.get_cid(),
			$li = $('ul.messenger li.'+cid);

		// Is this a new conversation?
		if(!$li.find('.ConversationControl').length){
			// Start conversation
			$create(Microsoft.Live.UI.Messenger.ConversationControl,{
					cid:cid,
					displayPicturesEnabled:false
				},{
					messageReceived:msgr.received
				},
				{},
				$li[0]
            );

            // change the size of the writing area to contain what the user is typing
            // var cid = "-6100509045297137957";
			$($li.find('.ConversationControl iframe')[0].contentWindow.document).keydown(function() {
				var $box = $li.find('.ConversationControl .ConversationInputControl_TextBox');
//					console.log(this.body.scrollHeight, $box.height());
				if( ($box.height()>this.body.scrollHeight) && this.body.scrollHeight < 75 ){
//					console.log(this.body.scrollHeight+'px');
					$li.find('.ConversationControl .ConversationInputControl_TextBox').animate({height:this.body.scrollHeight+'px'}, 'fast');
				}
			});
			$('<button class="rh resize"></button>').insertAfter($li.find('.ConversationInputControl_Toolbar'));
	
		}

		$li.addClass("selected");
//			.append('<div class="paneltools"><div class="min">_</div><div class="max">&#9776;</div><div class="close">X</div></div>');

		//--------------------------------------------
		// SEND MESSAGE - `msg`
		// Has the user passed a message to share with the user?
		// e.g. msgr.chat(cid, "Ah-hoy there");
		//--------------------------------------------
		if(typeof(msg) === 'string'){
			try{
				msgr.user
					.get_conversations()
					.create(contact)
					.sendMessage(new Microsoft.Live.Messenger.TextMessage(msg));
			}catch(e){log(e);}
		}

		return;
	},
	
	/**
	 * Triggered when an incoming conversation message is recieved
	 */
	received : function(sender, e){
		// Add .hello to the contacts list item
		$('ul.messenger li.'+e.get_message().get_sender().get_cid()+':not(.selected)')
			.addClass("hello");
	},
	
	/******************************************************************************
	 * BROADCASTING
	 * @param channel String Title of the channel, this is used to identify the communication
	 * @param data Mixed
	 ******************************************************************************/

	broadcast : function( channel, data ){
		log('BROADCAST',channel,data);

		msgr.user
			.get_localEndpoint()
			.get_presence()
			.get_extensions()
			.add(new PresenceExtension(channel, data));
	},

	broadcastIWatch : function(){
		if(!channel().id){
			return false;
		}
		msgr.broadcast('watch',{
			title:		channel().title || $('h1').html(),
			url:		window.location.href,
			timestamp:	(new Date()).getTime()
		});
	},

	//--------------------------------------------
	// Listen
	// The trigger defined in the msgr.auth sets this off
	// @param string Channel a shared reference to identify the communication
	// @param Mixed Data mixed JSON
	// @param contact A Messenger Live contact object
	listen : function(channel,data,contact){
		log('HEARD:',channel,data,contact);
		var $contact = $('ul.messenger .'+contact.get_cid());
		switch(channel){
			case 'watch' :
				// Update what your friends are watching
				// Broadcasted information about what your friends are watching.
				// Update contacts stuff about what they are watching
				$('.watching', $contact).attr({
					title: contact.get_displayName() + ' is watching: ' + data.title,
					href:	data.url
				}).html(data.title);
			break;
		}
	},
	
	
	getContacts : function(opts,callback){
		this.get('contacts',opts,callback);
	},
	getProfile : function(callback){
		this.get('profile',{},callback);
	},
	getContactsActivities : function(opts,callback){
		this.get('contactsActivities',opts,callback);
	},
	
	get : function(type,opts,callback,i){
		// Have we got options?
		if(typeof(opts)==='function'){
			callback=opts;
			opts={};
		}
		var self=this;
		i=i||0;
		Microsoft.Live.App.get_dataContext().load(Microsoft.Live.DataType[type], opts, function(e){
			if (e.get_resultCode() !== Microsoft.Live.AsyncResultCode.success) {
				if(i<3)
					self.get(type,opts,callback,++i);
				callback(false,i);
				return;
			}
			var d = e.get_data();
			(function next(){
				if( d.hasNextPage() ){
					d.loadNextPage(next);
				}
				else {
					callback(d);
				}
			})()
		});
	},
	
	// Post a link to the current page being watched.
	postActivity : function(title, desc, callback){
		// Get the activities resource
		this.get('myActivities',{},function(d){
			// Add the Activity Object to the Activity Template
			var a = new Microsoft.Live.Services.AddBookmarkActivity(
				[(new Microsoft.Live.Services.BookmarkActivityObject(window.location.href,title, desc))], 
				window.location.href);
			a.set_applicationLink(window.location.href);

			// Add the completed Activity to the Activity Resource
			d.add(a);
			d.save(function(e){
				callback(e.get_results()[0].get_resultCode() === Microsoft.Live.AsyncResultCode.success);
			});
        });
	}
}


/***************************************************************
 * Presence Extension
 ***************************************************************/

function PresenceExtension(name, content){
    this.name = name; 
    this.content = content;
}
PresenceExtension.prototype = {
	get_name : function() {
	    return this.name;
	},
	get_content : function() {
		log("Content",this.content);
	    return this.content;
	},
	set_content : function (newcontent){this.content = newcontent;}
}

function PresenceFactory(){
}
PresenceFactory.prototype = {
	serialize: function(prop){
		// by default we're gonna put more info in.
		log('serialize',prop);
		return JSON.stringify(prop.get_content());
	},
	deserialize: function(channel,data){
		log('deserialize',channel,data);
		if(data==null||data=='')
			return;
		try{
			data = (/^\{.*\}$/.test(data)?JSON.parse(data):data);
		}catch(e){
			log('Could not parse JSON', data);
		}
		return new PresenceExtension(channel,data);
	}
};


// EOF SCRIPT
msgr.init();