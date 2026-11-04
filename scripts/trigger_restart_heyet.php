<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

$app2 = App\Models\Application::find(2);
$deployment_uuid = new \Illuminate\Support\Str()->uuid()->toString();

echo "Queueing restart for: " . $app2->name . " (UUID: " . $deployment_uuid . ")\n";
queue_application_deployment(
    application: $app2,
    deployment_uuid: $deployment_uuid,
    restart_only: true
);

echo "Queued successfully!\n";

