import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { Send, Search, MessageSquare, MoreVertical, ArrowLeft, ChevronLeft, Truck, Clock, FileText, Paperclip, X, Camera, Image as ImageIcon, Loader2, Reply } from 'lucide-react';
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
import { toast } from 'sonner';

// Add global declarations
declare global {
    interface Window {
        Echo: any;
    }
}

interface Branch {
    id: number;
    branch_name: string;
    profile_photo_path?: string | null;
}

interface User {
    id: number;
    name: string;
    branch_id: number;
    profile_photo_url?: string;
    branch?: Branch;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_branch_id: number;
    content: string;
    attachment_path?: string | null;
    created_at: string;
    sender: User;
    reply_to_message_id?: number | null;
    reply_to?: Message | null;
}

interface SwipeToReplyProps {
    children: React.ReactNode;
    onReply: () => void;
}

function SwipeToReply({ children, onReply }: SwipeToReplyProps) {
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isSwipeTriggered, setIsSwipeTriggered] = useState(false);
    const threshold = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setStartY(e.touches[0].clientY);
        setCurrentX(e.touches[0].clientX);
        setIsSwiping(false);
        setIsSwipeTriggered(false);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const diffX = e.touches[0].clientX - startX;
        const diffY = e.touches[0].clientY - startY;

        // Swiping left shifts the message bubble to the left to show the reply icon on the right.
        if (diffX < 0 && Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > 10) {
                setIsSwiping(true);
            }
            if (isSwiping) {
                const translateX = Math.max(diffX, -80);
                setCurrentX(startX + translateX);
                setIsSwipeTriggered(Math.abs(translateX) >= threshold);
            }
        }
    };

    const handleTouchEnd = () => {
        const diffX = currentX - startX;
        if (isSwiping && Math.abs(diffX) >= threshold) {
            onReply();
        }
        setIsSwiping(false);
        setIsSwipeTriggered(false);
        setStartX(0);
        setCurrentX(0);
    };

    const translation = isSwiping ? Math.max(currentX - startX, -80) : 0;

    return (
        <div className="relative w-full overflow-hidden">
            {isSwiping && (
                <div 
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200"
                    style={{
                        opacity: Math.min(Math.abs(translation) / threshold, 1),
                        transform: `scale(${Math.min(Math.abs(translation) / threshold, 1.1)}) translateY(-50%)`,
                        color: isSwipeTriggered ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    }}
                >
                    <Reply className="w-5 h-5" />
                </div>
            )}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${translation}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.1, 0.8, 0.25, 1)',
                }}
            >
                {children}
            </div>
        </div>
    );
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

