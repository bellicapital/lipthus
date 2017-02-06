<?php

$dir = '../../../uploads';

$file = current($_FILES); // we handle the only file in time

if($file['error'] == UPLOAD_ERR_OK) {
	if(@move_uploaded_file($file['tmp_name'], "{$dir}/{$file['name']}"))
		$file['error']	= ''; //no errors, 0 - is our error code for 'moving error'
}

$arr = array(
	'error' => $file['error'], 
	'file' => "{$dir}/{$file['name']}",
	'tmpfile' => $file['tmp_name'], 
	'size' => $file['size']
);

echo json_encode($arr);
?>