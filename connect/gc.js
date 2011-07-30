/**
 * connect.add
 * Add google friend connect to the mix
 */
connect.add('friendconnect', new function(){

	var siteId = {
			'sandbox.knarly.com':'10922289347407527576',
			'sandbox.knarly.local':'12249073376194964461',
			'toobify.appspot.com':'01878999487682637238',
			'toobify.com':'09069002496516642031'
		}[window.location.hostname.replace(/^www\./,'')],
		
		// Event listeners
		listeners = [],
		
		self = this,
		
		session = false;

	// Properties
	this.icon = "http://code.google.com/apis/buzz/images/google-buzz-16x16.png";
	this.name = "Friend Connect";

	/******************************************
	 * INIT 
	 * 
	 * What to trigger once this has been added to connect
	 ******************************************/

	this.init = function(callback){
		$.getScript('http://www.google.com/friendconnect/script/friendconnect.js?key=notsupplied&v=0.8', function(){

			// add to the List
			// location of rpc_relay.html and canvas.html
			google.friendconnect.container.setParentUrl('/api/');
			google.friendconnect.container.initOpenSocialApi({
				site: siteId,
				
				// TODO: offline when i wrote this, the callback needs to determine whether the user is signed in. 
				// According to my memory this function gets triggered for eachtime the users state changes.
				// ADD subscribe events
				onload: function(key){

					// ?Check to findout whether the user is signed in
					var req = opensocial.newDataRequest();
					req.add(req.newFetchPersonRequest('VIEWER'), 'viewer');
					req.send(function(data){
						// test, user signed in?
						var bool = data.get('viewer').getData();
						if(bool){
							// trigger signed in
							session = true;
							trigger('auth.login',{status : 'connected'});
						} else if(!bool){
							session = false;
							trigger('auth.logout',{status : 'notconnected'});
						}
						// trigger the callback
						callback();
					});
				}
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
		google.friendconnect.requestSignIn();
	};

	this.logout = function(callback){
		google.friendconnect.requestSignOut();
	};

	this.getSession = function(){
		return session;
	}

	/*************************************
	 *
	 *				GET
	 *
	 *************************************/

	this.get = function( service, callback ){

		var p = {},
			req = opensocial.newDataRequest(),
			idspec = new opensocial.IdSpec({'userId' : 'OWNER', 'groupId' : 'FRIENDS'}),
			o = opensocial.Person.Field;

		p[opensocial.DataRequest.PeopleRequestFields.PROFILE_DETAILS] = [o.ID,o.NAME,o.THUMBNAIL_URL,o.PROFILE_URL];
		

		switch(service){

			case 'profile': 
				req.add(req.newFetchPersonRequest(
					'VIEWER', p), 
					'viewer');

				req.send(function(data){

					// Is the current user signed in?
					var viewer = data.get('viewer').getData(),
						o = {};
					if(viewer){
						o = {
							name : viewer.getField("displayName"),
							icon : viewer.getField("thumbnailUrl"),
							id	: viewer.getField("id")
						};
					}
					console.log("Profile", data.get('viewer'));
					// Add activties
					callback(o);
				});
				
				
			break;


			case 'friends': 
		
			
			break;


			case 'comments': 
				req.add(req.newFetchActivitiesRequest(
					idspec),
					'activities');
				req.send(function(data){
					// Is the current user signed in?
					var a=[];
					if(data.get('activities')){
						$.each(data.get('activities').getData().asArray(), function(i){
							a.push({
								from : {
									name : this.getField("userName"),
									icon : this.getField("userThumbnailUrl")
								},
								message : this.getField('title', {escapeType: 'none'}),
								update_time : (this.getField('updated', {escapeType: 'none'}) || "").replace(/T.*$/,'')
							});
						});
					}
					callback(a);
				});
			
			break;



			case 'members': 
				req.add(req.newFetchPeopleRequest(
					idspec, p), 
					'ownerFriends');
				req.send(function(data){
					// Display a list of members
					var a=[];
					if(data.get('ownerFriends').getData()){
						$.each( data.get('ownerFriends').getData().asArray(), function(i){
							a.push({
								name : this.getField("displayName"),
								icon : this.getField("thumbnailUrl"),
								id : this.getField("id")
							});
						});
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
	this.post =  function( service, data, callback ){
		switch( service ){
			case "comment":
				opensocial.requestCreateActivity(
					opensocial.newActivity({
						title: data.message
					}),
					"HIGH",
					callback
				);

			break;

			case "message":
				
			break;
		}
	};
});