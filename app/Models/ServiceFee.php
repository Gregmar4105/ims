<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceFee extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'amount',
        'created_by',
        'sale_id',
        'payment_method',
        'cash_received',
        'split_ewallet_amount',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
