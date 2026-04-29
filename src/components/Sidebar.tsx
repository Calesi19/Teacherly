import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";

interface SidebarProps {
  currentPage: string;
  currentGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onGoToStudents: () => void;
  onGoToAttendance: () => void;
  onGoToAssignments: () => void;
  onGoToReports: () => void;
  onGoToSettings: () => void;
  onGoToGroups: () => void;
  onClose?: () => void;
}

const STUDENTS_PAGES = new Set([
  "students",
  "student-profile",
  "student-info",
  "contacts",
  "addresses",
  "student-services",
  "student-accommodations",
  "student-observations",
  "visitations",
  "notes",
]);

const formatMonthYear = (dateString: string | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
};

export function Sidebar({
  currentPage,
  currentGroup,
  onGoToStudents,
  onGoToAttendance,
  onGoToAssignments,
  onGoToReports,
  onGoToSettings,
  onGoToGroups,
  onClose,
}: SidebarProps) {
  const { t } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const nav = (action: () => void) => () => {
    action();
    onClose?.();
  };

  const navItems = useMemo(
    () => [
      {
        id: "students",
        label: t("sidebar.students"),
        icon: Users,
        active: STUDENTS_PAGES.has(currentPage),
        onClick: nav(onGoToStudents),
        disabled: !currentGroup,
      },
      {
        id: "attendance",
        label: t("sidebar.attendance"),
        icon: ClipboardCheck,
        active: currentPage === "attendance",
        onClick: nav(onGoToAttendance),
        disabled: !currentGroup,
      },
      {
        id: "assignments",
        label: t("sidebar.assignments"),
        icon: BookOpen,
        active:
          currentPage === "assignments" || currentPage === "assignment-detail",
        onClick: nav(onGoToAssignments),
        disabled: !currentGroup,
      },
      {
        id: "reports",
        label: t("sidebar.reports"),
        icon: FileText,
        active: currentPage === "reports",
        onClick: nav(onGoToReports),
        disabled: !currentGroup,
      },
      {
        id: "settings",
        label: t("sidebar.settings"),
        icon: Settings,
        active: currentPage === "settings",
        onClick: nav(onGoToSettings),
        disabled: false,
      },
    ],
    [
      currentGroup,
      currentPage,
      onGoToAssignments,
      onGoToAttendance,
      onGoToGroups,
      onGoToReports,
      onGoToSettings,
      onGoToStudents,
      t,
    ],
  );

  return (
    <aside className="h-screen rounded-[28px] bg-neutral-200 p-3 dark:bg-neutral-900">
      <motion.div
        animate={{ width: isOpen ? 248 : 72 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.75 }}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[28px] p-2 text-foreground transition-colors duration-700 ease-out",
          isOpen ? "bg-neutral-100 dark:bg-neutral-800" : "bg-transparent",
        )}
      >
        <div
          data-tauri-drag-region
          className={cn(
            "flex h-12 shrink-0 items-center px-2",
            isOpen ? "justify-end" : "justify-center",
          )}
        >
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-black/5 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/8 dark:hover:text-white"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="px-3 pb-4 pt-1"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[1.05rem] font-semibold tracking-tight text-neutral-950 dark:text-white">
                  {currentGroup?.name ?? "Select Group"}
                </p>
                <button
                  type="button"
                  onClick={nav(onGoToGroups)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-black/5 hover:text-neutral-950 dark:text-neutral-300 dark:hover:bg-white/8 dark:hover:text-white"
                  aria-label={t("sidebar.changeGroup")}
                >
                  <ArrowLeftRight size={16} />
                </button>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {currentGroup
                  ? `${formatMonthYear(currentGroup.start_date ?? undefined)} - ${formatMonthYear(
                      currentGroup.end_date ?? undefined,
                    )}`
                  : t("commandPalette.items.selectAGroup")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          transition={{ duration: 0.35 }}
          className="min-h-0 flex-1 rounded-[22px] p-2"
        >
          <div
            className="flex h-full flex-col gap-1"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {navItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onClick={item.onClick}
                  className={cn(
                    "relative flex items-center overflow-hidden rounded-lg text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    item.active
                      ? "text-accent"
                      : "text-neutral-700 dark:text-neutral-200/70",
                    isOpen ? "min-h-12 px-3" : "min-h-12 justify-center px-0",
                  )}
                >
                  <AnimatePresence>
                    {item.active && (
                      <motion.span
                        className="absolute inset-0 z-0 rounded-lg bg-neutral-200 dark:bg-neutral-700"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {hoveredIndex === index && !item.active && !item.disabled && (
                      <motion.span
                        layoutId="sidebar-hover-bg"
                        className="absolute inset-0 z-0 rounded-lg bg-neutral-200/60 dark:bg-neutral-900/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>

                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                    <Icon size={18} />
                  </span>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.16 }}
                        className={cn(
                          "relative z-10 truncate pr-3 text-sm tracking-tight",
                          item.active
                            ? "font-medium text-accent"
                            : "text-neutral-700 dark:text-neutral-200/70",
                        )}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </aside>
  );
}
