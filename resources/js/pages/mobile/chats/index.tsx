import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { MessageSquare, ChevronRight, User } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Branch {
    id: number;
    branch_name: string;
    location: string;
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

    return (
        <MobileLayout title="Messages">
            <div className="pb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
                    Direct Messages
                </p>

                {loading ? (
                    <div className="space-y-4 px-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-muted rounded w-1/3" />
                                    <div className="h-3 bg-muted rounded w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {branches.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground">
                                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>No threads found.</p>
                            </div>
                        ) : (
                            branches.map((branch) => (
                                <button
                                    key={branch.id}
                                    onClick={() => router.visit(`/mobile/chats/${branch.id}`)}
                                    className="w-full flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors active:bg-muted"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-[15px] truncate">
                                                {branch.branch_name}
                                                {authUser?.branch_id === branch.id && (
                                                    <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">Self</span>
                                                )}
                                            </p>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30" />
                                        </div>
                                        <p className="text-[13px] text-muted-foreground truncate">
                                            {branch.location || 'Click to start conversation'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
