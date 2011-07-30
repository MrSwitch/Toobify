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


connect.add('messenger', new function(){

	var listeners = {},
		session = false;


	// Properties
	this.icon = "http://img.wlxrs.com/$Live.SN.MessengerBadge/icon16wh.png";
	this.name = "Windows Live";

	/******************************************
	 * Onload 
	 * 
	 * What to trigger once this has been added to connect
	 ******************************************/

	this.init = function(callback){
	
		// Set the onload callback
		window.mcAppOnLoad = function(){

			var auth =  Microsoft.Live.App.get_auth();

			// Add property
			auth.add_propertyChanged( function(sender,e){
				// Listen to a change in the users state
				if (e.get_propertyName() != 'state'){ return; }

				// trigger listeners 
				if( auth.get_state() === Microsoft.Live.AuthState.authenticated){
					session = true;
					trigger('auth.login', {status:'connected'});
				}
				if( auth.get_state() === Microsoft.Live.AuthState.unauthenticated){
					session = false;
					trigger('auth.logout', {status:'notconnected'});
				}
			});

			// Send callback
			callback();
		};

		// 
		$.getScript( "http://js.live.net/4.1/loader.js", function(){
			Microsoft.Live.Core.Loader.load(["microsoft.live", "microsoft.live.services"], function (e) {
				Microsoft.Live.App.initialize({
					channelurl:'./msgr/channel.htm' ,
					callbackurl:window.location.href.replace(/#.*/, '').replace(/\/[^\/]*$/,'/')+'token.php' ,
					clientid:{
						'sandbox.knarly.local':'000000004403AD10',
						'sandbox.knarly.com':'000000004803E258',
						'toobify.appspot.com':'000000004403EA3B',
						'toobify.com':'0000000044039A0A'
					}[window.location.hostname],
					scope:"WL_Contacts.View,WL_Profiles.View,WL_Activities.Update" ,
					onload:"mcAppOnLoad"
				});
			});
		});
	};

	/*************************************
	 *
	 *			Status Events
	 *
	 *************************************/
	
	this.subscribe = function(name, callback){
		listeners[name] = listeners[name] || [];
		listeners[name].push(callback);
	};
	function trigger(name,data){
		if(!(name in listeners)){return;}
		$.each(listeners[name], function(i,cb){
			cb(data);
		});
	}

	/*************************************
	 *
	 *			Authentication
	 *
	 *************************************/

	this.login = function(callback){
		Microsoft.Live.App.signIn();
	};

	this.logout = function(callback){
		Microsoft.Live.App.signOut();
	};

	this.getSession = function(){
		return session;
	};

	/*************************************
	 *
	 *				GET
	 *
	 *************************************/

	this.get = function( path, cb ){

		switch( path ){

			case 'profile': 
				mcGet('profile',{},function(d){
					if(!d){
						cb(false);
						return;
					}
					var p=d.get_profile();
					callback({
						id	: p.get_cid(),
						name: p.get_firstName(),
						icon: p.get_thumbnailImageLink()
					});
				});
			break;

			case 'friends': 
				mcGet('contacts',{'$filter':'IsFriend eq true'},function(d){
					if(!d){
						cb(false);
						return;
					}
					var a=[];

					for(var i=0;i<d.get_length();i++){
						a.push({
							id   : d.get_item(i).get_cid(),
							name  : (d.get_item(i).get_formattedName()||d.get_item(i).get_title()),
							icon  : d.get_item(i).get_thumbnailImageLink()
						});
					}
					a = a.sort(function(a,b){
						return (a.name.toLowerCase()>b.name.toLowerCase()? 1 : ( a.name.toLowerCase()<b.name.toLowerCase() ? -1 : 0 ));
					});
					
					callback(a);
				});
			break;


			// MC doesn't support this.
			case 'comments': 
			case 'members': 
				return false;
			break;

			default:
				return false;
			break;
		}
		
		return true;
	};


	/*************************************
	 *
	 *				POST
	 *
	 *************************************/
	this.post =  function( path, data, callback ){
		switch( path ){
			case "comment":
				// Comment add an activity comment
				// Get the activities resource
				mcGet('myActivities',{},function(d){
					// Add the Activity Object to the Activity Template
					var a = new Microsoft.Live.Services.AddBookmarkActivity(
						[(new Microsoft.Live.Services.BookmarkActivityObject(data.link,data.message,''))], 
						data.link);
					a.set_applicationLink(window.location.href);
		
					// Add the completed Activity to the Activity Resource
					d.add(a);
					d.save(function(e){
						callback(e.get_results()[0].get_resultCode() === Microsoft.Live.AsyncResultCode.success);
					});
		        });

			break;
			case "message":
				// Send an email
				var invite = Microsoft.Live.$create_EmailInvitation("noreply@toobify.com", data.name, data.message + "\n" + data.link, gata.guid);
				Microsoft.Live.App.get_dataContext().sendInvitations([invite], function(e){
					callback(e.get_resultCode() === Microsoft.Live.AsyncResultCode.success);
				});			
			break;
		}
	};

	/*************************************
	 *
	 *				UTIL
	 *
	 *************************************/


	function mcGet(type,opts,callback,i){
		// Have we got options?
		if(typeof(opts)==='function'){
			callback=opts;
			opts={};
		}
		i=i||0;
		Microsoft.Live.App.get_dataContext().load(Microsoft.Live.DataType[type], opts, function(e){
			if (e.get_resultCode() !== Microsoft.Live.AsyncResultCode.success) {
				if(i<3){
					mcGet(type,opts,callback,++i);
				}
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
	}
});