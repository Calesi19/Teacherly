import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";

interface DateNavigatorProps {
  date: string;
  onChange: (date: string) => void;
  minDate?: string | null;
  maxDate?: string | null;
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(dateStr: string, locale: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function DateNavigator({ date, onChange, minDate, maxDate }: DateNavigatorProps) {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const isToday = date === today();
  const canGoPrev = !minDate || addDays(date, -1) >= minDate;
  const canGoNext = !maxDate || addDays(date, 1) <= maxDate;
  const todayDate = today();
  const isTodayInRange =
    (!minDate || todayDate >= minDate) && (!maxDate || todayDate <= maxDate);

  const selected = parseLocalDate(date);
  const fromDate = minDate ? parseLocalDate(minDate) : undefined;
  const toDate = maxDate ? parseLocalDate(maxDate) : undefined;

  return (
    <div className="flex items-center gap-2 py-3 px-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(addDays(date, -1))}
        disabled={!canGoPrev}
        aria-label="Previous day"
        className="h-8 w-8"
      >
        <ChevronLeft size={16} />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button className="flex-1 cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold transition-colors select-none hover:bg-foreground/5" />
          }
        >
          {formatDisplay(date, language)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (d) {
                onChange(toDateString(d));
                setOpen(false);
              }
            }}
            disabled={(d) => {
              if (fromDate && d < fromDate) return true;
              if (toDate && d > toDate) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {!isToday && isTodayInRange && (
        <Button variant="ghost" size="sm" onClick={() => onChange(today())}>
          {t("attendance.today")}
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(addDays(date, 1))}
        disabled={!canGoNext}
        aria-label="Next day"
        className="h-8 w-8"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
