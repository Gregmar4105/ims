import MobileLayout from '@/layouts/mobile-layout';
import { ChevronRight, Settings as SettingsIcon, Database, User, Shield, Appearance } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function MobileSettingsIndex() {
    return (
        <MobileLayout title="Settings">
            <div className="space-y-6 pb-20">
                <section>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60 px-4 mb-3">Application</p>
                    <div className="bg-card border border-border rounded-[2rem] overflow-hidden">
                        <SettingItem 
                            icon={<Database className="w-5 h-5 text-blue-500" />} 
                            label="API Settings" 
                            description="Configure server URL and tokens"
                            onClick={() => router.visit('/settings/mobile-api')}
                        />
                        <div className="h-px bg-border/50 mx-6" />
                        <SettingItem 
                            icon={<SettingsIcon className="w-5 h-5 text-gray-500" />} 
                            label="System Info" 
                            description="Build version and status"
                            onClick={() => {}}
                        />
                    </div>
                </section>

                <section>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60 px-4 mb-3">Account</p>
                    <div className="bg-card border border-border rounded-[2rem] overflow-hidden">
                        <SettingItem 
                            icon={<User className="w-5 h-5 text-orange-500" />} 
                            label="Profile" 
                            description="Manage your identity"
                            onClick={() => router.visit('/settings/profile')}
                        />
                         <div className="h-px bg-border/50 mx-6" />
                         <SettingItem 
                            icon={<Shield className="w-5 h-5 text-green-500" />} 
                            label="Security" 
                            description="Password and authentication"
                            onClick={() => router.visit('/settings/password')}
                        />
                    </div>
                </section>
            </div>
        </MobileLayout>
    );
}

function SettingItem({ icon, label, description, onClick }: { icon: React.ReactNode; label: string; description: string; onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="w-full flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors text-left"
        >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm leading-none mb-1">{label}</p>
                <p className="text-xs text-muted-foreground leading-none">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30" />
        </button>
    );
}
