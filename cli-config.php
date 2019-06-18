<?php declare(strict_types = 1);

use Doctrine\ORM\Tools\Console\ConsoleRunner;

require_once __DIR__ . '/vendor/autoload.php';

$config        = include_once __DIR__ . '/config.php';
$emFactory     = include_once $config['SCRIPT_PATH'] . '/EntityManagerFactory.php';
$entityManager = $emFactory($config);

return ConsoleRunner::createHelperSet($entityManager);