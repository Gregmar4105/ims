<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotificationView extends Model
{
    protected $fillable = [
        'user_id',
        'viewable_type',
        'viewable_id',
    ];
}
