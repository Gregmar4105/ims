import AppLayout from '@/layouts/welcome-layout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building } from 'lucide-react';

interface Branch {
    id: number;
    branch_name: string;
    location: string;
    branch_status: string;
    google_maps_embed_code?: string;
}

export default function Index({ branches }: { branches: Branch[] }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Locations', href: '/locations' }]}>
            <Head title="Locations" />
            <div className="flex h-full flex-1 flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Our Locations</h1>
                    <p className="text-muted-foreground">
                        Find a branch near you.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {branches.map((branch) => (
                        <Card key={branch.id} className="overflow-hidden">
                            <CardHeader className="bg-muted/50 pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            <Building className="h-5 w-5 text-primary" />
                                            {branch.branch_name}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-1.5 text-base mt-2">
                                            <MapPin className="h-4 w-4" />
                                            {branch.location}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={branch.branch_status === 'Active' ? 'default' : 'secondary'}>
                                        {branch.branch_status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {branch.google_maps_embed_code ? (
                                    <div
                                        className="w-full h-64 sm:h-80 bg-muted flex items-center justify-center overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: branch.google_maps_embed_code }}
                                    />
                                ) : (
                                    <div className="w-full h-64 sm:h-80 bg-muted flex items-center justify-center text-muted-foreground">
                                        <div className="text-center p-4">
                                            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No map available for this location.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {branches.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <p className="text-muted-foreground">No active branches found.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
