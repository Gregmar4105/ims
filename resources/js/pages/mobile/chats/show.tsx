import { useEffect, useState, useRef } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Send, Image as ImageIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Sender {
    id: number;
    name: string;
    branch_id: number;
    branch?: { branch_name: string };
}

interface Message {
    id: number;
    content: string;
    attachment_path: string | null;
    sender_id: number;
    receiver_branch_id: number;
    created_at: string;
    sender: Sender;
}

export default function MobileChatShow({ branchId }: { branchId: string }) {
    const { remoteApi, serverUrl, authUser } = useMobileApi();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [content, setContent] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (serverUrl) fetchMessages();
    }, [serverUrl, branchId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/chats/${branchId}`);
            // Pagination format: res.data.data
            setMessages(res.data.data ? [...res.data.data].reverse() : []);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || sending) return;

        setSending(true);
        try {
            const res = await remoteApi.post(`${serverUrl}/api/mobile/chats/${branchId}`, {
                content: content.trim()
            });
            setMessages(prev => [...prev, res.data]);
            setContent('');
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const resolveImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${serverUrl}/storage/${path}`;
    };

    return (
        <MobileLayout 
            title={`Branch Chat`}
            // Custom back button in the top bar logic
        >
            <div className="flex flex-col h-full relative">
                {/* ── Chat Messages ────────────────────────────────────────── */}
                <div className="flex-1 space-y-4 px-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === authUser?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
                                            isMe 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-card text-foreground rounded-tl-none border border-border'
                                        }`}>
                                            {!isMe && (
                                                <p className="text-[10px] font-bold uppercase opacity-50 mb-1">
                                                    {msg.sender.name}
                                                </p>
                                            )}
                                            
                                            {msg.attachment_path && (
                                                <img 
                                                    src={resolveImageUrl(msg.attachment_path)} 
                                                    className="rounded-lg mb-2 max-h-60 w-full object-cover" 
                                                    alt="attachment" 
                                                />
                                            )}
                                            
                                            <p className="text-[14px] leading-relaxed break-words">{msg.content}</p>
                                            
                                            <p className={`text-[9px] mt-1 text-right opacity-60`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </>
                    )}
                </div>

                {/* ── Message Input (Fixed at bottom within layout main) ───── */}
                <div className="fixed bottom-0 left-0 w-full p-4 bg-background border-t border-border z-50">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-lg mx-auto bg-card rounded-full border border-border px-4 py-1.5 shadow-sm">
                        <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder-muted-foreground py-2"
                            placeholder="Message"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        
                        <button 
                            disabled={!content.trim() || sending}
                            className={`p-1.5 rounded-full transition-all ${
                                content.trim() && !sending ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                            }`}
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            </div>
        </MobileLayout>
    );
}
