<?php declare(strict_types = 1);

namespace Entities;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity
 * @ORM\Table(name="search_cache")
 **/
class SearchCache
{
    /**
     * @ORM\Id
     * @ORM\Column(type="integer")
     * @ORM\GeneratedValue
     */
    protected $id;

    /** @ORM\Column(type="string") **/
    protected $term;

    /** @ORM\Column(type="string") **/
    protected $results;

    public function getValues(): array
    {
        return [
            'id'      => $this->id,
            'term'    => $this->term,
            'results' => $this->results
        ];
    }

    public function setValues($values)
    {
        $this->term    = $values['term'];
        $this->results = $values['results'];
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getTerm(): string
    {
        return $this->term;
    }

    public function setTerm(string $term)
    {
        $this->term = $term;
    }

    public function getResults(): string
    {
        return $this->results;
    }

    public function setResults(string $results)
    {
        $this->results = $results;
    }
}