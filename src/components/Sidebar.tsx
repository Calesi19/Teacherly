import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  Settings,
  UserGroupIcon,
  Users,
} from "../lib/lucide-compat";
import { useTranslation } from "../i18n/LanguageContext";
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
  onChangeGroup: () => void;
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
  onChangeGroup,
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
    () => {
      if (!currentGroup || currentPage === "groups") return [];

      return [
        {
          id: "group",
          label: t("sidebar.group"),
          icon: UserGroupIcon,
          active: currentPage === "group",
          onClick: nav(onGoToGroup),
        },
        {
          id: "students",
          label: t("sidebar.students"),
          icon: Users,
          active: STUDENTS_PAGES.has(currentPage),
          onClick: nav(onGoToStudents),
        },
        {
          id: "attendance",
          label: t("sidebar.attendance"),
          icon: ClipboardCheck,
          active: currentPage === "attendance",
          onClick: nav(onGoToAttendance),
        },
        {
          id: "assignments",
          label: t("sidebar.assignments"),
          icon: BookOpen,
          active:
            currentPage === "assignments" || currentPage === "assignment-detail",
          onClick: nav(onGoToAssignments),
        },
        {
          id: "reports",
          label: t("sidebar.reports"),
          icon: FileText,
          active: currentPage === "reports",
          onClick: nav(onGoToReports),
        },
      ];
    },
    [
      currentGroup,
      currentPage,
      onGoToAssignments,
      onGoToAttendance,
      onGoToGroup,
      onGoToReports,
      onGoToStudents,
      t,
    ],
  );

  const settingsItem = useMemo(
    () => ({
      id: "settings",
      label: t("sidebar.settings"),
      icon: Settings,
      active: currentPage === "settings",
      onClick: nav(onGoToSettings),
      disabled: false,
    }),
    [currentPage, onGoToSettings, t],
  );

  const changeGroupItem = useMemo(
    () => ({
      id: "change-group",
      label: t("sidebar.changeGroup"),
      icon: ArrowLeftRight,
      active: currentPage === "groups",
      onClick: nav(onChangeGroup),
      disabled: false,
    }),
    [currentPage, onChangeGroup, t],
  );

  return (
    <aside className="h-screen">
      <motion.div
        animate={{ width: 248 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.75 }}
        className="relative flex h-full flex-col overflow-hidden border-r border-[color:var(--sidebar-border)] bg-[color:var(--sidebar)] p-2 text-foreground transition-colors duration-300 ease-out"
      >
        <motion.div
          transition={{ duration: 0.35 }}
          className="relative min-h-0 flex-1 rounded-lg p-2 pt-1"
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
                    "relative flex items-center overflow-hidden rounded-md border border-transparent text-left transition-[color,border-color,background-color,box-shadow] duration-250 disabled:cursor-not-allowed disabled:opacity-40",
                    item.active
                      ? "text-foreground"
                      : "text-neutral-700 dark:text-neutral-200/70",
                    "min-h-12 px-3",
                  )}
                >
                  <AnimatePresence>
                    {item.active && (
                      <motion.span
                        className="absolute inset-0 z-0 rounded-md border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar-foreground)_8%,transparent)] shadow-xs"
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
                          className="absolute inset-0 z-0 rounded-md border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar-foreground)_5%,transparent)]"
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
                        ? "font-medium text-foreground"
                        : "text-neutral-700 dark:text-neutral-200/70",
                    )}
                  >
                    {item.label}
                  </motion.span>
                </button>
              );
            })}

            <div className="mt-auto flex flex-col gap-1">
              <button
                type="button"
                onMouseEnter={() => setHoveredIndex(navItems.length)}
                onClick={changeGroupItem.onClick}
                className={cn(
                  "relative flex min-h-12 items-center overflow-hidden rounded-md border border-transparent px-3 text-left transition-[color,border-color,background-color,box-shadow] duration-250",
                  changeGroupItem.active
                    ? "text-foreground"
                    : "text-neutral-700 dark:text-neutral-200/70",
                )}
              >
                <AnimatePresence>
                  {changeGroupItem.active && (
                    <motion.span
                      className="absolute inset-0 z-0 rounded-md border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar-foreground)_8%,transparent)] shadow-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {hoveredIndex === navItems.length && !changeGroupItem.active && (
                    <motion.span
                      layoutId="sidebar-hover-bg"
                      className="absolute inset-0 z-0 rounded-md border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar-foreground)_5%,transparent)]"
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
                  <ArrowLeftRight size={18} />
                </span>

                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.16 }}
                  className={cn(
                    "relative z-10 truncate pr-3 text-sm tracking-tight",
                    changeGroupItem.active
                      ? "font-medium text-foreground"
                      : "text-neutral-700 dark:text-neutral-200/70",
                  )}
                >
                  {changeGroupItem.label}
                </motion.span>
              </button>

              <button
                type="button"
                onMouseEnter={() => setHoveredIndex(navItems.length + 1)}
                onClick={settingsItem.onClick}
                className={cn(
                  "relative flex min-h-12 items-center overflow-hidden rounded-md border border-transparent px-3 text-left transition-[color,border-color,background-color,box-shadow] duration-250",
                  settingsItem.active
                    ? "text-foreground"
                    : "text-neutral-700 dark:text-neutral-200/70",
                )}
              >
                <AnimatePresence>
                  {settingsItem.active && (
                    <motion.span
                      className="absolute inset-0 z-0 rounded-md border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar-foreground)_8%,transparent)] shadow-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {hoveredIndex === navItems.length + 1 && !settingsItem.active && (
                    <motion.span
                      layoutId="sidebar-hover-bg"
                      className="absolute inset-0 z-0 rounded-md border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar-foreground)_5%,transparent)]"
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
                  <Settings size={18} />
                </span>

                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.16 }}
                  className={cn(
                    "relative z-10 truncate pr-3 text-sm tracking-tight",
                    settingsItem.active
                      ? "font-medium text-foreground"
                      : "text-neutral-700 dark:text-neutral-200/70",
                  )}
                >
                  {settingsItem.label}
                </motion.span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </aside>
  );
}
