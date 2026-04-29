import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, ClipboardCheck, FileText, Settings, Users } from "../lib/lucide-compat";
import { useTranslation } from "../i18n/LanguageContext";
import { UserGroupIcon } from "../lib/lucide-compat";
import type { Group } from "../types/group";

interface SidebarProps {
  currentPage: string;
  currentGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onGoToGroup: () => void;
  onGoToStudents: () => void;
  onGoToAttendance: () => void;
  onGoToAssignments: () => void;
  onGoToReports: () => void;
  onGoToSettings: () => void;
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

export function Sidebar({
  currentPage,
  currentGroup,
  onGoToStudents,
  onGoToGroup,
  onGoToAttendance,
  onGoToAssignments,
  onGoToReports,
  onGoToSettings,
  onClose,
}: SidebarProps) {
  const { t } = useTranslation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const nav = (action: () => void) => () => {
    action();
    onClose?.();
  };

  const navItems = useMemo(
    () => [
      {
        id: "group",
        label: t("sidebar.group"),
        icon: UserGroupIcon,
        active: currentPage === "group",
        onClick: nav(onGoToGroup),
        disabled: !currentGroup,
      },
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
      onGoToGroup,
      onGoToReports,
      onGoToSettings,
      onGoToStudents,
      t,
    ],
  );

  return (
    <aside className="h-screen rounded-[14px] bg-neutral-200 p-3 dark:bg-neutral-900">
      <motion.div
        animate={{ width: 248 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.75 }}
        className="flex h-full flex-col overflow-hidden rounded-[14px] bg-neutral-100 p-2 text-foreground transition-colors duration-700 ease-out dark:bg-neutral-800"
      >
        <motion.div
          transition={{ duration: 0.35 }}
          className="min-h-0 flex-1 rounded-[14px] p-2 pt-1"
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
                    "relative flex items-center overflow-hidden rounded-md text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    item.active
                      ? "text-accent"
                      : "text-neutral-700 dark:text-neutral-200/70",
                    "min-h-12 px-3",
                  )}
                >
                  <AnimatePresence>
                    {item.active && (
                      <motion.span
                        className="absolute inset-0 z-0 rounded-sm bg-neutral-200 dark:bg-neutral-700"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {hoveredIndex === index &&
                      !item.active &&
                      !item.disabled && (
                        <motion.span
                          layoutId="sidebar-hover-bg"
                          className="absolute inset-0 z-0 rounded-md bg-neutral-200/60 dark:bg-neutral-900/50"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                  </AnimatePresence>

                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                    <Icon size={18} />
                  </span>

                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
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
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </aside>
  );
}
