/**
 * Facebook
 * This is a wraper using ./connect.js to use these events to intergrate with the Facebook functionality 
 */
connect.add( 'facebook', new function(){

	var self = this,
		// Listeners
		listeners = {},
		// Facebook Connect reference
		fbid = {
			'sandbox.knarly.local' : '4d959abe58d5ff31272ce19efa539d7b',
			'sandbox.knarly.com' : '98fd1a536c2bbe1a69a5f8a451c3b20f',
			'toobify.com' : '237ec0c5eb831e70781358164b99b820',
			'appspot.toobify.com' : '7c62cc9c99b94f8a5d99bfeafc5e1056'
		}[window.location.host],
		// Application Wall reference
		appid = {
			'sandbox.knarly.local' : '359288236870',
			'sandbox.knarly.com' : '166008711508',
			'toobify.com' : '175720269105905',
			'appspot.toobify.com' : '108884335847725'
		}[window.location.host];

	// Properties
	this.icon = "http://facebook.com/favicon.ico";
	this.name = "FaceBook";

	// icon
	function icon(id){	
		return 'http://graph.facebook.com/'+id+'/picture';
	}

	/******************************************
	 * INIT 
	 * 
	 * What to trigger once this has been added to connect
	 ******************************************/
	this.init = function(callback){
		// Insert the div to which Facebook uses for XD requests
		$('body').append('<div id="fb-root"></div>');


		/**
		 * Global FB handler
		 */
		window.fbAsyncInit = function() {
			FB.init({appId: fbid, status: true, cookie: true, xfbml: false});
			FB.Event.subscribe('auth.login', function(json){
				trigger('auth.login', json);
			});
			FB.getLoginStatus(function(json){
				if(json.status === 'connected'){
					trigger('auth.login', json);
				}
			});
			callback();	
		};
	
		// load library
		$.getScript(document.location.protocol +'//connect.facebook.net/en_US/all.js');
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
		FB.login(callback,{perms:'read_stream,publish_stream'});
	};

	this.logout = function(callback){
		FB.logout(callback);
	};
	
	this.getLoginStatus = function(cb){
		FB.getLoginStatus(cb);
	};

	this.getSession = function(){
		return FB.getSession();
	};

	/*************************************
	 *
	 *				GET
	 *
	 *************************************/

	this.get = function(service, callback){

		switch(service){

			case "profile":
				FB.api('/me', function(json) {
					if(json.error){
						return;
					}
					json.icon = icon(json.id);
					callback(json);
				});
			break;


			case "friends":
				var j=3,i=0;
				FB.api("/me/friends", function(json){
		
					if(json.error){
						if(--j){
							self.get(service, callback);
						}
						else {
							callback(false);
						}
						return;
					}
		
					// add icon property
					if(json.error){
						return json;
					}
					var a = json.data;

					for(i=0;i<a.length;i++){
						a[i].icon = icon(a[i].id);
					}
		
					callback(a);
				});
			break;

			
			case "comments":
				FB.api('/'+appid+'/feed',function(json){
		
					var a = json.data,
						i=0;
		
					for(;i<a.length;i++){
						a[i].from.icon = icon(a[i].from.id);
					}

					callback(a);
				});
			break;
		}
	};
	
	/*************************************
	 *
	 *				POST
	 *
	 *************************************/

	this.post = function(service,data,callback){
	
		switch(service){
			case "comment":	
				FB.api('/'+appid+'/feed','post',data,callback);		
			break;


			case "message":	
				var i=0;
				if(!(data.guid instanceof Array)){
					data.guid = [data.guid];
				}
		
				// Loop through guid
				for(;i<data.guid.length;i++){
					FB.api('/'+data.guid[i]+'/feed', 'post', 
						{
							message: data.message, 
							link : data.link
						},callback);
				}
			break;
		}

	};
});