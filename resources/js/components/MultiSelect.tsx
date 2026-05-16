import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface MultiSelectProps {
  options: { id: string | number; name: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select options..." }: MultiSelectProps) {
  const toggleOption = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id]
    onChange(newSelected)
  }

  const handleClear = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== id))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-auto min-h-10 px-3 py-2 border-black/20 hover:border-black/40 bg-background",
            selected.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selected.length === 0 && placeholder}
            {selected.map((id) => {
              const option = options.find((o) => String(o.id) === id)
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="mr-1 mb-1 px-2 py-0.5 flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                >
                  {option?.name || id}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleClear(e, id)}
                  />
                </Badge>
              )
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-1">
            {options.map((option) => {
              const id = String(option.id)
              return (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={selected.includes(id)}
                  onCheckedChange={() => toggleOption(id)}
                  onSelect={(e) => e.preventDefault()} // Prevent closing on selection
                  className="cursor-pointer"
                >
                  {option.name}
                </DropdownMenuCheckboxItem>
              )
            })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
