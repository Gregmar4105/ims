import { Link } from '@inertiajs/react';
import React from 'react';

export function FloatActionButton({ icon, label, onClick, href }: { icon: React.ReactNode; label?: string; onClick?: () => void; href?: string; }) {
    const classNames = "fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 md:right-8 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center p-4 rounded-3xl z-40";

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
