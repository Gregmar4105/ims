import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SearchableSelectProps {
  options: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  allLabel?: string
  emptyMessage?: string
  className?: string
  triggerClassName?: string
  getLabel?: (option: string) => string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  allLabel,
  emptyMessage = "No results found.",
  className,
  triggerClassName,
  getLabel = (opt) => opt,
}: SearchableSelectProps) {

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter((option) =>
      option.toLowerCase().includes(searchLower)
    )
  }, [options, search])

  const selectedLabel = React.useMemo(() => {
    if (value === 'all') return allLabel || `All ${placeholder}s`
    if (!value) return placeholder
    const found = options.find((option) => option === value)
    return found ? getLabel(found) : value
  }, [options, value, placeholder, allLabel, getLabel])


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full md:w-[140px] justify-between h-9 text-xs md:text-sm font-normal border-input bg-transparent shadow-sm",
            triggerClassName
          )}

        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[200px] p-0", className)} align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={`Search...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          <div
            className={cn(
              "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
              value === 'all' && "bg-accent/50"
            )}
            onClick={() => {
              onValueChange('all')
              setOpen(false)
              setSearch("")
            }}
          >
            <Check
              className={cn(
                "mr-2 size-4",
                value === 'all' ? "opacity-100" : "opacity-0"
              )}
            />
            {allLabel || `All ${placeholder}s`}
          </div>
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors",
                  value === option && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onValueChange(option)
                  setOpen(false)
                  setSearch("")
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value === option ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{getLabel(option)}</span>
              </div>

            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
