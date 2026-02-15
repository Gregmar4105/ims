import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { Send, Search, MessageSquare, MoreVertical, ArrowLeft, Truck, Clock, FileText, Paperclip, X, Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    attachment_path?: string | null;
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

// Utility to compress image
const compressImage = async (file: File): Promise<File> => {
    // If file is already small, return it
    if (file.size < 2 * 1024 * 1024) return file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Max dimension constraint
            const MAX_DIMENSION = 1920;
            if (width > height) {
                if (width > MAX_DIMENSION) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            // Attempt compression
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas to Blob failed'));
                        return;
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                },
                'image/jpeg',
                0.7 // Quality
            );
        };
        img.onerror = (error) => reject(error);
    });
};

export default function ChatsIndex({ branches, activeTransfers = [] }: { branches: Branch[], activeTransfers?: Transfer[] }) {
    const { auth } = usePage().props as any;
    const user = auth.user as User;
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedBranchRef = useRef<Branch | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef<Message[]>(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const [isCompressing, setIsCompressing] = useState(false);

    // New Feature States
    const [searchMode, setSearchMode] = useState(false);
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [mediaGallery, setMediaGallery] = useState<{ [date: string]: { id: number, attachment_path: string }[] }>({});
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

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

    function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior });
            }
        }, 100);
    }

    // Fetch Media
    const fetchMedia = () => {
        if (!selectedBranch) return;
        axios.get(`/chats/${selectedBranch.id}/media`)
            .then(res => setMediaGallery(res.data));
    };

    // Load Older Messages
    const loadMoreMessages = async () => {
        if (!selectedBranch || !messages.length || isLoadingMore || !hasMoreMessages) return;

        setIsLoadingMore(true);
        const oldestMessageId = messages[0].id;

        try {
            const response = await axios.get(`/chats/${selectedBranch.id}`, {
                params: { before_id: oldestMessageId }
            });

            if (response.data.length === 0) {
                setHasMoreMessages(false);
            } else {
                setMessages(prev => [...response.data, ...prev]);
            }
        } catch (error) {
            console.error("Failed to load older messages", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Handle Scroll for Pagination
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && hasMoreMessages) {
            loadMoreMessages();
        }
    };

    // Search Messages
    useEffect(() => {
        if (selectedBranch && searchMode) {
            const delayDebounceFn = setTimeout(() => {
                axios.get(`/chats/${selectedBranch.id}`, {
                    params: { query: messageSearchQuery }
                }).then(response => {
                    setMessages(response.data);
                    // Disable pagination during search for simplicity or keep it if API supports it
                    setHasMoreMessages(false);
                });
            }, 500);

            return () => clearTimeout(delayDebounceFn);
        }
    }, [messageSearchQuery, searchMode, selectedBranch]);

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
            setSearchMode(false);
            setMessageSearchQuery('');
            setHasMoreMessages(true);
            axios.get(`/chats/${selectedBranch.id}`)
                .then(response => {
                    setMessages(response.data);
                    scrollToBottom('auto');
                });
        }
    }, [selectedBranch]);

    // Polling Logic
    useEffect(() => {
        if (!selectedBranch) return;

        const pollInterval = setInterval(() => {
            const currentMsgs = messagesRef.current;
            const lastMsg = currentMsgs.length > 0 ? currentMsgs[currentMsgs.length - 1] : null;
            const afterId = lastMsg ? lastMsg.id : 0;

            if (afterId > 0) {
                axios.get(`/chats/${selectedBranch.id}`, {
                    params: { after_id: afterId }
                }).then(response => {
                    const newMessages = response.data;
                    if (newMessages && newMessages.length > 0) {
                        setMessages(prev => {
                            // Filter out any messages that already exist in state (e.g., from immediate send or race condition)
                            const unique = newMessages.filter((nm: Message) => !prev.some(ex => ex.id === nm.id));

                            if (unique.length > 0) {
                                setTimeout(() => scrollToBottom(), 100);
                                return [...prev, ...unique];
                            }
                            return prev;
                        });
                    }
                }).catch(err => {
                    console.error("Polling error", err);
                });
            }
        }, 2000); // 2 seconds

        return () => clearInterval(pollInterval);
    }, [selectedBranch]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            try {
                const processedFile = await compressImage(file);

                // Double check size
                if (processedFile.size > 2 * 1024 * 1024) {
                    alert("Image is still too large after compression. Please try a smaller image.");
                    setAttachment(null);
                    setPreviewUrl(null);
                    return;
                }

                setAttachment(processedFile);
                const url = URL.createObjectURL(processedFile);
                setPreviewUrl(url);
            } catch (error) {
                console.error("Compression failed", error);
                alert("Failed to process image.");
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const clearAttachment = () => {
        setAttachment(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachment) || !selectedBranch) return;

        const formData = new FormData();
        formData.append('content', newMessage);
        if (attachment) {
            formData.append('attachment', attachment);
        }

        // Optimistic UI could go here, but for files it's tricky.
        // We'll rely on the comprehensive response.

        setNewMessage('');
        clearAttachment();

        axios.post(`/chats/${selectedBranch.id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }).then(response => {
            setMessages(prev => {
                // Deduplicate immediate send response against any potential polling race
                if (prev.some(m => m.id === response.data.id)) return prev;
                return [...prev, response.data];
            });
            scrollToBottom();
        }).catch(error => {
            console.error("Failed to send", error);
            alert("Failed to send message. Please try again.");
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
                                                <DropdownMenuItem onClick={() => {
                                                    setSearchMode(!searchMode);
                                                    if (!searchMode) setTimeout(() => document.getElementById('msg-search')?.focus(), 100);
                                                }}>
                                                    Search in Conversation
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    setIsMediaOpen(true);
                                                    fetchMedia();
                                                }}>
                                                    View Media History
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Media Gallery Dialog */}
                                        <Dialog open={isMediaOpen} onOpenChange={setIsMediaOpen}>
                                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Media History</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-6">
                                                    {Object.entries(mediaGallery).length === 0 ? (
                                                        <p className="text-center text-muted-foreground py-8">No media found.</p>
                                                    ) : (
                                                        Object.entries(mediaGallery).map(([date, items]) => (
                                                            <div key={date}>
                                                                <h4 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                                                                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </h4>
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                    {items.map((item) => (
                                                                        <div key={item.id} className="aspect-square relative group overflow-hidden rounded-md border bg-muted">
                                                                            <img
                                                                                src={`/storage/${item.attachment_path}`}
                                                                                alt="History"
                                                                                className="object-cover w-full h-full transition-transform group-hover:scale-105 cursor-pointer"
                                                                                onClick={() => window.open(`/storage/${item.attachment_path}`, '_blank')}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
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



                                {/* Search Bar Overlay */}
                                {searchMode && (
                                    <div className="bg-background border-b p-2 px-4 animate-in slide-in-from-top-2 flex items-center gap-2">
                                        <Search className="w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="msg-search"
                                            placeholder="Search messages..."
                                            value={messageSearchQuery}
                                            onChange={e => setMessageSearchQuery(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setSearchMode(false);
                                            setMessageSearchQuery('');
                                            // Reset to normal view
                                            if (selectedBranch) {
                                                axios.get(`/chats/${selectedBranch.id}`).then(res => {
                                                    setMessages(res.data);
                                                    setHasMoreMessages(true);
                                                    scrollToBottom("auto");
                                                });
                                            }
                                        }}>
                                            Cancel
                                        </Button>
                                    </div>
                                )}

                                {/* Messages */}
                                <div
                                    className="flex-1 p-4 bg-muted/5 overflow-y-auto"
                                    onScroll={handleScroll}
                                >
                                    <div className="space-y-4 max-w-7xl mx-auto">
                                        {isLoadingMore && (
                                            <div className="flex justify-center py-2">
                                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
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
                                                            {msg.attachment_path && (
                                                                <div className="mb-2">
                                                                    <img
                                                                        src={`/storage/${msg.attachment_path}`}
                                                                        alt="Attachment"
                                                                        className="rounded-lg max-h-60 object-contain cursor-pointer"
                                                                        onClick={() => window.open(`/storage/${msg.attachment_path}`, '_blank')}
                                                                    />
                                                                </div>
                                                            )}
                                                            {msg.content && <p className="text-sm">{msg.content}</p>}
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
                                    <div className="max-w-3xl mx-auto">
                                        {/* Preview Area */}
                                        {previewUrl && (
                                            <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg w-fit">
                                                <div className="relative h-16 w-16">
                                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover rounded" />
                                                    {isCompressing && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] rounded">
                                                            Processing...
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs truncate max-w-[150px]">
                                                    {isCompressing ? 'Compressing...' : attachment?.name}
                                                    {attachment && <div className="opacity-50">{(attachment.size / 1024 / 1024).toFixed(2)} MB</div>}
                                                </div>
                                                <button onClick={clearAttachment} className="p-1 hover:bg-muted-foreground/20 rounded-full">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                                            {/* File Input */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                            />
                                            {/* Camera Input */}
                                            <input
                                                type="file"
                                                ref={cameraInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleFileSelect}
                                            />

                                            <div className="flex gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted"
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    title="Take Photo"
                                                >
                                                    <Camera className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    title="Attach File"
                                                >
                                                    <Paperclip className="w-5 h-5" />
                                                </Button>
                                            </div>

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
                                            <Button
                                                type="submit"
                                                size="icon"
                                                className="rounded-full h-10 w-10 shrink-0"
                                                disabled={(!newMessage.trim() && !attachment) || isCompressing}
                                            >
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    </div>
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
