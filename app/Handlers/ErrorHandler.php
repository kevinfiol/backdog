<?php declare(strict_types = 1);

namespace App\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

use Slim\Handlers\Error;
use Monolog\Logger;

final class ErrorHandler extends Error
{
    protected $logger;

    public function __construct(Logger $logger)
    {
        parent::__construct();
        $this->logger = $logger;
    }

    public function __invoke(Request $req, Response $res, \Exception $e)
    {
        $this->logger->critical($e->getMessage());
        return parent::__invoke($req, $res, $e);
    }
}