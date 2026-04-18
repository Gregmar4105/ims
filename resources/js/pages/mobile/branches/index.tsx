import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { MapPin, Users, Package, ChevronRight, Loader2 } from 'lucide-react';

interface Branch {
    id: number;
    branch_name: string;
    location: string;
    users_count: number;
    products_count: number;
}

export default function MobileBranchesIndex() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (serverUrl) fetchBranches();
    }, [serverUrl]);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        setFilteredBranches(
            branches.filter(b => 
                b.branch_name.toLowerCase().includes(query) || 
                b.location.toLowerCase().includes(query)
            )
        );
    }, [searchQuery, branches]);

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/branches`);
            const data = res.data.data || [];
            setBranches(data);
            setFilteredBranches(data);
        } catch (err) {
            console.error('Fetch branches failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout 
            title="Branch Network"
            onSearch={(q) => setSearchQuery(q)}
        >
            <div className="space-y-4 pb-10">
                <p className="text-[10px] font-bold uppercase text-muted-foreground/60 px-2 mb-4">
                    Active Locations
                </p>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-4">
                        {filteredBranches.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground opacity-50">
                                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No branches match your search.</p>
                            </div>
                        ) : (
                            filteredBranches.map((branch) => (
                                <div key={branch.id} className="bg-card border border-border rounded-[2rem] p-6 shadow-sm overflow-hidden group">
                                    <div className="flex items-start justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg truncate leading-none mb-1">{branch.branch_name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {branch.location || 'Primary Site'}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 opacity-20 group-hover:opacity-40 transition-opacity mt-3" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                                                <Users className="w-4 h-4 opacity-40" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase leading-none opacity-40 mb-1">Staff</p>
                                                <p className="text-sm font-bold">{branch.users_count}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                                                <Package className="w-4 h-4 opacity-40" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase leading-none opacity-40 mb-1">Products</p>
                                                <p className="text-sm font-bold">{branch.products_count}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
