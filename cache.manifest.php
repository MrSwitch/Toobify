<?php
/**
 * Application Cache
 * @author Andrew Dodson
 * Creates the applicationCache manifet file based on the static files in the current directory.
 * Iterates the file according to the last modification time... causing a reload
 */
header("Content-Type: text/cache-manifest");
header("Cache-Control: no-cache");
header("Pragma: no-cache");

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

// OUTPUT STARTS BELOW HERE
?>
CACHE MANIFEST
CACHE:
<?php
// PRINT FILE CHANGE VERSION
print '# Vs'.$m."\n";
print "./\n";
// PRINT FILES
print implode( $files, "?$m\n") . "?$m\n";
?>

NETWORK:
*
<?php

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