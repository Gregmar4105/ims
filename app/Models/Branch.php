<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use SoftDeletes;

    protected $table = "branches";

    protected $fillable = [
        'branch_name',
        'location',
        'branch_status',
        'google_maps_embed_code',
        'profile_photo_path',
        'sheet_snapshot',
        'last_sheet_sync_at',
    ];

    protected $casts = [
        'sheet_snapshot' => 'array',
        'last_sheet_sync_at' => 'datetime',
    ];

    protected $hidden = [
        'sheet_snapshot',
    ];

    
    public function users(): HasMany{
        return $this->hasMany(User::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'branch_products')
                    ->withPivot('quantity', 'physical_location', 'reorder_level', 'description', 'variations')
                    ->withTimestamps();
    }
}
