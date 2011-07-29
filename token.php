<?php
/**
 *
 * This script it a dynamic tool used for communicating with a static page. 
 * It enables us to take the creation of the application-verifier-token to a URL to be interacted with via a REST method.
 * 
 * ?token	-	Sets the DELEGATION TOKEN cookie
 * ?attr	-	Return attributes of <msgr:app> tag in JSON
 *
 * @author Andrew Dodson
 *
 * SETUP
 * ------------
 * 1. Obtain an application ID from https://live.azure.com/Cloud/Provisioning/Services.aspx?ProjectId=0
 * 		(More info about App ID at - http://msdn.microsoft.com/en-us/library/bb676626.aspx)
 * 2. Place Application ID (appid) and Secret in $settings below
 *
 * 3. (Optional) To create an application contacts list (i.e. to link two users who are not themselves contacts) we need another code, 'appkey'
 * 			https://consent.messenger.services.live.com/applicationsettings.aspx?appid=0x{appid}
 * 			e.g. https://consent.messenger.services.live.com/applicationsettings.aspx?appid=0x000000004002CC1F
 */
//$wrap_token_url = 'https://consent.live-int.com/AccessToken.aspx';
$wrap_token_url = ( strpos($_SERVER['HTTP_HOST'], '-int.') 
						? 'https://consent.live-int.com/AccessToken.aspx' 
						: "https://consent.live.com/AccessToken.aspx");

//IGNORE
switch($_SERVER['HTTP_HOST']){
	case 'livedogfood.com':
		$settings = array(
			'appid'				=> '000000004402DE16',
			'secret'			=> 'AXC1J3Qm6MAYwl6zGaBWXK6RyhGWhwrg'
		);
	break;
	case 'mtv-uk.mslivelabs-int.com':
	case 'mtvuk.mslivelabs-int.com':
		$settings = array(
			'appid'				=> '00000000603D6027',
			'secret'			=> '2uai6tReGkM7uJkjs7o7vOgF1Drhbq83'
		);
	break;
	case 'local.mslivelabs.com':
		$settings = array(
			'appid'				=> '000000004402DC21',
			'secret'			=> 'PgdYFfhRTuQ2HYwBL7q2nHHMaFOZXAV4'
		);
	break;
	case 'sandbox.knarly.com':
		$settings = array(
			'appid'				=> '000000004803E258',
			'secret'			=> 'rGr55XLYobkXvPl8sqxzVV5lhy4GPZ95'
		);
	break;
	case 'sandbox.knarly.local':
		$settings = array(
			'appid'				=> '000000004403AD10',
			'secret'			=> 'gvApbehUKXygLsZRIPyitjdrlrqo7ksJ',
		);
	break;
	case 'toobify.com':
		$settings = array(
			'appid'				=> '0000000044039A0A',
			'secret'			=> 'hZgY7BSxrbYDBvrqAoKcAwokjpUudiUy',
		);
	break;
	
	case 'cloudapps.net':
		$settings = array(
			'appid'				=> '000000004802BA2B',
			'secret'			=> 'XjTlfCz6DjA9H3zNKocFp1dvOlQpzxSv',
		);
	break;
}


/**
 * Initiate Session
 */
session_start();


/**
 * Is this a call to the Auth Handler
 * If so this script is run in a popup and needs to set some cookies and process the request.
 */
if( ! empty($_GET['wrap_verification_code'] ) ){

	// make a secure request to get an access token
	// this uses variables configured in oauthwrapconfig.php

	$cURL = curl_init();
	curl_setopt_array($cURL, array(
		CURLOPT_URL => $wrap_token_url,
		CURLOPT_POST => true,
		CURLOPT_POSTFIELDS => implode_with_key($a = array(
			// this is the unique ID for your application
			'wrap_client_id' => $settings['appid'],
			// this is the secure secret for your application.  DO NOT expose this to users
			'wrap_client_secret' => $settings['secret'],
			// when the user clicks 'ok' in the auth popup, the popup window will be redirected to this URL.  
			// this page needs to then request a token and store the response in session state (for REST calls) and/or cookies (for JS calls)
			'wrap_callback' => ("http://".$_SERVER['HTTP_HOST'].$_SERVER['SCRIPT_NAME']) . (!empty($_GET['callback'])?'?callback='.$_GET['callback']:null),
			
			'wrap_verification_code' => ($_GET['wrap_verification_code'])
		)),
		CURLOPT_HTTPHEADER => array('Content-type: application/x-www-form-urlencoded;charset=UTF-8'),
		CURLOPT_PORT => 443,
//		CURLOPT_PROXY => "127.0.0.1:8888", 
		CURLOPT_HEADER         =>  0, 
		CURLOPT_VERBOSE => false,
		CURLOPT_SSL_VERIFYPEER => false, // TODO: enable SSL verification
		CURLOPT_RETURNTRANSFER => true ));
	$content = curl_exec($cURL);

	curl_close($cURL);

	// the response comes back as series of form-encoded values in the body
	// split this string into an array of name-value pairs
	parse_str($content, $response);

	// store values retrieved from the access token request into session state
	$_SESSION += $response;
	
	if(!array_key_exists('wrap_access_token',$response)){
		
		print_r("Failed");
		print_r($response);
		print_r($a);
		exit(1);
	}

	// store values retrieved from the access token request into cookies
	// cookies must use these names so that the Messenger Connect JavaScript library can find them
	foreach( array( 
		'accessToken' => $response['wrap_access_token'],
		'c_accessToken' => $response['wrap_access_token'],
		'c_expiry'	=> $response['wrap_access_token_expires_in'], // TODO: get this in the right format
		'c_uid'		=> $response['uid'],
		'c_clientId'=> $settings['appid'],
		'c_clientState' => @$_GET['wrap_client_state'],
		'c_scope'	=> $_GET['exp'],
		'lca'		=> 'done' // this one must be set last - it signals to the JS library that the other cookies are ready
	) as $k => $o )
		setcookie( $k, $o, time()+(int)$response['wrap_access_token_expires_in'], '/' );
	
	echo '<html><head></head><body onload="'. (!empty($_GET['callback'])?'try{window.opener.'.$_GET['callback'].'();}catch(e){if(\'sessionStorage\' in window){sessionStorage.msgrconsentcompleted=true;}};':NULL) .'self.close();"></body></html>';
	exit;
}

function implode_with_key($a){
	$i=0;
	$r='';
	foreach($a as $k=>$o){
		$r .= ($i++?"&":'').$k."=".$o;
	}
	return $r;
}
?>