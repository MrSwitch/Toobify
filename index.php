<?php

/**
 * If the user has submitted a querystring we shoud go and get the details. 
 * And then reload the page immediatly using javascript if they happen to hit this page
 */
$r = file_get_contents("index.htm");


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
		
		// Replace Title
		$r = preg_replace("/<title>(.*)<\/title>/", "<title>\\1 | ".$a['title']['$t']."</title>", $r);

		// Replace meta
		$meta = array(
			'description' => $a['media$group']['media$description']['$t'],
			'keywords'	=> $a['media$group']['media$keywords']['$t'],
			'image_src'	=> $a['media$group']['media$thumbnail'][0]->url
		);

		foreach( $meta as $k => $o ){
			$r = preg_replace("/<meta name=\"($k)\" content=\"(.*)\" \/>/","<meta name=\"$k\" content=\"$o\"/>" , $r);
		}
		$r = str_replace('<!--[META]->', implode("\n",$meta), $r);
	}
}


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

	// Replace Title
	$r = str_replace("<html>", '<html manifest="cache.manifest.php?"/>', $r);

	
	foreach($files as $o){
		$o = ltrim($o,"./");
		$r = str_replace($o, $o."?".$m, $r);
	}
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