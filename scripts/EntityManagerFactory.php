<?php declare(strict_types = 1);

use Doctrine\Common\Annotations\AnnotationReader;
use Doctrine\ORM\Mapping\Driver\AnnotationDriver;
use Doctrine\Common\Cache\FilesystemCache;
use Doctrine\ORM\Tools\Setup;
use Doctrine\ORM\EntityManager;

require_once __DIR__ . '/../vendor/autoload.php';

return function (array $config) {
    $metaConfig = Setup::createAnnotationMetadataConfiguration(
        $config['DOCTRINE']['entities'],
        $config['DOCTRINE']['dev_mode']
    );

    $metaConfig->setMetadataDriverImpl(
        new AnnotationDriver(
            new AnnotationReader(),
            $config['DOCTRINE']['entities']
        )
    );

    $metaConfig->setMetadataCacheImpl(
        new FilesystemCache($config['DOCTRINE']['cache'])
    );

    return EntityManager::create($config['DOCTRINE']['connection'], $metaConfig);
};