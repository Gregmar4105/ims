<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduledCommand extends Model
{
    use HasFactory;

    protected $fillable = [
        'command',
        'target_servers',
        'scheduled_at',
        'status',
        'user_id',
        'is_recurring',
    ];

    protected $casts = [
        'target_servers' => 'array',
        'scheduled_at' => 'datetime',
        'is_recurring' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
