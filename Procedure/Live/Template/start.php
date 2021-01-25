<?php
// The directory "data" must be writable by the server
if (!file_exists('data/')) {
  mkdir('data/', 0777, true);
}

$input = file_get_contents('php://input');
$file = ".experiment/data/start.txt";
file_put_contents($file,  $input . PHP_EOL, FILE_APPEND | LOCK_EX);
?>
