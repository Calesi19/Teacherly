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

  return (
    <aside className="h-screen p-3">
      <motion.div
        animate={{ width: 248 }}
        transition={{ type: "spring", bounce: 0.28, duration: 0.75 }}
        className="relative flex h-full flex-col overflow-hidden rounded-[18px] border border-[color:var(--sidebar-border)] bg-[color:color-mix(in_srgb,var(--sidebar)_82%,white_18%)] p-2 text-foreground shadow-[0_24px_60px_rgba(74,108,126,0.18),inset_0_1px_0_rgba(255,255,255,0.52),inset_0_-1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl transition-colors duration-700 ease-out dark:bg-[color:color-mix(in_srgb,var(--sidebar)_86%,white_6%)] dark:shadow-[0_28px_72px_rgba(6,17,24,0.42),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(255,255,255,0.03)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(255,255,255,0.18)_28%,rgba(255,255,255,0.06)_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04)_30%,rgba(255,255,255,0.02)_100%)]" />
        <motion.div
          transition={{ duration: 0.35 }}
          className="relative min-h-0 flex-1 rounded-[16px] p-2 pt-1"
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
                      ? "text-accent"
                      : "text-neutral-700 dark:text-neutral-200/70",
                    "min-h-12 px-3",
                  )}
                >
                  <AnimatePresence>
                    {item.active && (
                      <motion.span
                        className="absolute inset-0 z-0 rounded-md border border-[color:color-mix(in_srgb,var(--sidebar-border)_82%,white_18%)] bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(255,255,255,0.34))] shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_10px_24px_rgba(98,108,118,0.14)] backdrop-blur-xl dark:border-[color:color-mix(in_srgb,var(--sidebar-border)_90%,white_10%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(8,18,26,0.22)]"
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
                          className="absolute inset-0 z-0 rounded-md border border-[color:color-mix(in_srgb,var(--sidebar-border)_72%,white_28%)] bg-[linear-gradient(135deg,rgba(255,255,255,0.3),rgba(255,255,255,0.18))] backdrop-blur-lg dark:border-[color:color-mix(in_srgb,var(--sidebar-border)_82%,white_18%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
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

            <button
              type="button"
              onMouseEnter={() => setHoveredIndex(navItems.length)}
              onClick={settingsItem.onClick}
              className={cn(
                "relative mt-auto flex min-h-12 items-center overflow-hidden rounded-md border border-transparent px-3 text-left transition-[color,border-color,background-color,box-shadow] duration-250",
                settingsItem.active
                  ? "text-accent"
                  : "text-neutral-700 dark:text-neutral-200/70",
              )}
            >
              <AnimatePresence>
                {settingsItem.active && (
                  <motion.span
                    className="absolute inset-0 z-0 rounded-md border border-[color:color-mix(in_srgb,var(--sidebar-border)_82%,white_18%)] bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(255,255,255,0.34))] shadow-[inset_0_1px_0_rgba(255,255,255,0.46),0_10px_24px_rgba(98,108,118,0.14)] backdrop-blur-xl dark:border-[color:color-mix(in_srgb,var(--sidebar-border)_90%,white_10%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(8,18,26,0.22)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {hoveredIndex === navItems.length && !settingsItem.active && (
                  <motion.span
                    layoutId="sidebar-hover-bg"
                    className="absolute inset-0 z-0 rounded-md border border-[color:color-mix(in_srgb,var(--sidebar-border)_72%,white_28%)] bg-[linear-gradient(135deg,rgba(255,255,255,0.3),rgba(255,255,255,0.18))] backdrop-blur-lg dark:border-[color:color-mix(in_srgb,var(--sidebar-border)_82%,white_18%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
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
                    ? "font-medium text-accent"
                    : "text-neutral-700 dark:text-neutral-200/70",
                )}
              >
                {settingsItem.label}
              </motion.span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </aside>
  );
}
