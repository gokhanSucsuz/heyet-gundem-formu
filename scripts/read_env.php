<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

$envs = App\Models\EnvironmentVariable::where("key", "MONGODB_URI")->get();
foreach ($envs as $env) {
    echo "ID: " . $env->id . " | Resource: " . $env->resourceable_type . " #" . $env->resourceable_id . "\n";
    echo "Value: " . $env->value . "\n\n";
}

