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

        const messageContent = content.trim();
        const tempId = Date.now();
        
        // Optimistic UI Update
        const optimisticMessage: Message = {
            id: tempId,
            content: messageContent,
            attachment_path: null,
            sender_id: authUser?.id || 0,
            receiver_branch_id: parseInt(branchId),
            created_at: new Date().toISOString(),
            sender: {
                id: authUser?.id || 0,
                name: authUser?.name || 'Me',
                branch_id: authUser?.branch_id || 0,
                profile_photo_path: authUser?.profile_photo_path
            }
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setContent('');
        // setSending(true); // Don't block the UI

        try {
            const res = await remoteApi.post(`${serverUrl}/api/mobile/chats/${branchId}`, {
                content: messageContent
            });
            // Replace the optimistic message with the real one from the server
            setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
        } catch (err) {
            console.error('Failed to send message:', err);
            // Optionally remove the optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert('Failed to send message. Please try again.');
        } finally {
            // setSending(false);
        }
    };

    const resolveImageUrl = (path: string | undefined | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${serverUrl}/storage/${path}`;
    };

    return (
        <MobileLayout 
            title={`Branch Chat`}
        >
            <div className="flex flex-col h-full relative">
                {/* ── Chat Messages ────────────────────────────────────────── */}
                <div className="flex-1 space-y-6 px-2 pb-24">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === authUser?.id;
                                const avatarUrl = resolveImageUrl(msg.sender?.profile_photo_path);
                                
                                return (
                                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar - Only show for others */}
                                        {!isMe && (
                                            <div className="shrink-0 mb-1">
                                                {avatarUrl ? (
                                                    <img 
                                                        src={avatarUrl} 
                                                        className="w-8 h-8 rounded-full object-cover border border-border shadow-sm" 
                                                        alt="avatar" 
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                                                        <span className="text-[10px] font-bold text-primary">
                                                            {msg.sender.name.charAt(0)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Bubble */}
                                        <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-2.5 shadow-sm ${
                                            isMe 
                                                ? 'bg-primary text-primary-foreground rounded-br-none' 
                                                : 'bg-card text-foreground rounded-bl-none border border-border'
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
                                            
                                            <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                                                <p className="text-[8px] font-bold">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </>
                    )}
                </div>

                {/* ── Message Input (Fixed at bottom within layout main) ───── */}
                <div className="fixed bottom-0 left-0 w-full p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background/80 backdrop-blur-md border-t border-border z-50">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-lg mx-auto bg-card rounded-3xl border border-border px-4 py-1.5 shadow-lg">
                        <button type="button" className="text-muted-foreground hover:text-primary transition-colors p-1">
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 py-2"
                            placeholder="Message"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        
                        <button 
                            disabled={!content.trim()}
                            className={`p-2 rounded-full transition-all active:scale-95 ${
                                content.trim() ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground opacity-50'
                            }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </MobileLayout>
    );
}
