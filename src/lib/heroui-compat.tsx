import * as React from "react";
import { parseDate } from "@internationalized/date";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { Button as AppButton } from "@/components/ui/button";
import { Input as AppInput } from "@/components/ui/input";
import { Label as AppLabel } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter as AppDialogFooter,
  DialogHeader as AppDialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Key = string | number;

type ButtonProps = Omit<React.ComponentProps<typeof AppButton>, "variant"> & {
  onPress?: React.MouseEventHandler<HTMLButtonElement>;
  isDisabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "default";
};

function Button({
  onPress,
  isDisabled,
  variant,
  disabled,
  ...props
}: ButtonProps) {
  const mappedVariant =
    variant === "primary"
      ? "default"
      : variant === "danger"
        ? "destructive"
        : variant;

  return (
    <AppButton
      onClick={onPress ?? props.onClick}
      disabled={isDisabled ?? disabled}
      variant={mappedVariant as React.ComponentProps<typeof AppButton>["variant"]}
      {...props}
    />
  );
}

function Spinner({
  size = "md",
  color,
  className,
}: {
  size?: "sm" | "md" | "lg";
  color?: "accent" | "default";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  const colorClass = color === "accent" ? "text-accent" : "text-foreground/50";
  return <LoaderCircle className={cn("animate-spin", sizeClass, colorClass, className)} />;
}

const Label = AppLabel;
const Input = AppInput;

function Surface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-background", className)} {...props} />;
}

function Chip({
  variant = "soft",
  color = "default",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "soft";
  color?: "accent" | "default";
}) {
  const active = variant === "primary" || color === "accent";
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all",
        active
          ? "border border-accent/40 bg-accent/15 text-accent"
          : "border border-border bg-background text-foreground/60 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

type OverlayState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

function useOverlayState(): OverlayState {
  const [isOpen, setOpen] = React.useState(false);
  return {
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    setOpen,
  };
}

const ModalContext = React.createContext<{
  state: OverlayState;
  onOpenChange?: (open: boolean) => void;
} | null>(null);

function Modal({
  state,
  onOpenChange,
  children,
}: {
  state: OverlayState;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <ModalContext.Provider value={{ state, onOpenChange }}>
      {children}
    </ModalContext.Provider>
  );
}

function ModalBackdrop({
  children,
}: {
  children: React.ReactNode;
  isDismissable?: boolean;
}) {
  const context = React.useContext(ModalContext);
  if (!context) return null;

  return (
    <Dialog
      open={context.state.isOpen}
      onOpenChange={(open) => {
        if (open) context.state.open();
        else context.state.close();
        context.onOpenChange?.(open);
      }}
    >
      {children}
    </Dialog>
  );
}

function ModalContainer({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ModalDialog({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogContent showCloseButton={false} className={className}>
      {children}
    </DialogContent>
  );
}

function ModalHeader({
  children,
  className,
}: React.ComponentProps<"div">) {
  return (
    <AppDialogHeader className={className}>
      <DialogTitle>{children}</DialogTitle>
    </AppDialogHeader>
  );
}

function ModalBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

function ModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <AppDialogFooter className={className} {...props} />;
}

Modal.Backdrop = ModalBackdrop;
Modal.Container = ModalContainer;
Modal.Dialog = ModalDialog;
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

type CheckboxContextValue = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const CheckboxContext = React.createContext<CheckboxContextValue | null>(null);

function Checkbox({
  isSelected = false,
  onChange,
  children,
  className,
}: {
  isSelected?: boolean;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <CheckboxContext.Provider
      value={{ checked: isSelected, onChange: onChange ?? (() => {}) }}
    >
      <label className={cn("flex items-center gap-2", className)}>{children}</label>
    </CheckboxContext.Provider>
  );
}

function CheckboxControl({ children }: { children?: React.ReactNode }) {
  const context = React.useContext(CheckboxContext);
  if (!context) return null;

  return (
    <span className="inline-flex items-center">
      <input
        type="checkbox"
        checked={context.checked}
        onChange={(event) => context.onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      {children}
    </span>
  );
}

function CheckboxIndicator() {
  return null;
}

function CheckboxContent({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <span>{children}</span>;
}

Checkbox.Control = CheckboxControl;
Checkbox.Indicator = CheckboxIndicator;
Checkbox.Content = CheckboxContent;

function EmptyState({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={className} {...props} />;
}

function TableRoot({
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: "primary" }) {
  return <div className={cn("rounded-xl border bg-background", className)} {...props} />;
}

function TableScrollContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("overflow-auto", className)} {...props} />;
}

function TableContent({
  className,
  ...props
}: React.ComponentProps<"table"> & { selectionMode?: string }) {
  return <table className={cn("w-full text-sm", className)} {...props} />;
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableColumn({
  className,
  ...props
}: React.ComponentProps<"th"> & { isRowHeader?: boolean }) {
  return (
    <th
      className={cn("h-10 px-3 text-left align-middle font-medium text-foreground", className)}
      {...props}
    />
  );
}

function TableBody({
  children,
  renderEmptyState,
  className,
  ...props
}: React.ComponentProps<"tbody"> & { renderEmptyState?: () => React.ReactNode }) {
  const count = React.Children.count(children);
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
      {count > 0 ? children : (
        <tr>
          <td className="p-4" colSpan={999}>
            {renderEmptyState?.()}
          </td>
        </tr>
      )}
    </tbody>
  );
}

function TableRow({
  className,
  id: _id,
  ...props
}: Omit<React.ComponentProps<"tr">, "id"> & { id?: Key }) {
  return <tr className={cn("border-b", className)} {...props} />;
}

function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return <td className={cn("p-3 align-middle", className)} {...props} />;
}

type SelectItemRecord = {
  id: Key;
  text: string;
};

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode }).children);
  return "";
}

