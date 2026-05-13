import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Clock } from 'lucide-react';

export default function ServerStatusMonitor() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                // Force Cloudflare to bypass cache by using a unique timestamp
                const response = await fetch('/api/server-status?t=' + Date.now(), { 
                    method: 'GET',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Server unreachable');
                }

                const data = await response.json();
                
                // Verify the signature that only our live Laravel app knows
                if (data.status !== 'online' || !data.signature?.startsWith('LM2-LIVE-SERVER-')) {
                    throw new Error('Invalid signature');
                }
                
                if (isOffline) {
                    setIsOffline(false);
                    toast.dismiss('server-offline');
                    toast.success('Server is back online!', {
                        description: 'You can now use all features of the application.',
                    });
                }
            } catch (error) {
                if (!isOffline) {
                    setIsOffline(true);
                    toast.error('Server is currently offline', {
                        id: 'server-offline',
                        duration: Infinity,
                        description: (
                            <div className="space-y-2 mt-1">
                                <p className="text-sm">You are viewing a cached version of the site.</p>
                                <div className="flex items-center gap-2 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-2 rounded">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Operating Hours: 7:00 AM - 10:00 PM</span>
                                </div>
                            </div>
                        ),
                        important: true,
                    });
                }
            }
        };

        // Check immediately on load
        checkStatus();

        // Then check every 30 seconds to see if it comes back
        const interval = setInterval(checkStatus, 30000);

        return () => clearInterval(interval);
    }, [isOffline]);

    return null; // This component doesn't render anything itself
}
