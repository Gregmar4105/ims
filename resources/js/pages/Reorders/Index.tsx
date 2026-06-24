import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Plus, Search, Bike, AlertTriangle, Printer, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect } from 'react';
import { SearchableSelect } from '@/components/SearchableSelect';
import Pagination from '@/components/Pagination';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Products',
        href: '/products',
    },
    {
        title: 'Reorders',
        href: '/reorders',
    },
];

interface ReorderProduct {
    id: number;
    name: string;
    code: string | null;
    sku: string | null;
    image_path: string | null;
    quantity: number;
    reorder_level: number;
    brand: { name: string } | null;
    category: { name: string } | null;
    supplier: { name: string, contact_person?: string, phone?: string } | null;
    branch: { id: number, name: string } | null; // Null if global or localized view
}

interface PaginatedData<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    total: number;
    current_page: number;
}

interface Props {
    reorders: PaginatedData<ReorderProduct>;
    options: {
        brands: string[];
        categories: string[];
    };
    filters: {
        search?: string;
        brand?: string;
        category?: string;
        subcategory?: string;
    };
}

export default function Index({ reorders, options, filters }: Props) {
    const { auth } = usePage<SharedData>().props;
    const branchName = auth.user?.branch?.branch_name;
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [brand, setBrand] = useState(filters.brand || 'all');
    const [baseCategory, setBaseCategory] = useState(filters.category || 'all');
    const [subCategory, setSubCategory] = useState(filters.subcategory || 'all');

    // Intelligent Category Grouping
    const categoryGroups = useMemo(() => {
        const groups: Record<string, string[]> = {};
        options.categories.forEach(cat => {
            const firstWord = cat.split(' ')[0];
            if (!groups[firstWord]) groups[firstWord] = [];
            groups[firstWord].push(cat);
        });
        return groups;
    }, [options.categories]);

    const baseCategories = useMemo(() => Object.keys(categoryGroups).sort(), [categoryGroups]);

    const subCategories = useMemo(() => {
        if (baseCategory === 'all') return [];
        return categoryGroups[baseCategory] || [];
    }, [baseCategory, categoryGroups]);

    const applyFilters = (searchVal = searchQuery, brandVal = brand, baseCatVal = baseCategory, subCatVal = subCategory) => {
        router.get('/reorders', {
            search: searchVal,
            brand: brandVal,
            category: baseCatVal,
            subcategory: subCatVal,
        }, { preserveState: true, replace: true, preserveScroll: true });
    };

    // Debounce search input
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery !== (filters.search || '')) {
                applyFilters(searchQuery, brand, baseCategory, subCategory);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleBrandChange = (val: string) => {
        setBrand(val);
        applyFilters(searchQuery, val, baseCategory, subCategory);
    };

    const handleBaseCategoryChange = (val: string) => {
        setBaseCategory(val);
        let finalSub = 'all';
        if (val !== 'all') {
            const subs = categoryGroups[val] || [];
            if (subs.length === 1) {
                finalSub = subs[0];
            }
        }
        setSubCategory(finalSub);
        applyFilters(searchQuery, brand, val, finalSub);
    };

    const handleSubCategoryChange = (val: string) => {
        setSubCategory(val);
        applyFilters(searchQuery, brand, baseCategory, val);
    };

    const displayedReorders = reorders.data;

    const isSystemAdmin = auth.roles.includes('System Administrator');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reorders" />

            <div className="p-4 md:p-6 space-y-6 print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                            Reorders Required
                            <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">
                                {reorders.total}
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Products that have reached or dropped below their configured reorder level.
                        </p>
                    </div>

                    <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        Print Reorder List
                    </Button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm flex flex-col">
                    <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="relative w-full md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center w-full md:w-auto">
                            <SearchableSelect
                                options={options.brands}
                                value={brand}
                                onValueChange={handleBrandChange}
                                placeholder="Brand"
                                allLabel="All Brands"
                            />

                            <SearchableSelect
                                options={baseCategories}
                                value={baseCategory}
                                onValueChange={handleBaseCategoryChange}
                                placeholder="Category"
                                allLabel="All Categories"
                            />

                            {baseCategory !== 'all' && subCategories.length > 1 && (
                                <SearchableSelect
                                    options={subCategories}
                                    value={subCategory}
                                    onValueChange={handleSubCategoryChange}
                                    placeholder="Sub-Category"
                                    allLabel="All Sub-Categories"
                                    getLabel={(opt) => opt === 'all' ? 'All' : opt.replace(new RegExp(`^${baseCategory}\\s*`), '') || opt}
                                />
                            )}

                            {(brand !== 'all' || baseCategory !== 'all' || searchQuery !== '') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setBrand('all');
                                        setBaseCategory('all');
                                        setSubCategory('all');
                                        router.get('/reorders', {}, { preserveState: true, replace: true, preserveScroll: true });
                                    }}
                                    className="h-9 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 col-span-2 md:col-span-1"
                                >
                                    <X className="h-4 w-4 mr-1 inline" /> Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Category/Brand</TableHead>
                                    {isSystemAdmin && <TableHead>Location</TableHead>}
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Reorder Level</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayedReorders.length > 0 ? (
                                    displayedReorders.map((product, index) => (
                                        <TableRow key={`${product.id}-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                            <TableCell>
                                                {product.image_path ? (
                                                    <div className="h-12 w-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1">
                                                        <img
                                                            src={`/storage/${product.image_path}`}
                                                            alt={product.name}
                                                            className="h-full w-full object-contain"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-12 rounded-lg border bg-gray-50 flex items-center justify-center text-gray-400">
                                                        <Bike className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                                                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                                                    {product.code && <span>Code: {product.code}</span>}
                                                    {product.sku && <span>SKU: {product.sku}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{product.category?.name || 'Uncategorized'}</div>
                                                <div className="text-xs text-muted-foreground mt-1">{product.brand?.name || 'No Brand'}</div>
                                            </TableCell>

                                            {isSystemAdmin && (
                                                <TableCell>
                                                    <div className="text-sm font-medium">
                                                        {product.branch ? product.branch.name : 'Unknown Location'}
                                                    </div>
                                                </TableCell>
                                            )}

                                            <TableCell className="text-right">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    {product.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {product.reorder_level}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {product.supplier ? (
                                                    <div>
                                                        <div className="text-sm font-medium">{product.supplier.name}</div>
                                                        {product.supplier.contact_person && (
                                                            <div className="text-xs text-muted-foreground mt-1">{product.supplier.contact_person}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">No Supplier</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/products/${product.id}/edit`}>
                                                    <Button variant="outline" size="sm">
                                                        Update Stock
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={isSystemAdmin ? 8 : 7} className="h-32 text-center text-muted-foreground">
                                            {searchQuery ? 'No matching products found.' : 'All stock levels are healthy! No items need reordering.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {reorders.links && reorders.links.length > 3 && (
                        <div className="p-4 border-t flex justify-end">
                            <Pagination links={reorders.links} />
                        </div>
                    )}
                </div>
            </div>

            {/* Print Only View */}
            <div className="hidden print:block p-0 bg-white text-black font-sans">
                <style>
                    {`
                        @media print {
                            @page { size: auto; margin: 5mm; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            header, nav, .sidebar { display: none !important; }
                            #app-content { padding: 0 !important; margin: 0 !important; }
                        }
                    `}
                </style>
                <div className="flex justify-between items-end border-b-2 border-gray-800 pb-2 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reorders Report</h1>
                        <p className="text-gray-600 mt-1 text-sm font-medium">
                            {branchName ? `Location: ${branchName}` : 'All Locations (Global View)'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">Generated On</p>
                        <p className="text-xs text-gray-600">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                        <p className="text-xs font-semibold text-gray-900 mt-1">Total Items: {reorders.total}</p>
                    </div>
                </div>

                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-800 text-gray-900 uppercase tracking-wider text-xs">
                            <th className="py-2 pr-2">Product / SKU</th>
                            <th className="py-2 px-2">Category & Brand</th>
                            {isSystemAdmin && <th className="py-2 px-2">Location</th>}
                            <th className="py-2 px-2 text-right">Current Stock</th>
                            <th className="py-2 px-2 text-right">Reorder Level</th>
                            <th className="py-2 pl-2">Supplier Info</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {displayedReorders.map((product, index) => (
                            <tr key={`print-${product.id}-${index}`} className="break-inside-avoid">
                                <td className="py-2 pr-2 align-top">
                                    <div className="font-semibold text-gray-900">{product.name}</div>
                                    <div className="text-xs text-gray-500 mt-px">{product.sku || product.code || 'N/A'}</div>
                                </td>
                                <td className="py-2 px-2 align-top">
                                    <div className="font-medium text-gray-900">{product.category?.name || 'Uncategorized'}</div>
                                    <div className="text-xs text-gray-500 mt-px">{product.brand?.name || ''}</div>
                                </td>
                                {isSystemAdmin && (
                                    <td className="py-2 px-2 align-top font-medium text-gray-700">
                                        {product.branch ? product.branch.name : 'Unknown Location'}
                                    </td>
                                )}
                                <td className="py-2 px-2 text-right align-top font-bold text-red-600">
                                    {product.quantity}
                                </td>
                                <td className="py-2 px-2 text-right align-top font-medium text-gray-900">
                                    {product.reorder_level}
                                </td>
                                <td className="py-2 pl-2 align-top">
                                    {product.supplier ? (
                                        <div className="text-xs text-gray-600">
                                            <div className="font-semibold text-gray-900">{product.supplier.name}</div>
                                            {product.supplier.contact_person && <div className="mt-px"><span className="text-gray-400">Contact:</span> {product.supplier.contact_person}</div>}
                                            {product.supplier.phone && <div><span className="text-gray-400">Tel:</span> {product.supplier.phone}</div>}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No Supplier Info</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {displayedReorders.length === 0 && (
                            <tr>
                                <td colSpan={isSystemAdmin ? 6 : 5} className="py-6 text-center text-gray-500 italic">
                                    No items found to print.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
