<?php declare(strict_types = 1);

return [
    /** Site Endpoints */
    '/' => [['GET'], 'App\Controllers\IndexController:indexAction'],

    /** IDGB Endpoints */
    '/igdb/{endpoint}[/{option}[/{identifier}]]' => [['GET'], 'App\Controllers\IGDBController:apiCall'],

    /** App Endpoints */
    '/app/searchGame' => [['GET'], 'App\Controllers\AppController:searchGame']
];