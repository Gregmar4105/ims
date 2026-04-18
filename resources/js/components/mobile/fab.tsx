import { Link } from '@inertiajs/react';
import React from 'react';

export function FloatActionButton({ 
    icon, 
    label, 
    onClick, 
    href, 
    customBottom, 
    variant = 'primary' 
}: { 
    icon: React.ReactNode; 
    label?: string; 
    onClick?: () => void; 
    href?: string; 
    customBottom?: string;
    variant?: 'primary' | 'secondary';
}) {
    const bottomClass = customBottom || `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]`;
    const colorClass = variant === 'secondary' 
        ? "bg-transparent border-2 border-slate-900 text-slate-900 shadow-none hover:bg-slate-50" 
        : "bg-slate-950 text-white border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]";

    const classNames = `fixed ${bottomClass} right-6 md:right-8 ${colorClass} border active:scale-95 transition-all flex items-center justify-center p-4 rounded-3xl z-40`;

    const content = (
        <div className="flex items-center">
            {icon}
            {label && <span className="ml-2 font-medium text-sm pr-1">{label}</span>}
        </div>
    );

    if (onClick) {
        return (
            <button onClick={onClick} className={classNames}>
                {content}
            </button>
        );
    }

    if (href) {
        return (
            <Link href={href} className={classNames}>
                {content}
            </Link>
        );
    }

    return null;
}
