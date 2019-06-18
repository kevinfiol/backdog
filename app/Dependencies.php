<?php declare(strict_types = 1);

use GuzzleHttp\Client;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use League\Plates\Engine;

use Doctrine\Common\Annotations\AnnotationReader;
use Doctrine\ORM\Mapping\Driver\AnnotationDriver;
use Doctrine\Common\Cache\FilesystemCache;
use Doctrine\ORM\Tools\Setup;
use Doctrine\ORM\EntityManager;

use App\Controllers\AppController;
use App\Controllers\IGDBController;
use App\Controllers\IndexController;

use App\Database\Database;
use App\Services\IGDB;
use App\Handlers\ErrorHandler;

return function (array $config) {
    return [
        'League\Plates\Engine' => function () use ($config) {
            return new Engine($config['TEMPLATES']);
        },

        'GuzzleHttp\Client' => function () {
            return new Client();
        },

        'Doctrine\ORM\EntityManager' => function () use ($config) {
            $emFactory     = include_once $config['SCRIPT_PATH'] . '/EntityManagerFactory.php';
            $entityManager = $emFactory($config);
            return $entityManager;
        },

        'App\Database\Database' => function ($c) {
            $em        = $c->get('Doctrine\ORM\EntityManager');
            $namespace = 'Entities';
            return new Database($em, $namespace);
        },

        'App\Services\IGDB' => function ($c) use ($config) {
            $client = $c->get('GuzzleHttp\Client');
            return new IGDB($config['IGDB_KEY'], $client);
        },

        'App\Controllers\IGDBController' => function ($c) {
            $igdb = $c->get('App\Services\IGDB');
            return new IGDBController($igdb);
        },

        'App\Controllers\AppController' => function ($c) {
            $igdb = $c->get('App\Services\IGDB');
            $db   = $c->get('App\Database\Database');
            return new AppController($igdb, $db);
        },

        'App\Controllers\IndexController' => function ($c) {
            $templates = $c->get('League\Plates\Engine');
            return new IndexController($templates);
        },

        'notFoundHandler' => function () {
            return function ($req, $res) {
                return $res->withStatus(404)->withJson(['error' => 'Endpoint does not exist']);
            };
        },

        'logger' => function () use ($config) {
            $logger  = new Logger('fydg_logger');
            $handler = new StreamHandler($config['LOG_PATH'], Logger::WARNING);
            $logger->pushHandler($handler);
            return $logger;
        },

        'errorHandler' => function ($c) {
            $logger = $c->get('logger');
            return new ErrorHandler($logger);
        }
    ];
};