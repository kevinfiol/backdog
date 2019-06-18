<?php declare(strict_types = 1);

namespace App\Services;

use GuzzleHttp\Client;
use Psr\Http\Message\ResponseInterface as Response;

class IGDB
{
    const API_URL = 'https://api-v3.igdb.com/';

    private $apiKey;
    private $client;

    public function __construct(string $apiKey, Client $client)
    {
        $this->apiKey = $apiKey;
        $this->client = $client;
    }

    public function apiCall(string $endpoint, string $option = null, string $identifier = null, array $params = []): Response
    {
        $headers = ['user-key' => $this->apiKey];
        $uri = self::API_URL . "{$endpoint}/";

        if ($option)     $uri = $uri . "{$option}/";
        if ($identifier) $uri = $uri . "{$identifier}/";

        return $this->client->get($uri, [
            'headers' => $headers,
            'query'   => $params
        ]);
    }
}