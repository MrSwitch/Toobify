/**
 * Facebook
 */
var fb = {
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
	name : null,
	fbAsyncInit : function() {
		FB.init({appId: fb.id, status: true, cookie: true, xfbml: false,channelUrl  : window.location.href.replace(/\/[^\/]*$/,'') + '/inc/fb_xd.htm'});
		FB.Event.subscribe('auth.login', function(response){
			log(response);
			fb.auth();
		});
		FB.getLoginStatus(function(json){
			if(json.status === 'connected')
				fb.auth();
		})		
	},
	init  : function(){
		// build the tab
		$('body').append('<div id="fb-root"></div>');
		$('nav.right ol:first')
			.append('<li class="facebook" data-id="facebook">FaceBook<\/li>')
			.after('<ul class="social facebook signedout" data-id="facebook">\
				<div class="isoffline">Signed out <button>Sign In</button><\/div>\
				<div class="issigningin">Signing in... <a href="javascript:void(0);">Problems signing in?<\/a><\/div>\
				<div class="issignedin profile"><img /><span class="name"></span> <a class="invite">invite<\/a> | <a class="signout">sign out<\/a><\/div>\
				<h2>comments</h2>\
				<form>\
					<input placeholder="insert comment"\/>\
					<button type="submit">Go</button>\
				<\/form>\
			</ul>');

		// Assign the callback
		window.fbAsyncInit = this.fbAsyncInit;

		// load library and attach event to sign in with the facebook ID.
		$.getScript(document.location.protocol +'//connect.facebook.net/en_US/all.js', function(){
			fb.msgs();		
		});

		// Bind all events listeners to this Widget
		var x,m;
		for( x in this.EVENTS ){
			m = x.match(/(.* )?([a-z]+)$/);
			$(m[1]||window)[m[1]?'live':'bind'](m[2], this.EVENTS[x]);
		}
	},
	EVENTS : {
		'.facebook .isoffline button click' : function(){
			FB.login(fb.auth,{perms:'read_stream,publish_stream'});
		},
		'.facebook .profile .signout click' : function(){
			FB.logout();
			$(".facebook").removeClass('signedin').addClass('signedout').removeClass('signingin');
		},
		'.facebook form submit' : function(){
			if(!$('ul.facebook').hasClass('signedin')){
				$('ul.facebook .isoffline button').trigger('click');
			} else if($('input', this).val()!=''){
				var msg = $('input', this).val();
				FB.api('/'+fb.appid+'/feed',
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
							setTimeout(fb.msgs,3000);
						}
					}
				);
				$('input', this).val('');
			}
			return false;
		},
		'.facebook .profile .invite click' : function(){
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
	auth : function(){
		$(".facebook").addClass('signedin').removeClass('signedout').removeClass('signingin');
		FB.api('/me', function(json) {
			if(json.error)
				return;
			$(".facebook .profile .name").html(fb.username = json.name);
			$(".facebook .profile img").attr('src','http://graph.facebook.com/'+json.id+'/picture');

		});
	},
	msgs: function(){
		FB.api('/'+fb.appid+'/feed',function(response){
			var s='';
			$.each(response.data, function(i){
				if(i>10||$("#"+this.id).length||!this.message){return;}
				s += '<li class="comment" id="'+this.id+'"><img title="' + this.from.name + '" src="http://graph.facebook.com/' + this.from.id + '/picture"/>';
				s += " " + this.message + ' <span class="date">' + this.updated_time.replace(/T.*$/,'') + "</span></li>";
			});
			$(s).insertAfter('ul.facebook form').hide().css({opacity:0}).slideDown().animate({opacity:1}, 'slow');
		});
	}
	
}

// Add the button and add the controls.
fb.init();