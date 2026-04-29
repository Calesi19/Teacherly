import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

function parseLocalDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface AppDatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minValue?: string;
  maxValue?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AppDatePicker({
  label,
  value,
  onChange,
  minValue,
  maxValue,
  placeholder = "Pick a date",
  className,
  disabled,
}: AppDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const fromDate = parseLocalDate(minValue ?? "");
  const toDate = parseLocalDate(maxValue ?? "");

  const displayValue = selected
    ? selected.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : placeholder;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {displayValue}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected ?? (fromDate ?? undefined)}
            onSelect={(date) => {
              onChange(date ? toDateString(date) : "");
              setOpen(false);
            }}
            disabled={(date) => {
              if (fromDate && date < fromDate) return true;
              if (toDate && date > toDate) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
