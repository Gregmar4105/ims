<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    protected $fillable = [
        'source_branch_id',
        'destination_branch_id',
        'supplier_id',
        'status',
        'status',
        'readied_by',
        'approved_by',
        'received_by',
        'notes',
    ];

    public function sourceBranch()
    {
        return $this->belongsTo(Branch::class, 'source_branch_id');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function destinationBranch()
    {
        return $this->belongsTo(Branch::class, 'destination_branch_id');
    }

    public function readiedBy()
    {
        return $this->belongsTo(User::class, 'readied_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items()
    {
        return $this->hasMany(TransferItem::class);
    }
}
