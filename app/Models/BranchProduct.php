<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BranchProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'product_id',
        'quantity',
        'physical_location',
        'description',
        'variations',
    ];

    protected $casts = [
        'variations' => 'array',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
