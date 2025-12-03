<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'brand_id',
        'category_id',
        'name',
        'quantity',
        'physical_location',
        'description',
        'variations',
        'image_path',
        'branch_id',
        'brand_id',
        'category_id',
        'barcode',
        'qr_code',
        'created_by',
    ];

    protected $casts = [
        'variations' => 'array',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
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
