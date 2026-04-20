import { useRef } from "react";
import { Button, DatePicker, Calendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateNavigatorProps {
  date: string;
  onChange: (date: string) => void;
  minDate?: string | null;
  maxDate?: string | null;
}

function formatDisplay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(undefined, {
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
  const isToday = date === today();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canGoPrev = !minDate || addDays(date, -1) >= minDate;
  const canGoNext = !maxDate || addDays(date, 1) <= maxDate;
  const todayDate = today();
  const isTodayInRange =
    (!minDate || todayDate >= minDate) && (!maxDate || todayDate <= maxDate);

  return (
    <div className="flex items-center gap-2 py-3 px-1">
      <Button variant="ghost" isIconOnly size="sm" onPress={() => onChange(addDays(date, -1))} isDisabled={!canGoPrev} aria-label="Previous day">
        <ChevronLeft size={16} />
      </Button>

      <DatePicker
        className="flex-1"
        aria-label="Jump to date"
        value={parseDate(date)}
        minValue={minDate ? parseDate(minDate) : undefined}
        maxValue={maxDate ? parseDate(maxDate) : undefined}
        onChange={(val: DateValue | null) => {
          if (val) onChange(val.toString());
        }}
      >
        <DatePicker.Trigger>
          <button ref={triggerRef} className="w-full font-semibold text-sm px-2 py-1 rounded-lg hover:bg-foreground/5 transition-colors select-none cursor-pointer">
            {formatDisplay(date)}
          </button>
        </DatePicker.Trigger>
        <DatePicker.Popover placement="bottom" triggerRef={triggerRef}>
          <Calendar aria-label="Pick a date">
            <Calendar.Header>
              <Calendar.YearPickerTrigger>
                <Calendar.YearPickerTriggerHeading />
                <Calendar.YearPickerTriggerIndicator />
              </Calendar.YearPickerTrigger>
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {(d) => <Calendar.Cell date={d} />}
              </Calendar.GridBody>
            </Calendar.Grid>
            <Calendar.YearPickerGrid>
              <Calendar.YearPickerGridBody>
                {({ year }) => <Calendar.YearPickerCell year={year} />}
              </Calendar.YearPickerGridBody>
            </Calendar.YearPickerGrid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>

      {!isToday && isTodayInRange && (
        <Button variant="ghost" size="sm" onPress={() => onChange(today())}>
          Today
        </Button>
      )}

      <Button variant="ghost" isIconOnly size="sm" onPress={() => onChange(addDays(date, 1))} isDisabled={!canGoNext} aria-label="Next day">
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
