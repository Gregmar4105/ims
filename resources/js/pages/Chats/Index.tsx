import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { Send, Search, MessageSquare, MoreVertical, ArrowLeft, Truck, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    profile_photo_url?: string;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_branch_id: number;
    content: string;
    created_at: string;
    sender: User;
}

interface Transfer {
    id: number;
    source_branch_id: number;
    destination_branch_id: number;
    status: string;
    created_at: string;
    destination_branch: Branch;
    source_branch: Branch;
}

export default function ChatsIndex({ branches, activeTransfers = [] }: { branches: Branch[], activeTransfers?: Transfer[] }) {
    const user = usePage().props.auth.user as User;
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedBranchRef = useRef<Branch | null>(null);

    // Contextual transfers for selected branch
    const branchTransfers = selectedBranch ? activeTransfers.filter(t => {
        const isSourceMe = t.source_branch_id == user.branch_id;
        const isDestMe = t.destination_branch_id == user.branch_id;
        const isSourceSelected = t.source_branch_id == selectedBranch.id;
        const isDestSelected = t.destination_branch_id == selectedBranch.id;

        const match = (isSourceMe && isDestSelected) || (isDestMe && isSourceSelected);
        return match;
    }) : [];

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

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [newMessage]);

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

            if (currentSelectedBranch) {
                // Ignore my own messages (handled by handleSendMessage response)
                if (e.message.sender_id === user.id) {
                    console.log('Ignoring own message from Echo');
                    return;
                }

                const isIncoming = e.message.sender.branch_id === currentSelectedBranch.id;
                const isOutgoing = e.message.receiver_branch_id === currentSelectedBranch.id;

                if (isIncoming || isOutgoing) {
                    console.log('Message matches selected branch, adding to list');
                    setMessages(prev => [...prev, e.message]);
                    scrollToBottom();
                } else {
                    console.log('Message does not match selected branch', {
                        msg: e.message,
                        selectedBranchId: currentSelectedBranch.id
                    });
                }
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

            <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-background border-t">

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className={cn(
                        "w-full md:w-80 border-r flex-col bg-muted/10",
                        selectedBranch ? "hidden md:flex" : "flex"
                    )}>
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
                    <div className={cn(
                        "flex-1 flex-col bg-background",
                        !selectedBranch ? "hidden md:flex" : "flex"
                    )}>
                        {selectedBranch ? (
                            <>
                                {/* Header */}
                                <div className="p-4 border-b flex items-center justify-between shadow-sm z-10">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="md:hidden -ml-2"
                                            onClick={() => setSelectedBranch(null)}
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </Button>
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Chat Options</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                    View Chat History
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    Search in Conversation
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Pinned Active Transfers for THIS Chat */}
                                {branchTransfers.length > 0 && (
                                    <div className="bg-blue-50/50 border-b p-3 flex flex-col gap-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 shadow-inner">
                                        {branchTransfers.map(transfer => {
                                            const isIncoming = transfer.destination_branch_id === user.branch_id;

                                            // Incoming (always outgoing status because of backend filter)
                                            if (isIncoming) {
                                                return (
                                                    <div key={transfer.id} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Truck className="w-4 h-4" />
                                                            <span className="font-medium">Incoming Transfer:</span>
                                                            <span className="bg-white/50 px-2 py-0.5 rounded border border-blue-100 dark:bg-blue-800/50 dark:border-blue-700">
                                                                #{transfer.id}
                                                            </span>
                                                        </div>
                                                        <a
                                                            href="/incoming"
                                                            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                                                        >
                                                            <span>Receive Delivery</span>
                                                            <ArrowLeft className="w-3 h-3 rotate-180" />
                                                        </a>
                                                    </div>
                                                );
                                            }

                                            // Outgoing
                                            const isReadied = transfer.status === 'readied';
                                            return (
                                                <div key={transfer.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {isReadied ? <FileText className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                                                        <span className="font-medium">
                                                            {isReadied ? "Pending Approval:" : "Outgoing Transfer:"}
                                                        </span>
                                                        <span className="bg-white/50 px-2 py-0.5 rounded border border-blue-100 dark:bg-blue-800/50 dark:border-blue-700">
                                                            #{transfer.id}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 text-xs opacity-70">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{isReadied ? "Waiting for admin" : "On the way"}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Messages */}
                                <div className="flex-1 p-4 bg-muted/5 overflow-y-auto">
                                    <div className="space-y-4 max-w-5xl mx-auto">
                                        {messages.map((msg, index) => {
                                            const isMe = msg.sender_id === user.id;
                                            return (
                                                <div
                                                    key={msg.id || index}
                                                    className={cn(
                                                        "flex gap-2 max-w-[85%]",
                                                        isMe ? "ml-auto flex-row-reverse" : ""
                                                    )}
                                                >
                                                    {!isMe && (
                                                        <Avatar className="w-8 h-8 mt-1">
                                                            <AvatarImage src={msg.sender?.profile_photo_url} />
                                                            <AvatarFallback>{msg.sender?.name?.substring(0, 1) || '?'}</AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                                                        <span className="text-[10px] text-muted-foreground mb-1 px-1">
                                                            {msg.sender?.name || 'Unknown User'}
                                                        </span>
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
                                                </div>
                                            );
                                        })}
                                        <div ref={scrollRef} />
                                    </div>
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t bg-background">
                                    <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto items-end">
                                        <Textarea
                                            ref={textareaRef}
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                            placeholder="Type a message..."
                                            className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-2xl py-3"
                                            rows={1}
                                        />
                                        <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={!newMessage.trim()}>
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
            </div>
        </AppLayout>
    );
}
