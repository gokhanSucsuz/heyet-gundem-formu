<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

// Check helper functions or actions
$declared = get_defined_functions()['user'];
$deployFuncs = array_filter($declared, fn($f) => stripos($f, 'deploy') !== false || stripos($f, 'restart') !== false);
print_r($deployFuncs);

