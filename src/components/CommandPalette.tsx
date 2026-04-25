import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";

export type CommandPaletteCategory =
  | "recent"
  | "pages"
  | "actions"
  | "students"
  | "assignments";

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  category: CommandPaletteCategory;
  icon: ReactNode;
  perform: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  items: CommandPaletteItem[];
  recentItems: CommandPaletteItem[];
  onClose: () => void;
  onSelect: (item: CommandPaletteItem) => void;
}

const CATEGORY_ORDER: CommandPaletteCategory[] = [
  "recent",
  "pages",
  "actions",
  "students",
  "assignments",
];

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled"));
}

export function CommandPalette({
  isOpen,
  items,
  recentItems,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const headingId = useId();
  const listboxId = useId();

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return items.filter((item) => {
      const haystack = [
        item.title,
        item.subtitle ?? "",
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query]);

  const activeItems = query.trim() ? filteredItems : recentItems;

  const groupedItems = useMemo(() => {
    const groups = new Map<CommandPaletteCategory, CommandPaletteItem[]>();

    for (const item of activeItems) {
      const existing = groups.get(item.category);
      if (existing) existing.push(item);
      else groups.set(item.category, [item]);
    }

    return CATEGORY_ORDER.flatMap((category) => {
      const categoryItems = groups.get(category);
      if (!categoryItems?.length) return [];
      return [{ category, items: categoryItems }];
    });
  }, [activeItems]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setHighlightedIndex(0);

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (highlightedIndex > activeItems.length - 1) {
      setHighlightedIndex(activeItems.length > 0 ? activeItems.length - 1 : 0);
    }
  }, [activeItems, highlightedIndex, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    previouslyFocusedRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const activeItem = activeItems[highlightedIndex];
  const activeDescendant =
    activeItem ? `${listboxId}-option-${activeItem.id}` : undefined;

  const handleSelect = (item: CommandPaletteItem) => {
    onSelect(item);
    setQuery("");
    setHighlightedIndex(0);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (activeItems.length === 0) return;
      setHighlightedIndex((index) => (index + 1) % activeItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (activeItems.length === 0) return;
      setHighlightedIndex(
        (index) => (index - 1 + activeItems.length) % activeItems.length,
      );
      return;
    }

    if (event.key === "Enter") {
      if (!activeItem) return;
      event.preventDefault();
      handleSelect(activeItem);
      return;
    }

    if (event.key === "Tab" && dialogRef.current) {
      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const categoryLabel = (category: CommandPaletteCategory) => {
    switch (category) {
      case "recent":
        return t("commandPalette.categories.recent");
      case "pages":
        return t("commandPalette.categories.pages");
      case "actions":
        return t("commandPalette.categories.actions");
      case "students":
        return t("commandPalette.categories.students");
      case "assignments":
        return t("commandPalette.categories.assignments");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-start justify-center bg-background/55 px-4 pt-[12vh] backdrop-blur-md sm:px-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-border/70 bg-surface/86 text-foreground shadow-[0_30px_80px_rgba(15,23,42,0.18)] ring-1 ring-border/35 backdrop-blur-2xl"
        onKeyDown={handleKeyDown}
      >
        <h2 id={headingId} className="sr-only">
          {t("commandPalette.title")}
        </h2>

        <div className="border-b border-border/60 px-5 py-4">
          <label htmlFor="command-palette-search" className="sr-only">
            {t("commandPalette.searchLabel")}
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Search size={18} className="text-muted" />
            <input
              id="command-palette-search"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightedIndex(0);
              }}
              aria-label={t("commandPalette.searchLabel")}
              aria-controls={listboxId}
              aria-expanded="true"
              aria-activedescendant={activeDescendant}
              aria-autocomplete="list"
              role="combobox"
              placeholder={t("commandPalette.placeholder")}
              className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
            />
            <div className="hidden items-center gap-1 rounded-full border border-border bg-surface-secondary/85 px-2.5 py-1 text-[11px] font-medium tracking-wide text-muted sm:flex">
              <span>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}</span>
              <span>K</span>
            </div>
          </div>
        </div>

        <div className="max-h-[28rem] overflow-y-auto px-3 py-3">
          {!query.trim() ? (
            recentItems.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-[22px] border border-dashed border-border bg-surface-secondary/45 px-6 text-center">
                <p className="text-sm font-medium text-foreground">
                  {t("commandPalette.emptyState")}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {t("commandPalette.emptyStateHint")}
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3 rounded-[22px] border border-dashed border-border bg-surface-secondary/45 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {t("commandPalette.emptyState")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t("commandPalette.emptyStateHint")}
                  </p>
                </div>
                <div role="listbox" id={listboxId} aria-label={t("commandPalette.resultsLabel")}>
                  {groupedItems.map((group) => (
                    <section key={group.category} className="mb-3 last:mb-0">
                      <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                        {categoryLabel(group.category)}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const itemIndex = activeItems.findIndex(
                            (candidate) => candidate.id === item.id,
                          );
                          const isActive = itemIndex === highlightedIndex;

                          return (
                            <button
                              key={item.id}
                              id={`${listboxId}-option-${item.id}`}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              onMouseEnter={() => setHighlightedIndex(itemIndex)}
                              onClick={() => handleSelect(item)}
                              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                                isActive
                                  ? "bg-accent text-accent-foreground shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                                  : "text-foreground hover:bg-surface-secondary/80"
                              }`}
                            >
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                                  isActive
                                    ? "border-accent-foreground/15 bg-accent-foreground/10"
                                    : "border-border bg-background/70 text-accent"
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {item.title}
                                </span>
                                {item.subtitle ? (
                                  <span
                                    className={`mt-0.5 block truncate text-xs ${
                                      isActive
                                        ? "text-accent-foreground/75"
                                        : "text-muted"
                                    }`}
                                  >
                                    {item.subtitle}
                                  </span>
                                ) : null}
                              </span>
                              <ArrowRight
                                size={16}
                                className={
                                  isActive ? "text-accent-foreground/75" : "text-muted"
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )
          ) : query.trim() && filteredItems.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-[22px] border border-dashed border-border bg-surface-secondary/45 px-6 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("commandPalette.noResults")}
              </p>
              <p className="mt-2 text-xs text-muted">
                {t("commandPalette.noResultsHint", { query })}
              </p>
            </div>
          ) : (
            <div role="listbox" id={listboxId} aria-label={t("commandPalette.resultsLabel")}>
              {groupedItems.map((group) => (
                <section key={group.category} className="mb-3 last:mb-0">
                  <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {categoryLabel(group.category)}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const itemIndex = activeItems.findIndex(
                        (candidate) => candidate.id === item.id,
                      );
                      const isActive = itemIndex === highlightedIndex;

                      return (
                        <button
                          key={item.id}
                          id={`${listboxId}-option-${item.id}`}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setHighlightedIndex(itemIndex)}
                          onClick={() => handleSelect(item)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                            isActive
                              ? "bg-accent text-accent-foreground shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                              : "text-foreground hover:bg-surface-secondary/80"
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                              isActive
                                ? "border-accent-foreground/15 bg-accent-foreground/10"
                                : "border-border bg-background/70 text-accent"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {item.title}
                            </span>
                            {item.subtitle ? (
                              <span
                                className={`mt-0.5 block truncate text-xs ${
                                  isActive
                                    ? "text-accent-foreground/75"
                                    : "text-muted"
                                }`}
                              >
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          <ArrowRight
                            size={16}
                            className={
                              isActive ? "text-accent-foreground/75" : "text-muted"
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
