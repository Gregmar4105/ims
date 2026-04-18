import { useEffect, useState } from 'react';
import MobileLayout from '@/layouts/mobile-layout';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Shield, Users, Loader2 } from 'lucide-react';

interface Role {
    id: number;
    name: string;
    users_count: number;
}

export default function MobileRolesIndex() {
    const { remoteApi, serverUrl } = useMobileApi();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (serverUrl) fetchRoles();
    }, [serverUrl]);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await remoteApi.get(`${serverUrl}/api/mobile/roles`);
            setRoles(res.data.data || []);
        } catch (err) {
            console.error('Fetch roles failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout title="System Roles">
            <div className="space-y-4 pb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2 mb-4 italic">
                    Permission Groups
                </p>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {roles.map((role) => (
                            <div key={role.id} className="bg-card border border-border p-5 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-[15px] tracking-tight truncate uppercase">{role.name}</p>
                                        <div className="flex items-center gap-1.5 opacity-40">
                                            <Users className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{role.users_count} assigned</span>
                                        </div>
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
