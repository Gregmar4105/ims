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

import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/canvasUtils';

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
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm<{
        banner: File | Blob | null;
    }>({
        banner: null,
    });

    const { post: resetPost, processing: resetProcessing } = useForm({});

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // setData('banner', file); // Don't set data yet, wait for crop
            const reader = new FileReader();
            reader.onload = (e) => {
                setBannerPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (bannerPreview && croppedAreaPixels) {
            try {
                const croppedImage = await getCroppedImg(
                    bannerPreview,
                    croppedAreaPixels
                );

                // We need to use router.post manually or hack Inertia form?
                // Inertia useForm handles file uploads if data is File/Blob.
                // We can just update data immediately before post, but setState is async...
                // Actually `post` uses current `data`. We need to update it first.
                // Or better, use manual router.post or update data via setData then plain submit?
                // The `transform` option in useForm is perfect for this, but I didn't init with it.
                // Simple way: setData wait? No.
                // useForm provides `transform` callback in options.

                // Let's stick to the current plan: 
                // We can't await `setData` inside submit handler easily before `post`.
                // Alternative: Use `router.post`.
                // OR: Construct FormData manually?
                // Wait, useForm's `post` accepts options. `transform` allows modifying data before send.

            } catch (e) {
                console.error(e);
                return;
            }
        }

        // Actually, let's redefine `submit` logic to:
        // 1. If bannerPreview, get blob.
        // 2. setData('banner', blob) <- this won't reflect immediately in same closure.
        // 3. post().

        // Correct approach with useForm:
        // Use `transform` hook option if available, OR just pass data to `post`? No `post` takes url.
        // We can use the `data` stored in state, but updating it is async.

        // Let's use `router` from inertia/react instead of useForm for this specific submit if needed?
        // Or simply:

        if (bannerPreview && croppedAreaPixels) {
            const croppedBlob = await getCroppedImg(bannerPreview, croppedAreaPixels);
            if (!croppedBlob) return;

            // Create a File from Blob to preserve name if possible, or just send blob
            const file = new File([croppedBlob], "banner.jpg", { type: "image/jpeg" });

            // We can't update useForm data synchronously and submit.
            // We have to use the `data` arg of post? No `post` uses internal data.
            // WORKAROUND: use `router.post` directly for this one, bypassing useForm's submit slightly
            // but keeping useForm for errors/processing state is nice.

            // Actually, useForm `transform` is the way.
            // But I declared useForm above.

            // Let's just use `router.post` for the submission with the processed file.
            // BUT we lose `processing` state from useForm.
            // Ok, let's just use `setData` and `useEffect`? Too complex.

            // Simplest: `data` argument in `transform`? 
            // `post(url, { transform: (data) => ({ ...data, banner: file }) })`

            post('/personalization/banner', {
                preserveScroll: true,
                forceFormData: true,
                transform: (currentData) => ({
                    ...currentData,
                    banner: file,
                }),
                onSuccess: () => {
                    reset();
                    setBannerPreview(null);
                    setZoom(1);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
            } as any);
            return;
        }

        // Fallback for no-preview submit (shouldn't happen with this UI logic but safe to keep)
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

                            {/* Cropper UI if custom image selected */}
                            {bannerPreview ? (
                                <div className="space-y-4">
                                    <div className="relative w-full max-w-xl h-60 bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mx-auto md:mx-0">
                                        <Cropper
                                            image={bannerPreview}
                                            crop={crop}
                                            zoom={zoom}
                                            aspect={2000 / 600}
                                            onCropChange={setCrop}
                                            onCropComplete={onCropComplete}
                                            onZoomChange={setZoom}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 max-w-xl">
                                        <span className="text-sm font-medium w-10">Zoom</span>
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            aria-labelledby="Zoom"
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setBannerPreview(null);
                                                setData('banner', null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
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
                                    <p className="text-sm text-gray-500">
                                        Supported formats: JPG, PNG, WebP. Max 5MB.
                                    </p>
                                </div>
                            )}
                            <InputError message={errors.banner} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                type="submit"
                                disabled={(!data.banner && !bannerPreview) || processing}
                                className="gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                {processing ? 'Uploading...' : 'Upload Banner'}
                            </Button>

                            {hasCustomBanner && !bannerPreview && (
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
