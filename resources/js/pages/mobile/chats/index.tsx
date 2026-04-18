import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { MessageSquare, ChevronRight, User } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Branch {
    id: number;
    branch_name: string;
    location: string;
    profile_photo_path?: string;
}

export default function MobileChatsIndex() {
    const { remoteApi, serverUrl, authUser } = useMobileApi();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchBranches();
    }, [serverUrl]);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/chats`);
            setBranches(res.data.branches || []);
        } catch (err) {
            console.error('Failed to fetch branches:', err);
        } finally {
            setLoading(false);
        }
    };

    const resolveImageUrl = (path: string | undefined | null) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${serverUrl}/storage/${path}`;
    };

    return (
        <MobileLayout title="Messages">
            <div className="pb-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-5 px-4">
                    Internal Communication
                </p>

                {loading ? (
                    <div className="space-y-4 px-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse p-3">
                                <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-muted rounded w-1/3" />
                                    <div className="h-3 bg-muted rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {branches.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                <p className="text-sm font-medium">No active connections found.</p>
                            </div>
                        ) : (
                            branches.map((branch) => {
                                const avatarUrl = resolveImageUrl(branch.profile_photo_path);
                                return (
                                    <button
                                        key={branch.id}
                                        onClick={() => router.visit(`/mobile/chats/${branch.id}`)}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-all active:scale-[0.98] group"
                                    >
                                        <div className="w-14 h-14 rounded-[1.25rem] bg-card flex items-center justify-center text-primary shrink-0 border border-border shadow-sm overflow-hidden group-hover:border-primary/30 transition-colors">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} className="w-full h-full object-cover" alt={branch.branch_name} />
                                            ) : (
                                                <MessageSquare className="w-6 h-6 opacity-40 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className="font-bold text-[15px] truncate uppercase leading-none">
                                                    {branch.branch_name}
                                                </p>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-20 group-hover:opacity-40 transition-opacity" />
                                            </div>
                                            <p className="text-xs text-muted-foreground/60 truncate">
                                                {authUser?.branch_id === branch.id ? 'Self - Internal Channel' : (branch.location || 'Remote Site')}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