function extractSelectItems(node: React.ReactNode): SelectItemRecord[] {
  const items: SelectItemRecord[] = [];

  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const childProps = child.props as { children?: React.ReactNode };

    if ((child.type as { __heroUiCompatListBoxItem?: boolean }).__heroUiCompatListBoxItem) {
      const props = child.props as { id: Key; textValue?: string; children?: React.ReactNode };
      items.push({
        id: props.id,
        text: props.textValue ?? extractText(props.children),
      });
      return;
    }

    items.push(...extractSelectItems(childProps.children));
  });

  return items;
}

function Select({
  selectedKey,
  onSelectionChange,
  className,
  children,
  ...props
}: {
  selectedKey?: Key | null;
  onSelectionChange?: (key: Key | null) => void;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"select">, "onChange" | "value" | "children" | "className">) {
  const items = React.useMemo(() => extractSelectItems(children), [children]);
  const value = selectedKey == null ? "" : String(selectedKey);

  return (
    <select
      value={value}
      onChange={(event) => onSelectionChange?.(event.target.value === "" ? null : event.target.value)}
      className={cn(
        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    >
      <option value="" />
      {items.map((item) => (
        <option key={String(item.id)} value={String(item.id)}>
          {item.text}
        </option>
      ))}
    </select>
  );
}

function SelectTrigger({ children }: { children?: React.ReactNode; className?: string }) {
  return <>{children}</>;
}

function SelectValue({
  children,
}: {
  children?: React.ReactNode | ((args: { selectedText?: string; isPlaceholder: boolean }) => React.ReactNode);
}) {
  return <>{typeof children === "function" ? null : children}</>;
}

function SelectIndicator() {
  return <ChevronDown className="hidden" />;
}

function SelectPopover({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

Select.Trigger = SelectTrigger;
Select.Value = SelectValue;
Select.Indicator = SelectIndicator;
Select.Popover = SelectPopover;

function ListBox({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function ListBoxItem({
  children,
}: {
  id: Key;
  textValue?: string;
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}

(ListBoxItem as { __heroUiCompatListBoxItem?: boolean }).__heroUiCompatListBoxItem = true;
ListBox.Item = ListBoxItem;

type DatePickerContextValue = {
  value: { toString(): string } | null | undefined;
  minValue?: { toString(): string } | null | undefined;
  onChange?: (value: ReturnType<typeof parseDate> | null) => void;
  ariaLabel?: string;
};

const DatePickerContext = React.createContext<DatePickerContextValue | null>(null);

function DatePicker({
  value,
  minValue,
  onChange,
  ariaLabel,
  className,
  children,
}: {
  value?: { toString(): string } | null;
  minValue?: { toString(): string } | null;
  onChange?: (value: ReturnType<typeof parseDate> | null) => void;
  ariaLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <DatePickerContext.Provider value={{ value, minValue, onChange, ariaLabel }}>
      <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
    </DatePickerContext.Provider>
  );
}

const DateField = {
  Group({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
    fullWidth?: boolean;
  }) {
    return <div className={cn("relative", className)}>{children}</div>;
  },
  Input({
    className,
    children: _children,
  }: {
    children?: (segment: unknown) => React.ReactNode;
    className?: string;
  }) {
    const context = React.useContext(DatePickerContext);
    if (!context) return null;

    return (
      <input
        type="date"
        aria-label={context.ariaLabel}
        value={context.value?.toString() ?? ""}
        min={context.minValue?.toString() ?? undefined}
        onChange={(event) => context.onChange?.(event.target.value ? parseDate(event.target.value) : null)}
        className={cn(
          "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      />
    );
  },
  Segment(_props: { segment?: unknown }) {
    return null;
  },
  Suffix({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  },
};

function DatePickerTrigger({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function DatePickerTriggerIndicator() {
  return null;
}

function DatePickerPopover(_props: { children?: React.ReactNode }) {
  return null;
}

DatePicker.Trigger = DatePickerTrigger;
DatePicker.TriggerIndicator = DatePickerTriggerIndicator;
DatePicker.Popover = DatePickerPopover;

function Calendar(_props: { children?: React.ReactNode; "aria-label"?: string }) {
  return null;
}

Calendar.Header = function CalendarHeader(_props: { children?: React.ReactNode }) {
  return null;
};
Calendar.YearPickerTrigger = function CalendarYearPickerTrigger(_props: { children?: React.ReactNode }) {
  return null;
};
Calendar.YearPickerTriggerHeading = function CalendarYearPickerTriggerHeading() {
  return null;
};
Calendar.YearPickerTriggerIndicator = function CalendarYearPickerTriggerIndicator() {
  return null;
};
Calendar.NavButton = function CalendarNavButton(_props: { slot?: string }) {
  return null;
};
Calendar.Grid = function CalendarGrid(_props: { children?: React.ReactNode }) {
  return null;
};
Calendar.GridHeader = function CalendarGridHeader(_props: {
  children?: React.ReactNode | ((day: React.ReactNode) => React.ReactNode);
}) {
  return null;
};
Calendar.HeaderCell = function CalendarHeaderCell(_props: { children?: React.ReactNode }) {
  return null;
};
Calendar.GridBody = function CalendarGridBody(_props: {
  children?: React.ReactNode | ((date: React.ReactNode) => React.ReactNode);
}) {
  return null;
};
Calendar.Cell = function CalendarCell(_props: { date?: unknown }) {
  return null;
};
Calendar.YearPickerGrid = function CalendarYearPickerGrid(_props: { children?: React.ReactNode }) {
  return null;
};
Calendar.YearPickerGridBody = function CalendarYearPickerGridBody(_props: {
  children?: React.ReactNode | ((args: { year: React.ReactNode }) => React.ReactNode);
}) {
  return null;
};
Calendar.YearPickerCell = function CalendarYearPickerCell(_props: { year?: unknown }) {
  return null;
};

export {
  Button,
  Calendar,
  Checkbox,
  Chip,
  DateField,
  DatePicker,
  EmptyState,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  Surface,
  TableBody,
  TableCell,
  TableColumn,
  TableContent,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollContainer,
  useOverlayState,
};
