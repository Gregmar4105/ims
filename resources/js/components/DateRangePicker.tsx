"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import type { DateRange} from "react-day-picker";
import { DayPicker } from "react-day-picker"

import { Button, buttonVariants } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import "react-day-picker/style.css"

interface DateRangePickerProps {
    className?: string
    dateRange: DateRange | undefined
    onDateRangeChange: (range: DateRange | undefined) => void
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

export function DateRangePicker({
    className,
    dateRange,
    onDateRangeChange,
}: DateRangePickerProps) {
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

    const [startMonth, setStartMonth] = React.useState<Date>(dateRange?.from || new Date())
    const [endMonth, setEndMonth] = React.useState<Date>(dateRange?.to || new Date())

    const handleStartMonthChange = (monthIndex: string) => {
        const newMonth = new Date(startMonth)
        newMonth.setMonth(parseInt(monthIndex))
        setStartMonth(newMonth)
    }

    const handleStartYearChange = (year: string) => {
        const newMonth = new Date(startMonth)
        newMonth.setFullYear(parseInt(year))
        setStartMonth(newMonth)
    }

    const handleEndMonthChange = (monthIndex: string) => {
        const newMonth = new Date(endMonth)
        newMonth.setMonth(parseInt(monthIndex))
        setEndMonth(newMonth)
    }

    const handleEndYearChange = (year: string) => {
        const newMonth = new Date(endMonth)
        newMonth.setFullYear(parseInt(year))
        setEndMonth(newMonth)
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full sm:w-[280px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col sm:flex-row">
                        {/* Left Calendar - From Date */}
                        <div className="border-b sm:border-b-0 sm:border-r">
                            <div className="p-3 border-b flex items-center justify-center gap-2">
                                <Select
                                    value={startMonth.getMonth().toString()}
                                    onValueChange={handleStartMonthChange}
                                >
                                    <SelectTrigger className="w-[110px] h-8">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((monthName, index) => (
                                            <SelectItem key={monthName} value={index.toString()}>
                                                {monthName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={startMonth.getFullYear().toString()}
                                    onValueChange={handleStartYearChange}
                                >
                                    <SelectTrigger className="w-[80px] h-8">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DayPicker
                                mode="range"
                                month={startMonth}
                                onMonthChange={setStartMonth}
                                selected={dateRange}
                                onSelect={onDateRangeChange}
                                numberOfMonths={1}
                                showOutsideDays
                                className="p-3"
                                classNames={{
                                    months: "flex flex-col sm:flex-row gap-4",
                                    month: "flex flex-col gap-4",
                                    month_caption: "hidden",
                                    caption_label: "text-sm font-medium",
                                    nav: "flex items-center gap-1",
                                    button_previous: cn(
                                        buttonVariants({ variant: "outline" }),
                                        "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    button_next: cn(
                                        buttonVariants({ variant: "outline" }),
                                        "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    month_grid: "w-full border-collapse",
                                    weekdays: "flex",
                                    weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                                    week: "flex w-full mt-2",
                                    day: "p-0 text-center text-sm relative",
                                    day_button: cn(
                                        buttonVariants({ variant: "ghost" }),
                                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                                    ),
                                    range_start: "day-range-start rounded-l-md",
                                    range_end: "day-range-end rounded-r-md",
                                    selected:
                                        "bg-orange-500 text-white hover:bg-orange-600 hover:text-white focus:bg-orange-500 focus:text-white rounded-md",
                                    today: "bg-accent text-accent-foreground rounded-md",
                                    outside: "text-muted-foreground opacity-50",
                                    disabled: "text-muted-foreground opacity-50",
                                    range_middle: "aria-selected:bg-orange-100 aria-selected:text-orange-900 dark:aria-selected:bg-orange-950 dark:aria-selected:text-orange-100",
                                    hidden: "invisible",
                                }}
                            />
                        </div>

                        {/* Right Calendar - To Date */}
                        <div>
                            <div className="p-3 border-b flex items-center justify-center gap-2">
                                <Select
                                    value={endMonth.getMonth().toString()}
                                    onValueChange={handleEndMonthChange}
                                >
                                    <SelectTrigger className="w-[110px] h-8">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((monthName, index) => (
                                            <SelectItem key={monthName} value={index.toString()}>
                                                {monthName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={endMonth.getFullYear().toString()}
                                    onValueChange={handleEndYearChange}
                                >
                                    <SelectTrigger className="w-[80px] h-8">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DayPicker
                                mode="range"
                                month={endMonth}
                                onMonthChange={setEndMonth}
                                selected={dateRange}
                                onSelect={onDateRangeChange}
                                numberOfMonths={1}
                                showOutsideDays
                                className="p-3"
                                classNames={{
                                    months: "flex flex-col sm:flex-row gap-4",
                                    month: "flex flex-col gap-4",
                                    month_caption: "hidden",
                                    caption_label: "text-sm font-medium",
                                    nav: "flex items-center gap-1",
                                    button_previous: cn(
                                        buttonVariants({ variant: "outline" }),
                                        "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    button_next: cn(
                                        buttonVariants({ variant: "outline" }),
                                        "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                                    ),
                                    month_grid: "w-full border-collapse",
                                    weekdays: "flex",
                                    weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                                    week: "flex w-full mt-2",
                                    day: "p-0 text-center text-sm relative",
                                    day_button: cn(
                                        buttonVariants({ variant: "ghost" }),
                                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                                    ),
                                    range_start: "day-range-start rounded-l-md",
                                    range_end: "day-range-end rounded-r-md",
                                    selected:
                                        "bg-orange-500 text-white hover:bg-orange-600 hover:text-white focus:bg-orange-500 focus:text-white rounded-md",
                                    today: "bg-accent text-accent-foreground rounded-md",
                                    outside: "text-muted-foreground opacity-50",
                                    disabled: "text-muted-foreground opacity-50",
                                    range_middle: "aria-selected:bg-orange-100 aria-selected:text-orange-900 dark:aria-selected:bg-orange-950 dark:aria-selected:text-orange-100",
                                    hidden: "invisible",
                                }}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
