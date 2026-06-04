<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'branch_id',
        'status',
        'readied_by',
        'approved_by',
        'notes',
        'payment_method',
        'ewallet_provider',
        'proof_of_payment_path',
        'home_credited_name',
        'downpayment',
        'cash_received',
        'change_amount',
        'customer_name',
        'reservation_buy_date',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function readiedBy()
    {
        return $this->belongsTo(User::class, 'readied_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function returns()
    {
        return $this->hasMany(SaleReturn::class);
    }
}
