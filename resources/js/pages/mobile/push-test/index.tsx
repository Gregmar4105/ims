import { useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function PushTest() {
    const { remoteApi, authUser, serverUrl } = useMobileApi();
    const [title, setTitle] = useState('Hello from LM2');
    const [body, setBody] = useState('This is a test push notification.');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

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

    return (
        <MobileLayout title="Push Test">
            <div className="space-y-6">
                
                {/* Status Card */}
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-full ${authUser?.onesignal_player_id ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {authUser?.onesignal_player_id ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Push Registration Status</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {authUser?.onesignal_player_id 
                                    ? 'Your device is registered to receive push notifications.' 
                                    : 'No push token found. Please ensure notifications are allowed for this app.'}
                            </p>
                        </div>
                    </div>
                </div>

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

                        {status !== 'idle' && (
                            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                                status === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                                {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !authUser?.onesignal_player_id}
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
