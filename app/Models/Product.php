<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'brand_id',
        'category_id',
        'name',
        'code',
        'code_2',
        'sku',
        'description',
        'variations',
        'image_path',
        'barcode',
        'qr_code',
        'created_by',
        'price',
        'clearance_price',
        'clearance_until',
        'supplier_id',
        'status',
        'active_until_zero_days',
        'out_of_stock_since',
    ];

    protected $casts = [
        'variations' => 'array',
        'out_of_stock_since' => 'datetime',
        'clearance_until' => 'datetime',
    ];

    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_products')
                    ->withPivot('quantity', 'physical_location', 'reorder_level', 'description', 'variations')
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

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
