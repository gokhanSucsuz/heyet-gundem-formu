<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

$app3 = App\Models\Application::find(3);
$deployment_uuid = new \Illuminate\Support\Str()->uuid()->toString();

echo "Queueing deployment/restart for: " . $app3->name . " (UUID: " . $deployment_uuid . ")\n";
$queue = queue_application_deployment(
    application: $app3,
    deployment_uuid: $deployment_uuid,
    restart_only: true
);

echo "Deployment queued! ID: " . $queue->id . "\n";

