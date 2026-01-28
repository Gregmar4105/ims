import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import { useRef, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { ImageIcon, RotateCcw, Upload } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Personalization',
        href: '/personalization',
    },
];

interface Props {
    currentBanner: string | null;
    defaultBanner: string;
}

export default function Index({ currentBanner, defaultBanner }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm<{
        banner: File | null;
    }>({
        banner: null,
    });

    const { post: resetPost, processing: resetProcessing } = useForm({});

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('banner', file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setBannerPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/personalization/banner', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setBannerPreview(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset the banner to the default image?')) {
            resetPost('/personalization/banner/reset', {
                preserveScroll: true,
            });
        }
    };

    const displayBanner = bannerPreview || currentBanner || defaultBanner;
    const hasCustomBanner = !!currentBanner;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personalization" />

            <div className="space-y-6 p-6">
                <HeadingSmall
                    title="Homepage Banner"
                    description="Upload a custom banner image for the homepage. Recommended size: 2000x600 pixels."
                />

                <div className="space-y-6">
                    {/* Banner Preview */}
                    <div className="space-y-2">
                        <Label>Current Banner Preview</Label>
                        <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="relative aspect-[16/5] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <img
                                    className="absolute inset-0 h-full w-full object-cover object-center"
                                    src={displayBanner}
                                    alt="Homepage banner preview"
                                />
                                {bannerPreview && (
                                    <div className="absolute top-3 left-3 rounded-md bg-blue-500 px-2 py-1 text-sm font-medium text-white">
                                        Preview
                                    </div>
                                )}
                                {!currentBanner && !bannerPreview && (
                                    <div className="absolute top-3 left-3 rounded-md bg-gray-500 px-2 py-1 text-sm font-medium text-white">
                                        Default
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Upload Form */}
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="banner">Upload New Banner</Label>
                            <div className="flex items-center gap-4">
                                <input
                                    id="banner"
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleBannerChange}
                                    accept="image/*"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="gap-2"
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    Select Image
                                </Button>
                                {data.banner && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {data.banner.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">
                                Supported formats: JPG, PNG, GIF, WebP. Maximum file size: 5MB.
                            </p>
                            <InputError message={errors.banner} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                type="submit"
                                disabled={!data.banner || processing}
                                className="gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                {processing ? 'Uploading...' : 'Upload Banner'}
                            </Button>

                            {hasCustomBanner && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={resetProcessing}
                                    className="gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Reset to Default
                                </Button>
                            )}

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-green-600">Banner updated!</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
