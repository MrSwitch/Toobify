// JAVASCRIPT
// Add controls to include the gfc widget to the nav.right


var gfc = {
	init : function(){

		var siteId = {'sandbox.knarly.com':'10922289347407527576',
	    				'sandbox.knarly.local':'12249073376194964461',
	    				'toobify.appspot.com':'01878999487682637238',
	    				'toobify.com':'09069002496516642031'}[location.host.replace(/^www\./,'').replace(/:.*/,'')];
	    
	    if(!siteId)
	    	return;

		// Add GFC application to the right nav tabs
		$('nav.right ol:first')
			.append('<li class="friendconnect selected" data-id="friendconnect">FriendConnect<\/li>')
			.after('<ul class="friendconnect social selected signedout" data-id="friendconnect">\
				<div class="isoffline">Signed out <button>Sign In</button><\/div>\
				<div class="issigningin">Signing in... <a href="javascript:void(0);">Problems signing in?<\/a><\/div>\
				<div class="profile"><\/div>\
				<h2>members</h2>\
				<h2>comments</h2>\
				<form>\
					<input placeholder="insert comment"\/>\
					<button type="submit">Go</button>\
				<\/form>\
			</ul>');

		

		// Bind all events listeners to this Widget
		var x,m;
		for( x in this.EVENTS ){
			m = x.match(/(.* )?([a-z]+)$/);
			$(m[1]||window)[m[1]?'live':'bind'](m[2], this.EVENTS[x]);
		}
		

		// Get a list of all the memebers on the site
		// add to the List
		// location of rpc_relay.html and canvas.html
		google.friendconnect.container.setParentUrl('/api/');
		google.friendconnect.container.initOpenSocialApi({ 
			site: siteId,
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
					$('nav.right ul.friendconnect h2:contains(members)').after(s);

					// Is the current user signed in?
					var viewer = data.get('viewer').getData();
					if(viewer){
						$('ul.friendconnect div.profile').html('<img src="' + viewer.getField("thumbnailUrl") + '">\
							<span class="name"> ' +  viewer.getField("displayName") + '</span> \
							<a class="settings">Settings</a> | \
							<a class="invite">Invite</a> | \
							<a class="signout">signout</a>');
						$('ul.friendconnect').addClass('signedin').removeClass('signedout').removeClass('signingin');
						// if the user has something waiting to post, send it.
						$('ul.friendconnect form').submit();
					}
					else{
						$('ul.friendconnect').addClass('signedout').removeClass('signedin').removeClass('signingin');
					}
					// Add activties
					gfc.activities(data);
				});
			}
		});
		setTimeout( gfc.refreshActivity,60*1000);
	},
	
	EVENTS : {
		'ul.friendconnect div.isoffline button click' : google.friendconnect.requestSignIn,
		'ul.friendconnect div.isonline button,ul.friendconnect div.profile .signout click' : google.friendconnect.requestSignOut,
		'ul.friendconnect .settings click' : function(){
			google.friendconnect.requestSettings();
			return false;
		},
		'ul.friendconnect .invite click' : function(){
			google.friendconnect.requestInvite("Check it out!");
			return false;
		},
		'ul.friendconnect li img click' : function(){
			google.friendconnect.showMemberProfile($(this).attr('id'));
		},
		'ul.friendconnect form submit' : function(){
			if(!$('ul.friendconnect').hasClass('signedin')){
				google.friendconnect.requestSignIn();
			} else if($('input', this).val()!=''){
				opensocial.requestCreateActivity(
					opensocial.newActivity({
						title: $('input', this).val()
					}),
					"HIGH",
					function(){ setTimeout( gfc.refreshActivity,1000); }
				);
				$('input', this).val('');
			}
			return false;
		}
	},
	activities : function(data){
		// Is the current user signed in?
		if(data.get('activities')){
			$('nav.right ul.friendconnect li.comment').remove();
			var s='';
			$.each(data.get('activities').getData().asArray(), function(i){
				if(i>10){return;}
				s += '<li class="comment"><img title="' + this.getField("userName") + '" src="' + this.getField("userThumbnailUrl")  + '"/>';
				s += " " + this.getField('title', {escapeType: 'none'}) + ' <span class="date">' +(this.getField('updated', {escapeType: 'none'}) || "").replace(/T.*$/,'') + "</span></li>";
			});
			/*
			for (var i = 0, s = "", a = data.get('activities').getData().asArray(); i < a.length ; i++) {
				s += '<li class="comment"><img title="' + a[i].getField("userName") + '" src="' + a[i].getField("userThumbnailUrl")  + '"/>';
				s += " " + a[i].getField('title', {escapeType: 'none'}) + ' <span class="date">' +(a[i].getField('updated', {escapeType: 'none'}) || "").replace(/T.*$/,'') + "</span></li>";
			};
			*/
			$('nav.right ul.friendconnect form').after(s);
		}
	},
	refreshActivity : function(){
		var req = opensocial.newDataRequest(),
			idspec = new opensocial.IdSpec({'userId' : 'OWNER', 'groupId' : 'FRIENDS'});

		req.add(req.newFetchActivitiesRequest(
			idspec),
			'activities');
	
		req.send(gfc.activities);
	}
}

gfc.init();