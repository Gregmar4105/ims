import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { Send, Search, MessageSquare, MoreVertical, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import axios from 'axios';

// Add global declarations
declare global {
    interface Window {
        Echo: any;
    }
}

interface Branch {
    id: number;
    branch_name: string;
}

interface User {
    id: number;
    name: string;
    branch_id: number;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_branch_id: number;
    content: string;
    created_at: string;
    sender: User;
}

export default function ChatsIndex({ branches }: { branches: Branch[] }) {
    const user = usePage().props.auth.user as User;
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedBranchRef = useRef<Branch | null>(null);

    // Filter branches
    const filteredBranches = branches.filter(branch =>
        branch.branch_name && branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    function scrollToBottom() {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }

    // Update ref when selectedBranch changes
    useEffect(() => {
        selectedBranchRef.current = selectedBranch;
    }, [selectedBranch]);

    // Fetch messages when branch selected
    useEffect(() => {
        if (selectedBranch) {
            axios.get(`/chats/${selectedBranch.id}`)
                .then(response => {
                    setMessages(response.data);
                    scrollToBottom();
                });
        }
    }, [selectedBranch]);

    // Listen for new messages
    useEffect(() => {
        // Listen to my branch's channel
        console.log(`Subscribing to channel: chat.branch.${user.branch_id}`);
        const channel = window.Echo.channel(`chat.branch.${user.branch_id}`);

        channel.listen('.message.sent', (e: { message: Message }) => {
            console.log('Message received:', e);
            const currentSelectedBranch = selectedBranchRef.current;

            if (currentSelectedBranch && e.message.sender.branch_id === currentSelectedBranch.id) {
                console.log('Message matches selected branch, adding to list');
                setMessages(prev => [...prev, e.message]);
                scrollToBottom();
            } else {
                console.log('Message does not match selected branch', {
                    msgSenderBranch: e.message.sender.branch_id,
                    selectedBranchId: currentSelectedBranch?.id
                });
            }
        });

        return () => {
            console.log(`Unsubscribing from channel: chat.branch.${user.branch_id}`);
            channel.stopListening('.message.sent');
        };
    }, [user.branch_id]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedBranch) return;

        const tempMessage = newMessage;
        setNewMessage('');

        axios.post(`/chats/${selectedBranch.id}`, {
            content: tempMessage
        }).then(response => {
            setMessages(prev => [...prev, response.data]);
            scrollToBottom();
        }).catch(error => {
            console.error("Failed to send", error);
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Chats', href: '/chats' }]}>
            <Head title="Chats" />

            <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background border rounded-lg shadow-sm m-4">
                {/* Sidebar */}
                <div className="w-80 border-r flex flex-col bg-muted/10">
                    <div className="p-4 border-b">
                        <h2 className="text-xl font-bold mb-4">Chats</h2>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search branches..."
                                className="pl-8 bg-background"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2 space-y-1">
                            {filteredBranches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSelectedBranch(branch)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                                        selectedBranch?.id === branch.id
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <Avatar>
                                        <AvatarFallback>{branch.branch_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <h3 className="font-medium truncate">{branch.branch_name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            Click to start chatting
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-background">
                    {selectedBranch ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b flex items-center justify-between shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback>{selectedBranch.branch_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold">{selectedBranch.branch_name}</h3>
                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Active Now
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon"><Phone className="w-5 h-5" /></Button>
                                    <Button variant="ghost" size="icon"><Video className="w-5 h-5" /></Button>
                                    <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 p-4 bg-muted/5 overflow-y-auto">
                                <div className="space-y-4 max-w-3xl mx-auto">
                                    {messages.map((msg, index) => {
                                        const isMe = msg.sender_id === user.id;
                                        return (
                                            <div
                                                key={msg.id || index}
                                                className={cn(
                                                    "flex gap-2 max-w-[80%]",
                                                    isMe ? "ml-auto flex-row-reverse" : ""
                                                )}
                                            >
                                                {!isMe && (
                                                    <Avatar className="w-8 h-8 mt-1">
                                                        <AvatarFallback>{msg.sender.name.substring(0, 1)}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div className={cn(
                                                    "p-3 rounded-2xl shadow-sm",
                                                    isMe
                                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                                        : "bg-card border rounded-tl-none"
                                                )}>
                                                    <p className="text-sm">{msg.content}</p>
                                                    <span className="text-[10px] opacity-70 mt-1 block">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t bg-background">
                                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
                                    <Input
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 rounded-full"
                                    />
                                    <Button type="submit" size="icon" className="rounded-full" disabled={!newMessage.trim()}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-10 h-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Select a branch to chat</h3>
                            <p>Choose a branch from the sidebar to start messaging.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