export default function BranchChatIndex({ branch }: { branch: Branch }) {
    const { auth } = usePage().props as any;
    const user = auth.user as User;
    const selectedBranch = branch;
    const setSelectedBranch = (b: any) => { };
    const branches = [branch];
    const activeTransfers: Transfer[] = [];
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
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);

    const scrollToMessage = (replyToId: number) => {
        const element = document.getElementById(`msg-${replyToId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(replyToId);
            setTimeout(() => {
                setHighlightedMessageId(null);
            }, 1500);
        } else {
            toast.error("Original message not loaded. Scroll up to load older messages.");
        }
    };

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
        // Immediate attempt
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior });
        }
        // Delayed attempts to account for rendering/image loading
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior });
            }
        }, 300);
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior });
            }
        }, 1000);
    }

    // Fetch Media
    const fetchMedia = () => {
        if (!selectedBranch) return;
        axios.get(`/branch-chats/media`)
            .then(res => setMediaGallery(res.data));
    };

    // Load Older Messages
    const loadMoreMessages = async () => {
        if (!selectedBranch || !messages.length || isLoadingMore || !hasMoreMessages) return;

        // Capture current scroll height before loading
        const container = scrollRef.current?.parentElement;
        const oldHeight = container?.scrollHeight || 0;
        const oldScrollTop = container?.scrollTop || 0;

        setIsLoadingMore(true);
        const oldestMessageId = messages[0].id;

        try {
            const response = await axios.get(`/branch-chats/messages`, {
                params: { before_id: oldestMessageId }
            });

            if (response.data.length === 0) {
                setHasMoreMessages(false);
            } else {
                setMessages(prev => [...response.data, ...prev]);

                // Restore scroll position after render
                // We use requestAnimationFrame/setTimeout to ensure DOM updated
                requestAnimationFrame(() => {
                    if (container) {
                        const newHeight = container.scrollHeight;
                        // Determine how much height was added
                        const heightDifference = newHeight - oldHeight;
                        // Adjust scroll top to maintain visual position
                        container.scrollTop = heightDifference + oldScrollTop;
                    }
                });
            }
        } catch (error) {
            console.error("Failed to load older messages", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Handle Scroll for Pagination
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // Add a small buffer (e.g., 10px) to trigger before hitting hard top, 
        // but strictly checking 0 is fine if it works. 
        // Added !isLoadingMore check to prevent double triggers
        if (e.currentTarget.scrollTop === 0 && hasMoreMessages && !isLoadingMore) {
            loadMoreMessages();
        }
    };

    // Search Messages
    useEffect(() => {
        if (selectedBranch && searchMode) {
            const delayDebounceFn = setTimeout(() => {
                axios.get(`/branch-chats/messages`, {
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
            axios.get(`/branch-chats/messages`)
                .then(response => {
                    const sorted = response.data.sort((a: Message, b: Message) => a.id - b.id);
                    setMessages(sorted);
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
                axios.get(`/branch-chats/messages`, {
                    params: { after_id: afterId }
                }).then(response => {
                    const newMessages = response.data;
                    if (newMessages && newMessages.length > 0) {
                        setMessages(prev => {
                            // Filter out any messages that already exist in state (e.g., from immediate send or race condition)
                            const unique = newMessages.filter((nm: Message) => !prev.some(ex => ex.id === nm.id));

                            if (unique.length > 0) {
                                // Check if user is near bottom before auto-scrolling
                                const container = scrollRef.current?.parentElement;
                                const isAtBottom = container ?
                                    (container.scrollHeight - container.scrollTop - container.clientHeight < 200) : true;

                                if (isAtBottom) {
                                    setTimeout(() => scrollToBottom(), 100);
                                }
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
        if (replyingToMessage) {
            formData.append('reply_to_message_id', String(replyingToMessage.id));
        }

        // Optimistic UI could go here, but for files it's tricky.
        // We'll rely on the comprehensive response.

        setNewMessage('');
        clearAttachment();
        setReplyingToMessage(null);

        axios.post(`/branch-chats/messages`, formData, {
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
        <AppLayout breadcrumbs={[{ title: 'Branch Chat', href: '/branch-chats' }]}>
            <Head title="Branch Chat" />

            <style>{`
                nav.fixed.bottom-0 {
                    display: none !important;
                }
            `}</style>

            <div className="flex flex-col h-full md:h-[calc(100vh-theme(spacing.16))] bg-background md:border-t">

                <div className="flex flex-1 overflow-hidden">
                    {/* Chat Area */}
                    <div className={cn(
                        "flex-1 flex-col bg-background flex"
                    )}>
                        {selectedBranch ? (
                            <>
                                {/* Header */}
                                <div className="pt-[env(safe-area-inset-top,0px)] h-[calc(4rem+env(safe-area-inset-top,0px))] px-4 flex items-center justify-between border-b shadow-sm z-10 bg-background md:h-auto md:p-4 md:pt-4">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="md:hidden -ml-2"
                                            onClick={() => {
                                                router.visit('/employee-dashboard');
                                            }}
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </Button>
                                        <Avatar>
                                            <AvatarImage src={selectedBranch.profile_photo_path ? `/storage/${selectedBranch.profile_photo_path}` : undefined} />
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
                                                                                onClick={() => setPreviewImage(`/storage/${item.attachment_path}`)}
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
                                            const isRequested = transfer.status === 'requested';
                                            const isIncoming = transfer.destination_branch_id === user.branch_id;

                                            // Request Order (status requested)
                                            if (isRequested) {
                                                if (isIncoming) {
                                                    // Requesting branch's perspective (they made the request, awaiting LM2 approval)
                                                    return (
                                                        <div key={transfer.id} className="flex items-center justify-between text-violet-800 dark:text-violet-200">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4 text-violet-500 animate-spin" />
                                                                <span className="font-semibold">Pending Request Order:</span>
                                                                <span className="bg-violet-100/50 px-2 py-0.5 rounded border border-violet-200 dark:bg-violet-900/50 dark:border-violet-800 font-mono">
                                                                    #{transfer.id}
                                                                </span>
                                                            </div>
                                                            <a
                                                                href="/incoming"
                                                                className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 hover:underline dark:text-violet-400"
                                                            >
                                                                <span>View My Requests</span>
                                                                <ArrowLeft className="w-3 h-3 rotate-180" />
                                                            </a>
                                                        </div>
                                                    );
                                                } else {
                                                    // LM2 Main Bodega's perspective (incoming request from another branch)
                                                    return (
                                                        <div key={transfer.id} className="flex items-center justify-between text-violet-800 dark:text-violet-200">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-violet-500" />
                                                                <span className="font-semibold">Incoming Request Order:</span>
                                                                <span className="bg-violet-100/50 px-2 py-0.5 rounded border border-violet-200 dark:bg-violet-900/50 dark:border-violet-800 font-mono">
                                                                    #{transfer.id}
                                                                </span>
                                                            </div>
                                                            <a
                                                                href="/outgoing"
                                                                className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 hover:underline dark:text-violet-400"
                                                            >
                                                                <span>Approve & Transfer</span>
                                                                <ArrowLeft className="w-3 h-3 rotate-180" />
                                                            </a>
                                                        </div>
                                                    );
                                                }
                                            }

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
                                                axios.get(`/branch-chats/messages`).then(res => {
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
                                            const showDateSeparator = index === 0 ||
                                                new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

                                            const formatDateLabel = (dateString: string) => {
                                                const date = new Date(dateString);
                                                const today = new Date();
                                                const yesterday = new Date();
                                                yesterday.setDate(yesterday.getDate() - 1);

                                                if (date.toDateString() === today.toDateString()) {
                                                    return "Today";
                                                } else if (date.toDateString() === yesterday.toDateString()) {
                                                    return "Yesterday";
                                                } else {
                                                    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                                }
                                            };

                                            return (
                                                <div 
                                                    key={msg.id || index} 
                                                    id={`msg-${msg.id}`}
                                                    className={cn(
                                                        "flex flex-col gap-4 transition-all duration-500 rounded-2xl p-1",
                                                        highlightedMessageId === msg.id 
                                                            ? "bg-primary/10 scale-[1.01] ring-1 ring-primary/30" 
                                                            : ""
                                                    )}
                                                >
                                                    {showDateSeparator && (
                                                        <div className="flex justify-center my-2 sticky top-0 z-10">
                                                            <span className="text-xs font-medium text-muted-foreground bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border">
                                                                {formatDateLabel(msg.created_at)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <SwipeToReply onReply={() => setReplyingToMessage(msg)}>
                                                        <div
                                                            className={cn(
                                                                "flex gap-2 max-w-[85%] group relative",
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
                                                                <div className="flex items-center gap-2">
                                                                    <div className={cn(
                                                                        "p-3 rounded-2xl shadow-sm relative",
                                                                        isMe
                                                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                                                            : "bg-card border rounded-tl-none"
                                                                    )}>
                                                                        {msg.reply_to && (
                                                                            <div 
                                                                                onClick={() => scrollToMessage(msg.reply_to!.id)}
                                                                                className={cn(
                                                                                    "mb-2 p-2 rounded-lg text-xs cursor-pointer select-none border-l-2 text-left truncate max-w-xs transition-colors",
                                                                                    isMe 
                                                                                        ? "bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground/90 hover:bg-primary-foreground/20" 
                                                                                        : "bg-muted border-primary/40 text-muted-foreground hover:bg-muted/80"
                                                                                )}
                                                                            >
                                                                                <div className="font-semibold truncate">
                                                                                    {msg.reply_to.sender?.name || "Unknown User"}
                                                                                </div>
                                                                                <div className="truncate opacity-85">
                                                                                    {msg.reply_to.content || (msg.reply_to.attachment_path ? "📷 Photo" : "")}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {msg.attachment_path && (
                                                                            <div className="mb-2">
                                                                                <img
                                                                                    src={`/storage/${msg.attachment_path}`}
                                                                                    alt="Attachment"
                                                                                    className="rounded-lg max-h-60 object-contain cursor-pointer"
                                                                                    onClick={() => setPreviewImage(`/storage/${msg.attachment_path}`)}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        {msg.content && <p className="text-sm">{msg.content}</p>}
                                                                        <span className="text-[10px] opacity-70 mt-1 block">
                                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="hidden md:flex opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full transition-opacity shrink-0 text-muted-foreground hover:bg-muted"
                                                                        onClick={() => setReplyingToMessage(msg)}
                                                                        title="Reply"
                                                                    >
                                                                        <Reply className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </SwipeToReply>
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

                                        {/* Reply Preview Area */}
                                        {replyingToMessage && (
                                            <div className="flex items-center justify-between gap-3 p-3 bg-muted/60 border border-b-0 rounded-t-xl animate-in slide-in-from-bottom-2 duration-200">
                                                <div className="flex-1 min-w-0 border-l-2 border-primary pl-3">
                                                    <div className="text-xs font-semibold text-primary">
                                                        Replying to {replyingToMessage.sender?.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {replyingToMessage.content || (replyingToMessage.attachment_path ? "📷 Photo" : "")}
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:bg-muted-foreground/10" 
                                                    onClick={() => setReplyingToMessage(null)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}

                                        <form onSubmit={handleSendMessage} className={cn("flex gap-2 items-end", replyingToMessage ? "border p-2 bg-card rounded-b-xl border-t-0" : "")}>
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
                        ) : null}
                    </div>
                </div>

            </div>

            {/* Image Preview Modal */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none md:max-w-5xl flex items-center justify-center">
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 rounded-full p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition-all z-[100] shadow-lg border border-white/10 hover:scale-105 active:scale-95"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative flex items-center justify-center w-full h-full max-h-[85vh] p-4 select-none">
                        <img
                            src={previewImage || ''}
                            alt="Preview Attachment"
                            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-4 text-white z-50 shadow-lg border border-white/10">
                            <a
                                href={previewImage || ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs hover:underline flex items-center gap-1.5 font-medium transition-colors hover:text-primary-foreground text-white"
                            >
                                Open Original
                            </a>
                            <span className="w-px h-3 bg-white/20"></span>
                            <button
                                onClick={() => {
                                    if (!previewImage) return;
                                    const link = document.createElement('a');
                                    link.href = previewImage;
                                    link.download = previewImage.split('/').pop() || 'attachment';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                className="text-xs hover:underline flex items-center gap-1.5 font-medium transition-colors hover:text-primary-foreground text-white"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
