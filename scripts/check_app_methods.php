<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

$app2 = App\Models\Application::find(2);
$app3 = App\Models\Application::find(3);

echo "App 2: " . $app2->name . "\n";
echo "App 3: " . $app3->name . "\n";

// Let's check restartApplication
if (method_exists($app3, 'restart')) {
    echo "has restart()\n";
}
$methods = get_class_methods($app3);
$match = array_filter($methods, fn($m) => stripos($m, 'deploy') !== false || stripos($m, 'restart') !== false);
print_r($match);

