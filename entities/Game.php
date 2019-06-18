<?php declare(strict_types = 1);

namespace Entities;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity
 * @ORM\Table(name="game")
 **/
class Game
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue
     */
    protected $id;

    /** @ORM\Column(type="integer") **/
    protected $igdb_id;

    /** @ORM\Column(type="string") **/
    protected $name;

    /** @ORM\Column(type="string") **/
    protected $cover_url;

    /** @ORM\Column(type="string") **/
    protected $igdb_url;

    public function getValues(): array
    {
        return [
            'id'        => $this->id,
            'igdb_id'   => $this->igdb_id,
            'name'      => $this->name,
            'cover_url' => $this->cover_url,
            'igdb_url'  => $this->igdb_url
        ];
    }

    public function setValues($values)
    {
        $this->igdb_id   = $values['igdb_id'];
        $this->name      = $values['name'];
        $this->cover_url = $values['cover_url'];
        $this->igdb_url  = $values['igdb_url'];
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getIgdbId(): int
    {
        return $this->igdb_id;
    }

    public function setIgdbId(int $igdb_id)
    {
        $this->igdb_id = $igdb_id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name)
    {
        $this->name = $name;
    }

    public function getCoverUrl(): string
    {
        return $this->cover_url;
    }

    public function setCoverUrl(string $cover_url)
    {
        $this->cover_url = $cover_url;
    }

    public function getIgdbUrl(): string
    {
        return $this->igdb_url;
    }

    public function setIgdbUrl(string $igdb_url)
    {
        $this->igdb_url = $igdb_url;
    }
}