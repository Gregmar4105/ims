import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Users, Mail, MapPin, Shield, Search, Loader2 } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    branch?: { branch_name: string };
    roles?: { name: string }[];
}

export default function MobileUsersIndex() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchUsers();
    }, [serverUrl]);

    const fetchUsers = async (query = '') => {
        setLoading(true);
        try {
            const url = `${serverUrl}/api/mobile/users${query ? `?search=${query}` : ''}`;
            const res = await remoteApi.get(url);
            setUsers(res.data.data || []);
        } catch (err) {
            console.error('Fetch users failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers(search);
    };

    return (
        <MobileLayout title="User Management">
            <div className="space-y-6 pb-10">
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                        type="text"
                        placeholder="Search personnel..."
                        className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-3">
                        {users.map((user) => (
                            <div key={user.id} className="bg-card border border-border p-4 rounded-3xl shadow-sm flex items-start gap-4 active:bg-muted/30 transition-colors">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary border border-primary/10">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[15px] leading-tight mb-1">{user.name}</p>
                                    
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                        <Mail className="w-3 h-3 opacity-60" />
                                        <span className="truncate">{user.email}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                                        {user.branch && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-lg text-[10px] font-black uppercase text-muted-foreground">
                                                <MapPin className="w-2.5 h-2.5" />
                                                {user.branch.branch_name}
                                            </div>
                                        )}
                                        {user.roles?.map((role, i) => (
                                            <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary rounded-lg text-[10px] font-black uppercase border border-primary/10">
                                                <Shield className="w-2.5 h-2.5" />
                                                {role.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
