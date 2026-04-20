import { Button, DatePicker, DateField, Calendar } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface DateNavigatorProps {
  date: string;
  onChange: (date: string) => void;
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

export function DateNavigator({ date, onChange }: DateNavigatorProps) {
  const isToday = date === today();

  return (
    <div className="flex items-center gap-2 py-3 px-1">
      <Button variant="ghost" isIconOnly size="sm" onPress={() => onChange(addDays(date, -1))} aria-label="Previous day">
        <ChevronLeft size={16} />
      </Button>

      <span className="flex-1 text-center font-semibold text-sm select-none">
        {formatDisplay(date)}
      </span>

      {!isToday && (
        <Button variant="ghost" size="sm" onPress={() => onChange(today())}>
          Today
        </Button>
      )}

      <Button variant="ghost" isIconOnly size="sm" onPress={() => onChange(addDays(date, 1))} aria-label="Next day">
        <ChevronRight size={16} />
      </Button>

      <DatePicker
        aria-label="Jump to date"
        value={parseDate(date)}
        onChange={(val: DateValue | null) => {
          if (val) onChange(val.toString());
        }}
      >
        <DateField.Group>
          <DateField.Suffix>
            <DatePicker.Trigger>
              <Button variant="ghost" isIconOnly size="sm" aria-label="Open calendar">
                <CalendarDays size={16} />
              </Button>
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DatePicker.Popover>
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
    </div>
  );
}
