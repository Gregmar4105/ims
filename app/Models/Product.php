<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_id',
        'category_id',
        'name',
        'description',
        'variations',
        'image_path',
        'barcode',
        'qr_code',
        'created_by',
    ];

    protected $casts = [
        'variations' => 'array',
    ];

    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_products')
                    ->withPivot('quantity', 'physical_location')
                    ->withTimestamps();
    }

    public function branchProducts()
    {
        return $this->hasMany(BranchProduct::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
