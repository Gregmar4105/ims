<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\OneSignal\OneSignalChannel;
use NotificationChannels\OneSignal\OneSignalMessage;

class OneSignalTestNotification extends Notification
{
    public function __construct(
        public string $title,
        public string $body
    ) {}

    public function via($notifiable): array
    {
        return [OneSignalChannel::class];
    }

    public function toOneSignal($notifiable): OneSignalMessage
    {
        return OneSignalMessage::create()
            ->setSubject($this->title)
            ->setBody($this->body);
    }
}
