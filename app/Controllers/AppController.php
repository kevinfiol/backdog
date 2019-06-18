<?php declare(strict_types = 1);

namespace App\Controllers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Http\Response;

use App\Services\IGDB;
use App\Database\Database;

class AppController
{
    private $igdb;
    private $db;

    public function __construct(IGDB $igdb, Database $db)
    {
        $this->igdb = $igdb;
        $this->db   = $db;
    }

    public function searchGame(Request $req, Response $res): Response
    {
        $params = $req->getQueryParams();
        $term   = $params['term'];

        // Check Cache for Results
        $cache = $this->db->getRows('SearchCache', ['term' => $term]);

        if ($cache) {
            $json = $cache[0]->getResults();
            return $res->withHeader('Content-type', 'application/json')->write($json);
        }

        // Else search IGDB
        try {
            $callParams = [
                'search' => $term,
                'fields' => 'id,name,url,cover.url',
                'limit'  => '5'
            ];

            $callRes = $this->igdb->apiCall('games', null, null, $callParams);
            $json    = $callRes->getBody()->getContents();
            $json    = str_replace(["\r", "\n"], '', $json);

            // Store Results in Cache
            $this->db->addRow('SearchCache', ['term' => $term, 'results' => $json]);

            // Iterate through Results & Add to Game Table
            $games = json_decode($json, true);

            foreach ($games as $game) {
                $igdb_id = $game['id'];
                $rows    = $this->db->getRows('Game', ['igdb_id' => $igdb_id]);

                if (!$rows) {
                    $this->db->addRow('Game', [
                        'igdb_id'   => $igdb_id,
                        'name'      => $game['name'],
                        'cover_url' => $game['cover']['url'],
                        'igdb_url'  => $game['url']
                    ]);
                }
            }

            return $res->withHeader('Content-type', 'application/json')->write($json);
        } catch (\Exception $e) {
            $code = $e->getCode();
            return $res->withStatus($code)->withJson(['error' => $code]);
        }
    }
}