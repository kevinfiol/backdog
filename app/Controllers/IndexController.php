<?php declare(strict_types = 1);

namespace App\Controllers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Http\Response;
use League\Plates\Engine;

class IndexController
{
    private $templates;

    public function __construct(Engine $templates)
    {
        $this->templates = $templates;
    }

    public function indexAction(Request $req, Response $res)
    {
        $template = $this->templates->render('Layout');
        return $res->write($template);
    }
}