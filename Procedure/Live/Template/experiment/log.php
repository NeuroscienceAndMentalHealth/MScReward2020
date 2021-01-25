<?php

/* This logging script dumps data straight to file,
   creating a new file for each participant. */

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$name = "data/s".$data['subject_nr'].".txt";
// var_dump($data); // For debugging
file_put_contents($name, $input . PHP_EOL , FILE_APPEND | LOCK_EX);

?>
