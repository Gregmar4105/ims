import * as React from "react";
import { Check, ChevronsUpDown, Search, Barcode, QrCode, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Product {
    id: number;
    name: string;
    quantity: number;
    barcode?: string | null;
    qr_code?: string | null;
}

interface ProductSearchSelectProps {
    value: string; // product_id as a string
    onValueChange: (value: string) => void;
    products: Product[];
    placeholder?: string;
    error?: string;
}

export function ProductSearchSelect({
    value,
    onValueChange,
    products,
    placeholder = "Search product...",
    error,
}: ProductSearchSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Find the currently selected product
    const selectedProduct = React.useMemo(() => {
        return products.find((p) => p.id.toString() === value);
    }, [products, value]);

    // Filter products locally based on the search query
    const filteredProducts = React.useMemo(() => {
        if (!searchQuery.trim()) return products;
        
        const query = searchQuery.toLowerCase().trim();
        return products.filter((product) => {
            const nameMatch = product.name?.toLowerCase().includes(query);
            const barcodeMatch = product.barcode?.toLowerCase().includes(query);
            const qrMatch = product.qr_code?.toLowerCase().includes(query);
            return nameMatch || barcodeMatch || qrMatch;
        });
    }, [products, searchQuery]);

    // Reset search query when popover opens/closes
    React.useEffect(() => {
        if (!open) {
            setSearchQuery("");
        }
    }, [open]);

    return (
        <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between text-left font-normal h-10 px-3",
                            !value && "text-muted-foreground",
                            error && "border-red-500 focus-visible:ring-red-500"
                        )}
                    >
                        {selectedProduct ? (
                            <span className="flex items-center justify-between w-full pr-2">
                                <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                                    {selectedProduct.name}
                                </span>
                                <Badge variant="secondary" className="ml-2 shrink-0 bg-primary/10 text-primary dark:bg-primary/20 hover:bg-primary/15 font-semibold text-xs border-transparent">
                                    Qty: {selectedProduct.quantity}
                                </Badge>
                            </span>
                        ) : (
                            <span>{placeholder}</span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    className="p-0 w-[var(--radix-popover-trigger-width)] shadow-xl border rounded-lg overflow-hidden" 
                    align="start"
                >
                    <div className="flex items-center border-b px-3 py-2 bg-muted/20">
                        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground opacity-75" />
                        <Input
                            placeholder="Type product name, barcode, qr..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 w-full border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto p-1 bg-white dark:bg-gray-900">
                        {filteredProducts.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                <Package className="h-8 w-8 opacity-25" />
                                <span>No products found.</span>
                            </div>
                        ) : (
                            filteredProducts.map((product) => {
                                const isSelected = product.id.toString() === value;
                                return (
                                    <div
                                        key={product.id}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm outline-none transition-colors",
                                            isSelected 
                                                ? "bg-primary/10 text-primary font-medium dark:bg-primary/20" 
                                                : "hover:bg-accent hover:text-accent-foreground text-gray-700 dark:text-gray-300"
                                        )}
                                        onClick={() => {
                                            onValueChange(product.id.toString());
                                            setOpen(false);
                                        }}
                                    >
                                        <div className="flex flex-col gap-0.5 pr-4 truncate">
                                            <span className={cn("truncate font-medium", isSelected ? "text-primary" : "text-gray-900 dark:text-gray-100")}>
                                                {product.name}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground mt-0.5">
                                                {product.barcode && (
                                                    <span className="flex items-center gap-0.5 font-mono bg-muted/60 dark:bg-muted/30 px-1 py-0.2 rounded border border-muted-foreground/10">
                                                        <Barcode className="w-3 h-3 opacity-70" />
                                                        {product.barcode}
                                                    </span>
                                                )}
                                                {product.qr_code && (
                                                    <span className="flex items-center gap-0.5 font-mono bg-muted/60 dark:bg-muted/30 px-1 py-0.2 rounded border border-muted-foreground/10">
                                                        <QrCode className="w-3 h-3 opacity-70" />
                                                        {product.qr_code}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={product.quantity > 5 ? "outline" : "destructive"} className={cn("text-xs font-semibold px-2 py-0.5", product.quantity > 5 ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800" : "font-bold shadow-sm")}>
                                                {product.quantity} in stock
                                            </Badge>
                                            {isSelected && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
    );
}
