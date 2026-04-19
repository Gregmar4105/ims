import React, { useState, useEffect } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Send, CheckCircle2, XCircle, Loader2, BellRing, RefreshCw, Info } from 'lucide-react';

export default function PushTest() {
    const { remoteApi, authUser, serverUrl, refreshUser, isHydrated, token } = useMobileApi();
    const [title, setTitle] = useState('Hello from LM2');
    const [body, setBody] = useState('This is a test push notification.');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isHydrated && token) {
            handleRefresh();
        }
    }, [isHydrated, token]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshUser();
        setRefreshing(false);
    };

    const handleEnroll = async () => {
        console.log('Requesting permission...');
        setEnrolling(true);
        setMessage('Triggering push enrollment...');
        setStatus('idle');
        
        try {
            // Trigger native push enrollment via the local NativePHP route
            const response = await fetch('/mobile/push-enroll', {
                method: 'GET',
                headers: { 
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
            });
            
            const text = await response.text();
            console.log('Enroll response:', response.status, text);
            
            setMessage('Push enrollment triggered! Token sync may take a few seconds...');
            setStatus('success');
            
            // Poll for token sync
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                await refreshUser();
                if (attempts >= 5) {
                    clearInterval(pollInterval);
                    setEnrolling(false);
                    setMessage('Enrollment complete. Tap refresh to check registration status.');
                }
            }, 3000);
        } catch (err) {
            console.error('Enrollment error:', err);
            setMessage('Network error during enrollment. Please try again.');
            setStatus('error');
            setEnrolling(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const res = await remoteApi.post(`${serverUrl}/api/mobile/push-test`, {
                title,
                body
            });
            setStatus('success');
            setMessage(res.data.message || 'Notification sent successfully!');
        } catch (err: any) {
            console.error('Push test error:', err?.response?.data);
            setStatus('error');
            setMessage(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to send notification');
        } finally {
            setLoading(false);
        }
    };

    const isRegistered = !!authUser?.onesignal_player_id;

    return (
        <MobileLayout title="Push Test">
            <div className="space-y-6 pb-10">
                
                {/* Status Card */}
                <div className="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
                    <button 
                        onClick={handleRefresh}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
                        disabled={refreshing}
                    >
                        <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-full ${isRegistered ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {isRegistered ? <CheckCircle2 className="w-6 h-6" /> : <BellRing className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">Push Registration</h3>
                            <p className="text-sm text-muted-foreground mt-1 pr-8">
                                {isRegistered 
                                    ? 'Your device is registered to receive push notifications.' 
                                    : 'No push token found on server. Tap the button below to request permission and register.'}
                            </p>
                            
                            {isRegistered && (
                                <div className="mt-2 p-2 rounded-lg bg-muted/50">
                                    <p className="text-xs font-mono text-muted-foreground truncate">
                                        ID: {authUser.onesignal_player_id}
                                    </p>
                                </div>
                            )}
                            
                            <button 
                                onClick={handleEnroll}
                                disabled={enrolling}
                                className="mt-4 flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-pointer z-20 disabled:opacity-50"
                            >
                                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                                {isRegistered ? 'Re-register' : 'Request Permission'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                {!isRegistered && (
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                <p className="font-medium">Setup Required</p>
                                <p>Push notifications require <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">google-services.json</code> from Firebase Console in your project root. Without it, the device can't generate a push token.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Message */}
                {message && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
                        status === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                        : status === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                        {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> 
                         : status === 'error' ? <XCircle className="w-4 h-4" /> 
                         : <Loader2 className="w-4 h-4 animate-spin" />}
                        {message}
                    </div>
                )}

                {/* Test Form */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Send className="w-4 h-4 text-primary" />
                            Send Test Notification
                        </h3>
                    </div>
                    
                    <form onSubmit={handleSend} className="p-5 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Notification Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Notification Body</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {loading ? 'Sending...' : 'Send Notification'}
                        </button>
                    </form>
                </div>
                
            </div>
        </MobileLayout>
    );
}
