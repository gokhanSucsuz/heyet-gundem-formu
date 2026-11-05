<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

$app2 = App\Models\Application::find(2);
$deployment_uuid = (string) \Illuminate\Support\Str::uuid();

echo "Triggering deployment for: " . $app2->name . " (Deployment UUID: " . $deployment_uuid . ")\n";
queue_application_deployment(
    application: $app2,
    deployment_uuid: $deployment_uuid,
    commit: 'HEAD',
    force_rebuild: true
);

echo "Deployment queued successfully! UUID: " . $deployment_uuid . "\n";

