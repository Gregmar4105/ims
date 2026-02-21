import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head } from '@inertiajs/react';

import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Branch Profile',
        href: '/settings/branch-profile',
    },
];

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';

interface Branch {
    id: number;
    branch_name: string;
    profile_photo_path: string | null;
}

export default function BranchProfile({ branch }: { branch: Branch }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        photo: null as File | null,
        clear_photo: false,
    });

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('photo', file);
            setData('clear_photo', false);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setData('photo', null);
        setData('clear_photo', true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/settings/branch-profile', {
            preserveScroll: true,
            onSuccess: () => {
                setData('photo', null);
                setData('clear_photo', false);
                setPhotoPreview(null); // Force reload of actual avatar image src
            }
        });
    };

    const currentAvatarUrl = photoPreview || (branch.profile_photo_path ? `/storage/${branch.profile_photo_path}` : '');
    const fallbackText = branch.branch_name.substring(0, 2).toUpperCase();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Branch Profile" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Branch Profile"
                        description="Update your branch's profile picture displayed in the chat interface."
                    />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="photo">Branch Logo / Photo</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={currentAvatarUrl} />
                                    <AvatarFallback>{fallbackText}</AvatarFallback>
                                </Avatar>
                                <input
                                    id="photo"
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handlePhotoChange}
                                    accept="image/*"
                                />
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Select New Photo
                                    </Button>

                                    {(branch.profile_photo_path || photoPreview) && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={handleRemovePhoto}
                                        >
                                            Remove Photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <InputError message={errors.photo} />

                            <p className="text-sm text-muted-foreground mt-2">
                                For best results, use an image that is square and at least 256x256 pixels in size.
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing} data-test="update-branch-profile-button">
                                Save
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
