<?php
require "/var/www/html/vendor/autoload.php";
$app = require_once "/var/www/html/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

$env11 = App\Models\EnvironmentVariable::find(11);
if ($env11) {
    echo "Guncelleniyor (ID: 11 - heyetgundem)...\n";
    echo "Eski: " . $env11->value . "\n";
    $env11->value = "mongodb://edirnesydv:2120957Ev.@mongodb-database-didtlqbqgz0lscyqtj7i8ohv:27017/gundem?authSource=admin&directConnection=true";
    $env11->save();
    echo "Yeni: " . $env11->value . "\n\n";
}

$env19 = App\Models\EnvironmentVariable::find(19);
if ($env19) {
    echo "Guncelleniyor (ID: 19 - puanlama)...\n";
    echo "Eski: " . $env19->value . "\n";
    $env19->value = "mongodb://edirnesydv:2120957Ev.@mongodb-database-didtlqbqgz0lscyqtj7i8ohv:27017/kirilganlikDB?authSource=admin&directConnection=true";
    $env19->save();
    echo "Yeni: " . $env19->value . "\n\n";
}

echo "Guncelleme tamamlandi!\n";

