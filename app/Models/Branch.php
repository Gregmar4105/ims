<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    protected $table = "branches";

    protected $fillable = [
        'branch_name',
        'location',
        'branch_status',
    ];
    
    public function users(): HasMany{
        return $this->hasMany(User::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'branch_products')
                    ->withPivot('quantity', 'physical_location')
                    ->withTimestamps();
    }
}
