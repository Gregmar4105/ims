<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleReturn extends Model
{
    protected $fillable = [
        'sale_id',
        'product_id',
        'quantity',
        'returned_by',
        'reason',
        'return_type',
        'replacement_product_id',
        'replacement_quantity',
        'refund_amount',
        'restored_to_inventory',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function replacementProduct()
    {
        return $this->belongsTo(Product::class, 'replacement_product_id');
    }

    public function returnedBy()
    {
        return $this->belongsTo(User::class, 'returned_by');
    }
}
