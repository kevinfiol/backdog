<?php declare(strict_types = 1);

namespace App\Controllers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Http\Response;

use App\Services\IGDB;

class IGDBController
{
    private $igdb;

    public function __construct(IGDB $igdb)
    {
        $this->igdb = $igdb;
    }

    public function apiCall(Request $req, Response $res, array $args): Response
    {
        $params = $req->getQueryParams();
        
        $endpoint   = $args['endpoint'];
        $option     = $args['option']     ?? null;
        $identifier = $args['identifier'] ?? null;

        try {
            $callRes = $this->igdb->apiCall($endpoint, $option, $identifier, $params);
            $json    = $callRes->getBody()->getContents();
            return $res->withHeader('Content-type', 'application/json')->write($json);
        } catch (\Exception $e) {
            $code = $e->getCode();
            return $res->withStatus($code)->withJson(['error' => $code]);
        }
    }
}