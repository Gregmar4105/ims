import React, { useState, useEffect } from 'react';
import { router, Link } from '@inertiajs/react';
import { useMobileApi } from '@/hooks/use-mobile-api';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Search, Menu, User, LogOut, Settings as SettingsIcon, LayoutDashboard, Settings2, Store, Users, QrCode } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
// Removed local logo import as we use public/icon.png now

export function FloatingHeader({ title: propTitle, onSearch }: { title?: string; onSearch?: (q: string) => void }) {
    const { authUser, logout, resolveImageUrl, isHydrated, token, refreshUser } = useMobileApi();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isHydrated && token) {
            refreshUser();
        }
    }, [isHydrated, token]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch?.(searchQuery);
    };

    return (
        <div className="fixed top-0 w-full z-40 px-4 pt-10 py-3 bg-transparent pointer-events-none" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
            <div className="flex items-center bg-card shadow-md rounded-full px-2 py-1.5 border border-border/50 pointer-events-auto">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0 border-none" hideClose>
                        <DrawerMenu authUser={authUser} logout={logout} />
                    </SheetContent>
                </Sheet>

                {onSearch ? (
                    <form onSubmit={handleSearchSubmit} className="flex-1 mx-2 text-foreground">
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => {
                                const q = e.target.value;
                                setSearchQuery(q);
                                onSearch(q);
                            }}
                            className="w-full bg-transparent border-none text-sm font-normal focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60"
                        />
                    </form>
                ) : (
                    <div className="flex-1 mx-2 truncate text-sm font-semibold text-muted-foreground/60">
                        {title || 'Search'}
                    </div>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="h-9 w-9 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary mx-1 shrink-0 bg-primary/10 flex items-center justify-center border-2 border-background shadow-sm">
                            {authUser?.avatar_url || authUser?.profile_photo_url || authUser?.profile_photo_path ? (
                                <img 
                                    src={resolveImageUrl(authUser.avatar_url || authUser.profile_photo_url || authUser.profile_photo_path)} 
                                    alt={authUser.name} 
                                    className="h-full w-full object-cover" 
                                />
                            ) : (
                                <User className="h-5 w-5 text-primary" />
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] p-2 mt-2">
                        <div className="flex flex-col items-center justify-center p-4 border-b border-border/50">
                            {authUser?.avatar_url || authUser?.profile_photo_url || authUser?.profile_photo_path ? (
                                <img 
                                    src={resolveImageUrl(authUser.avatar_url || authUser.profile_photo_url || authUser.profile_photo_path)} 
                                    alt={authUser.name} 
                                    className="h-16 w-16 rounded-full mb-2 object-cover border-2 border-primary/20" 
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <p className="font-bold text-sm text-center">{authUser?.name}</p>
                            <p className="text-[10px] text-muted-foreground text-center truncate w-full">{authUser?.email}</p>
                        </div>
                        <DropdownMenuItem onClick={() => router.visit('/settings/mobile-api')}>
                            <SettingsIcon className="mr-2 h-4 w-4" />
                            API Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={logout} className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

function DrawerMenu({ authUser, logout }: { authUser: any; logout: () => void }) {
    const roles: string[] = authUser?.roles || [];
    const isSystemAdmin = roles.includes('System Administrator');
    const isBranchAdmin = roles.includes('Branch Administrator');
    const isEmployee = roles.includes('Employee');

    return (
        <div className="flex flex-col h-full bg-background overflow-y-auto pb-safe">
            <div className="px-6 pt-12 pb-6 border-b border-border/40" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 4rem))' }}>
                <div className="flex items-center gap-3">
                    <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
                    <div>
                        <p className="text-lg font-bold text-primary leading-none">LM2 Bicycle Trading</p>
                    </div>
                </div>
            </div>
            
            <div className="py-2 flex-1">
                <MenuSection title="General" />
                <MenuItem icon="Inbox" label="Dashboard" href="/dashboard" active={window.location.pathname === '/dashboard'} />
                <MenuItem icon="Bell" label="Notifications" href="/mobile/notifications" active={window.location.pathname === '/mobile/notifications'} />
                
                {isSystemAdmin && (
                    <>
                        <MenuSection title="System" />
                        <MenuItem icon="LayoutDashboard" label="System Dashboard" href="/dashboard" active={window.location.pathname === '/dashboard'} />
                        <MenuItem icon="Settings2" label="Personalization" href="/settings/appearance" active={window.location.pathname === '/settings/appearance'} />
                        <MenuItem icon="Users" label="User Management" href="/mobile/users" active={window.location.pathname === '/mobile/users'} />
                        <MenuItem icon="MapPin" label="Branches" href="/mobile/branches" active={window.location.pathname === '/mobile/branches'} />
                    </>
                )}

                {(isSystemAdmin || isBranchAdmin) && (
                    <>
                        <MenuSection title="Branch" />
                        <MenuItem icon="Store" label="Branch Dashboard" href="/dashboard" active={window.location.pathname === '/dashboard'} />
                        <MenuItem icon="MessageCircle" label="Branch Chats" href="/mobile/chats" active={window.location.pathname.startsWith('/mobile/chats')} badge="Active" />
                        <MenuItem icon="ShoppingCart" label="Sales" href="/mobile/sales" active={window.location.pathname.startsWith('/mobile/sales')} />
                        <MenuItem icon="ArrowRightLeft" label="Transfers" href="/mobile/transfers" active={window.location.pathname.startsWith('/mobile/transfers')} />
                    </>
                )}

                {isEmployee && !isSystemAdmin && !isBranchAdmin && (
                    <>
                        <MenuSection title="Workspace" />
                        <MenuItem icon="Users" label="Employee Dashboard" href="/dashboard" active={window.location.pathname === '/dashboard'} />
                        <MenuItem icon="MessageCircle" label="Chats" href="/mobile/chats" active={window.location.pathname.startsWith('/mobile/chats')} />
                    </>
                )}

                <MenuSection title="Inventory" />
                <MenuItem icon="Package" label="Products" href="/mobile/products" active={window.location.pathname === '/mobile/products'} />
                <MenuItem icon="RotateCcw" label="Reorders" href="/mobile/reorders" active={window.location.pathname === '/mobile/reorders'} badge="Alert" badgeColor="bg-red-500 text-white" />



                <MenuSection title="Account" />
                <MenuItem icon="Settings" label="Settings" href="/mobile/settings" active={window.location.pathname === '/mobile/settings'} />
                <MenuItem icon="LogOut" label="Logout" onClick={logout} textClass="text-destructive" iconClass="text-destructive" />
            </div>
        </div>
    );
}

function MenuSection({ title }: { title: string }) {
    return (
        <div className="px-6 py-2 mt-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">{title}</p>
        </div>
    );
}

function MenuItem({ 
    icon, label, href, active, badge, badgeColor = 'bg-primary/10 text-primary', onClick, textClass = '', iconClass = '' 
}: { 
    icon: string; label: string; href?: string; active?: boolean; badge?: string; badgeColor?: string; onClick?: () => void; textClass?: string; iconClass?: string;
}) {
    const renderIcon = () => {
        const cls = `h-5 w-5 ${iconClass || (active ? 'text-primary' : 'text-muted-foreground')}`;
        switch (icon) {
            case 'Inbox': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>;
            case 'Package': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;
            case 'ShoppingCart': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
            case 'ArrowRightLeft': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>;
            case 'Settings': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>;
            case 'Shield': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
            case 'MessageCircle': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;
            case 'Bell': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>;
            case 'MapPin': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
            case 'RotateCcw': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
            case 'LogOut': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>;
            case 'LayoutDashboard': return <LayoutDashboard className={cls} />;
            case 'Settings2': return <Settings2 className={cls} />;
            case 'Store': return <Store className={cls} />;
            case 'Users': return <Users className={cls} />;
            case 'QrCode': return <QrCode className={cls} />;
            default: return <div className={cls} />;
        }
    };

    const content = (
        <div className={`flex items-center px-6 py-3 rounded-r-full mr-4 ${active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted font-normal text-foreground'}`}>
            <div className="mr-4">{renderIcon()}</div>
            <span className={`text-sm flex-1 ${textClass || ''}`}>{label}</span>
            {badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>
                    {badge}
                </span>
            )}
        </div>
    );

    if (onClick) {
        return <button onClick={onClick} className="w-full text-left focus:outline-none">{content}</button>;
    }

    return <Link href={href || '#'} className="block">{content}</Link>;
}
