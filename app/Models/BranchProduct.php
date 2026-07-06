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
        'reorder_level',
        'quantity_last_changed_at',
    ];

    protected $casts = [
        'variations' => 'array',
        'quantity_last_changed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if ($model->isDirty('quantity')) {
                $model->quantity_last_changed_at = now();
            }
        });
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
