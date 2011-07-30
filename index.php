<?php

/**
 * If the user has submitted a querystring we shoud go and get the details. 
 * And then reload the page immediatly using javascript if they happen to hit this page
 */
$p = array(
	'title'		=> '',
	'desc'		=> 'Toobify is an awesome way to watch youtube vids!',
	'keywords'	=> 'Youtube, videos, music, songs, entertainment, video player, music player',
	'img'		=> '',
	'manifest'	=> ''
);

if(!empty($_GET['id'])){
	// get the information from YouTube about this video
	$a = json_decode(@file_get_contents('http://gdata.youtube.com/feeds/api/videos/'.$_GET['id'].'?v=2&alt=json'));

	if($a){
		$a = (array)$a->entry;
		$a['title'] = (array)$a['title'];
		$a['media$group'] = (array)$a['media$group'];
		$a['media$group']['media$description'] = (array)$a['media$group']['media$description'];
		$a['media$group']['media$thumbnail'] = (array)$a['media$group']['media$thumbnail'];
		$a['media$group']['media$keywords'] = (array)$a['media$group']['media$keywords'];
	
		$p += array(
			'title'		=> ' | ' . $a['title']['$t'],
			'desc'		=> $a['media$group']['media$description']['$t'],
			'keywords'	=> $a['media$group']['media$keywords']['$t'],
			'img'		=> $a['media$group']['media$thumbnail'][0]->url
		);
	}
}



$r = file_get_contents("template/toobify.htm");

/**
 * Sniff the browser
 * Add application cache for the following browsers
 */
if(!strpos($_SERVER['HTTP_HOST'],".local")&&preg_match("#(webkit|opera)#i",$_SERVER['HTTP_USER_AGENT'])){
	$files = files('./');	// ARRAY OF FILES IN CURRENT AND NESTED DIRECTORIES
	$m = 0;					// LATEST MODIFICATION TIME 
	
	foreach($files as &$o){
		$m = ($m > filemtime($o) ? $m : filemtime($o));		// most recent modification time
		if(!preg_match("#\.(css|js)$#",$o))
			$o = NULL;	// null values filtered out later
	}
	unset($o);
	// remove items with null values
	$files = array_filter( $files ); 
	$p['manifest'] = ' manifest="cache.manifest.php?"';
	
	foreach($files as $o){
		$o = ltrim($o,"./");
		$r = str_replace($o, $o."?".$m, $r);
	}
}


// Replace meta
foreach( $p as $k => $o ){
	$r = str_replace("{{ ".$k." }}", $o, $r);
}
print $r;


// UTILITIES
function files($path){
	$a = scandir($path);
	$r = array();
	foreach( $a as $o ){
		if( !is_dir( $o ) ) {
			$r[] = $path . $o;
		} 
		else if(preg_match("#[a-z]#", $o)){
			$r = array_merge( $r, (array)files($path.$o.'/') );
		}
	}
	return (array)$r;
}

?>