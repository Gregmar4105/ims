import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/use-debounce";
import axios from "axios";

interface Option {
    id: number;
    name: string;
}

interface AutocompleteInputProps {
    value: string;
    onValueChange: (value: string) => void;
    onOptionSelect?: (value: string) => void;
    placeholder: string;
    searchUrl: string;
    className?: string;
    error?: string;
    onBlur?: () => void;
}

export function AutocompleteInput({
    value,
    onValueChange,
    onOptionSelect,
    placeholder,
    searchUrl,
    className,
    error,
    onBlur,
}: AutocompleteInputProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value);
    const [options, setOptions] = React.useState<Option[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const debouncedSearch = useDebounce(inputValue, 300);

    // Update internal input value if external value changes
    React.useEffect(() => {
        setInputValue(value);
    }, [value]);

    React.useEffect(() => {
        if (!debouncedSearch || debouncedSearch.length < 1) {
            setOptions([]);
            return;
        }

        const fetchOptions = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(searchUrl, {
                    params: { search: debouncedSearch }
                });
                setOptions(response.data);
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOptions();
    }, [debouncedSearch, searchUrl]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setInputValue(newVal);
        onValueChange(newVal);
        if (!open) setOpen(true);
    };

    const handleSelectOption = (option: Option) => {
        setInputValue(option.name);
        onValueChange(option.name);
        onOptionSelect?.(option.name);
        setOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)}>
            <Popover open={open && (options.length > 0 || isLoading)} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div className="w-full">
                        <Input
                            value={inputValue}
                            onChange={handleInputChange}
                            onFocus={() => inputValue.length > 0 && setOpen(true)}
                            onBlur={() => {
                                // Add a short delay to allow item click on popover before input blur event
                                setTimeout(() => {
                                    onBlur?.();
                                }, 200);
                            }}
                            placeholder={placeholder}
                            className={cn(error && "border-red-500")}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent 
                    className="p-0 w-[var(--radix-popover-trigger-width)]" 
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="max-h-[200px] overflow-y-auto p-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Searching...
                            </div>
                        ) : options.length > 0 ? (
                            options.map((option) => (
                                <div
                                    key={option.id}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                                        value === option.name && "bg-accent"
                                    )}
                                    onClick={() => handleSelectOption(option)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.name}
                                </div>
                            ))
                        ) : null}
                    </div>
                </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
    );
}
