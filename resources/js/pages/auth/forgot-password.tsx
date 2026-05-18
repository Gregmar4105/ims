import { login } from '@/routes';
import { Head } from '@inertiajs/react';

import TextLink from '@/components/text-link';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword() {
    const currentYear = new Date().getFullYear();

    return (
        <AuthLayout
            title="Forgot password"
            description="Contact the System Administrator to reset your password"
        >
            <Head title="Forgot password" />

            <div className="space-y-6 text-center">
                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                    For security reasons, self-service password reset is disabled. Please contact your System Administrator directly to reset your account credentials.
                </div>

                <div className="space-x-1 text-center text-sm text-muted-foreground pt-4">
                    <span>Return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </div>
            </div>

            {/* Larable Copyright Footer - Absolute positioned at the bottom of relative layout */}
            <div className="absolute bottom-6 left-0 w-full text-center text-sm">
                &copy; {currentYear} Powered by <a href="https://larable.dev" target="_blank" className="text-amber-600">Larable™</a> . All rights reserved.
            </div>
        </AuthLayout>
    );
}
