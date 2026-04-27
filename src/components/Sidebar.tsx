import { Button } from "@heroui/react";
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  FileText,
  Settings,
  LayoutDashboard,
  ArrowLeftRight,
} from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import { APP_NAME } from "../appConfig";

interface SidebarProps {
  currentPage: string;
  currentGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onGoToDashboard: () => void;
  onGoToStudents: () => void;
  onGoToSchedule: () => void;
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
  "contacts",
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
  onGoToDashboard,
  onGoToStudents,
  onGoToSchedule,
  onGoToAttendance,
  onGoToAssignments,
  onGoToReports,
  onGoToSettings,
  onGoToGroups,
  onClose,
}: SidebarProps) {
  const { t } = useTranslation();

  const nav = (action: () => void) => () => {
    action();
    onClose?.();
  };

  const navItems = [
    {
      id: "dashboard",
      label: t("sidebar.dashboard"),
      icon: <LayoutDashboard size={16} />,
      active: currentPage === "dashboard",
      onPress: nav(onGoToDashboard),
    },
    {
      id: "students",
      label: t("sidebar.students"),
      icon: <Users size={16} />,
      active: STUDENTS_PAGES.has(currentPage),
      onPress: nav(onGoToStudents),
    },
    {
      id: "schedule",
      label: t("sidebar.schedule"),
      icon: <CalendarDays size={16} />,
      active: currentPage === "schedule",
      onPress: nav(onGoToSchedule),
    },
    {
      id: "attendance",
      label: t("sidebar.attendance"),
      icon: <ClipboardCheck size={16} />,
      active: currentPage === "attendance",
      onPress: nav(onGoToAttendance),
    },
    {
      id: "assignments",
      label: t("sidebar.assignments"),
      icon: <BookOpen size={16} />,
      active:
        currentPage === "assignments" || currentPage === "assignment-detail",
      onPress: nav(onGoToAssignments),
    },
    {
      id: "reports",
      label: t("sidebar.reports"),
      icon: <FileText size={16} />,
      active: currentPage === "reports",
      onPress: nav(onGoToReports),
    },
  ];

  return (
    <aside className="bg-surface-secondary h-screen w-64 flex flex-col">
      <div
        data-tauri-drag-region
        className="h-12 shrink-0 bg-surface-secondary/80 backdrop-blur"
      />

      <div className="p-5 pb-4 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-accent">
            {currentGroup?.name ?? "Select Group"}
          </h1>
          <p className="text-xs text-muted">
            {formatMonthYear(currentGroup?.start_date ?? undefined)} -{" "}
            {formatMonthYear(currentGroup?.end_date ?? undefined)}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-1">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <Button
                variant={item.active ? "secondary" : "ghost"}
                fullWidth
                className="justify-start gap-2"
                isDisabled={!currentGroup}
                onPress={item.onPress}
              >
                {item.icon}
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-2 pb-3 border-t border-border/40 pt-2 flex flex-col gap-0.5">
        <Button
          variant="ghost"
          fullWidth
          className="justify-start gap-2"
          onPress={nav(onGoToGroups)}
        >
          <ArrowLeftRight size={16} />
          {t("sidebar.changeGroup")}
        </Button>
        <Button
          variant={currentPage === "settings" ? "secondary" : "ghost"}
          fullWidth
          className="justify-start gap-2"
          onPress={nav(onGoToSettings)}
        >
          <Settings size={16} />
          {t("sidebar.settings")}
        </Button>
      </div>
    </aside>
  );
}
