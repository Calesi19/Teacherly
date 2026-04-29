import { useCallback, useState } from "react";
import { Inbox, Pencil } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-foreground/30 transition-colors hover:text-foreground/70"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value ?? <span className="text-foreground/30">—</span>}
      </span>
    </div>
  );
}

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-background p-5", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  onEdit,
  ariaLabel,
  editLabel,
}: {
  title: string;
  onEdit: () => void;
  ariaLabel: string;
  editLabel: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70"
        aria-label={ariaLabel}
      >
        <Pencil size={12} />
        {editLabel}
      </button>
    </div>
  );
}

export function LoadingSpinner({ large = false }: { large?: boolean }) {
  return (
    <div className="flex justify-center py-4">
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-accent border-t-transparent",
          large ? "h-8 w-8 py-12" : "h-5 w-5",
        )}
      />
    </div>
  );
}

export function TableEmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="size-6 text-muted" />
      <span className="text-sm font-medium text-muted">{title}</span>
      {hint ? <span className="text-xs text-foreground/40">{hint}</span> : null}
    </div>
  );
}

export function IconTooltip({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full",
              className,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
