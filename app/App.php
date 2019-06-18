<?php declare(strict_types = 1);

namespace App;

use Slim\App;
use Slim\Container;

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Resolve Configuration Variables
 */
$configPath = __DIR__ . '/../config.php';

if (file_exists($configPath) && is_readable($configPath)) {
    $config = include_once $configPath;
} else {
    $config = [
        'IGDB_KEY' => getenv('IGDB_KEY'),
        'LOG_PATH' => getenv('LOG_PATH')
    ];
}

/**
 * Create Dependencies
 */
$container          = new Container();
$createDependencies = include_once __DIR__ . '/Dependencies.php';
$dependencies       = $createDependencies($config);

foreach ($dependencies as $name => $factory) {
    $container[$name] = $factory;
}

/**
 * Create Application and Map Routes
 */
$app    = new App($container);
$routes = include_once __DIR__ . '/Routes.php';

foreach ($routes as $path => [$http, $handler]) {
    $app->map($http, $path, $handler);
}

/**
 * Run Application
 */
$app->run();