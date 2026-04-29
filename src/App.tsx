import {
  Suspense,
  lazy,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import "./App.css";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { invoke } from "@tauri-apps/api/core";
import { useGroups } from "./hooks/useGroups";
import { useStudents } from "./hooks/useStudents";
import { useAssignments } from "./hooks/useAssignments";
import { LanguageProvider } from "./i18n/LanguageContext";
import { useTranslation } from "./i18n/LanguageContext";
import { WindowBar } from "./components/AppWindowBar";
import {
  CommandPalette,
  type CommandPaletteItem,
} from "./components/CommandPalette";
import { Sidebar } from "./components/Sidebar";
import { GroupsPage } from "./pages/GroupsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { ContactsPage } from "./pages/ContactsPage";
import { AddressesPage } from "./pages/AddressesPage";
import { StudentInfoPage } from "./pages/StudentInfoPage";
import { ServicesPage } from "./pages/ServicesPage";
import { AccommodationsPage } from "./pages/AccommodationsPage";
import { ObservationsPage } from "./pages/ObservationsPage";
import { VisitationsPage } from "./pages/VisitationsPage";
import { NotesPage } from "./pages/NotesPage";
import { SchedulePage } from "./pages/SchedulePage";
import { AttendancePage } from "./pages/AttendancePage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { AssignmentDetailPage } from "./pages/AssignmentDetailPage";
import { ConfirmModal } from "./components/ConfirmModal";
import { SettingsPage } from "./pages/SettingsPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import type { Group } from "./types/group";
import type { Student } from "./types/student";
import type { Assignment } from "./types/assignment";
import {
  RECENT_COMMANDS_KEY,
  APP_NAME,
  LAST_GROUP_KEY,
  migrateLegacyAppStorage,
} from "./appConfig";
import {
  ArrowLeftRight,
  BookOpen,
  ClipboardCheck,
  FileText,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";

const ReportsPage = lazy(() =>
  import("./pages/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);

type ThemePreference = "light" | "dark" | "system";
const THEME_KEY = "app-theme";

migrateLegacyAppStorage();

function useAppTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark" || s === "system") return s;
    return "system";
  });

  const apply = useCallback((pref: ThemePreference) => {
    const resolved =
      pref === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : pref;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  const setTheme = useCallback(
    (pref: ThemePreference) => {
      localStorage.setItem(THEME_KEY, pref);
      setThemeState(pref);
      apply(pref);
    },
    [apply],
  );

  useLayoutEffect(() => {
    apply(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme, apply]);

  return { theme, setTheme };
}

type Route =
  | { page: "groups" }
  | { page: "students"; group: Group }
  | { page: "student-profile"; group: Group; student: Student }
  | { page: "student-info"; group: Group; student: Student }
  | { page: "contacts"; group: Group; student: Student }
  | { page: "addresses"; group: Group; student: Student }
  | { page: "student-services"; group: Group; student: Student }
  | { page: "student-accommodations"; group: Group; student: Student }
  | { page: "student-observations"; group: Group; student: Student }
  | { page: "visitations"; group: Group; student: Student }
  | { page: "notes"; group: Group; student: Student }
  | { page: "schedule"; group: Group }
  | { page: "attendance"; group: Group }
  | { page: "assignments"; group: Group }
  | { page: "assignment-detail"; group: Group; assignment: Assignment }
  | { page: "reports"; group: Group }
  | { page: "settings"; group: Group | null }
  | { page: "terms-of-service" }
  | { page: "privacy-policy" };

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const { theme, setTheme } = useAppTheme();
  const [route, setRoute] = useState<Route>({ page: "groups" });
  const [assignmentDetailDirty, setAssignmentDetailDirty] = useState(false);
  const [pendingSidebarNav, setPendingSidebarNav] = useState<(() => void) | null>(null);
  const { groups, loading: groupsLoading, error: groupsError, addGroup } = useGroups();

  const goToGroups = () => setRoute({ page: "groups" });
  const changeGroup = () => {
    localStorage.removeItem(LAST_GROUP_KEY);
    setCurrentGroup(null);
    setRoute({ page: "groups" });
  };
  const goToStudents = (group: Group) => setRoute({ page: "students", group });
  const goToStudentProfile = (group: Group, student: Student) =>
    setRoute({ page: "student-profile", group, student });
  const goToStudentInfoPage = (group: Group, student: Student) =>
    setRoute({ page: "student-info", group, student });
  const goToContacts = (group: Group, student: Student) =>
    setRoute({ page: "contacts", group, student });
  const goToAddresses = (group: Group, student: Student) =>
    setRoute({ page: "addresses", group, student });
  const goToStudentServices = (group: Group, student: Student) =>
    setRoute({ page: "student-services", group, student });
  const goToStudentAccommodations = (group: Group, student: Student) =>
    setRoute({ page: "student-accommodations", group, student });
  const goToStudentObservations = (group: Group, student: Student) =>
    setRoute({ page: "student-observations", group, student });
  const goToSchedule = (group: Group) => setRoute({ page: "schedule", group });
  const goToAttendance = (group: Group) =>
    setRoute({ page: "attendance", group });
  const goToAssignments = (group: Group) =>
    setRoute({ page: "assignments", group });
  const goToAssignmentDetail = (group: Group, assignment: Assignment) =>
    setRoute({ page: "assignment-detail", group, assignment });
  const goToReports = (group: Group) => setRoute({ page: "reports", group });
  const goToSettings = (group: Group | null = null) => setRoute({ page: "settings", group });
  const goToTermsOfService = () => setRoute({ page: "terms-of-service" });
  const goToPrivacyPolicy = () => setRoute({ page: "privacy-policy" });

  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [isPaletteOpen, setPaletteOpen] = useState(false);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  });
  const restoredRef = useRef(false);
  const startupWindowsReadyRef = useRef(false);
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  const { students: paletteStudents } = useStudents(currentGroup?.id ?? null, {
    enabled: currentGroup !== null,
  });
  const { assignments: paletteAssignments } = useAssignments(
    currentGroup?.id ?? null,
    {
      enabled: currentGroup !== null,
    },
  );

  useEffect(() => {
    if (groupsLoading || restoredRef.current) return;
    restoredRef.current = true;
    const savedId = localStorage.getItem(LAST_GROUP_KEY);
    if (!savedId) return;
    const group = groups.find((g) => g.id === Number(savedId));
    if (group) {
      setCurrentGroup(group);
      setRoute({ page: "students", group });
    }
  }, [groupsLoading, groups]);

  useEffect(() => {
    if (startupWindowsReadyRef.current) return;

    startupWindowsReadyRef.current = true;

    void (async () => {
      try {
        await invoke("set_complete", { task: "frontend" });
      } catch (error) {
        console.error("Failed to mark frontend startup as complete", error);
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(recentCommandIds));
  }, [recentCommandIds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectGroup = (group: Group) => {
    localStorage.setItem(LAST_GROUP_KEY, String(group.id));
    setCurrentGroup(group);
    switch (route.page) {
      case "attendance":
        return goToAttendance(group);
      case "assignments":
      case "assignment-detail":
        return goToAssignments(group);
      default:
        return goToStudents(group);
    }
  };

  const guardSidebarNav = (callback: () => void) => {
    if (route.page === "assignment-detail" && assignmentDetailDirty) {
      setPendingSidebarNav(() => callback);
    } else {
      callback();
    }
  };

  const sidebarProps = {
    currentPage:
      route.page === "terms-of-service" || route.page === "privacy-policy"
        ? "settings"
        : route.page,
    currentGroup,
    onSelectGroup: handleSelectGroup,
    onGoToStudents: () => guardSidebarNav(() => currentGroup && goToStudents(currentGroup)),
    onGoToAttendance: () => guardSidebarNav(() => currentGroup && goToAttendance(currentGroup)),
    onGoToAssignments: () => guardSidebarNav(() => currentGroup && goToAssignments(currentGroup)),
    onGoToReports: () => guardSidebarNav(() => currentGroup && goToReports(currentGroup)),
    onGoToSettings: () => guardSidebarNav(() => goToSettings(currentGroup)),
    onGoToGroups: () => guardSidebarNav(changeGroup),
  };

  const commandItems = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [
      {
        id: "page:groups",
        title: currentGroup
          ? t("commandPalette.items.changeGroup")
          : t("groups.breadcrumb"),
        subtitle: currentGroup?.name ?? t("commandPalette.items.selectAGroup"),
        keywords: ["groups", "classes", "switch class", "change group"],
        category: "pages",
        icon: <ArrowLeftRight size={18} />,
        perform: currentGroup ? changeGroup : goToGroups,
      },
      {
        id: "page:settings",
        title: t("sidebar.settings"),
        subtitle: t("settings.description"),
        keywords: ["preferences", "configuration"],
        category: "pages",
        icon: <Settings size={18} />,
        perform: () => goToSettings(currentGroup),
      },
      {
        id: "action:toggle-dark-mode",
        title: t("commandPalette.items.toggleDarkMode"),
        subtitle:
          resolvedTheme === "dark"
            ? t("commandPalette.items.switchToLightMode")
            : t("commandPalette.items.switchToDarkMode"),
        keywords: ["theme", "appearance", "dark mode", "light mode"],
        category: "actions",
        icon: resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />,
        perform: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
      {
        id: "action:use-light-mode",
        title: t("commandPalette.items.useLightMode"),
        subtitle: t("settings.appearance"),
        keywords: ["theme", "appearance", "light"],
        category: "actions",
        icon: <Sun size={18} />,
        perform: () => setTheme("light"),
      },
      {
        id: "action:use-system-theme",
        title: t("commandPalette.items.useSystemTheme"),
        subtitle: t("settings.appearance"),
        keywords: ["theme", "appearance", "system"],
        category: "actions",
        icon: <Monitor size={18} />,
        perform: () => setTheme("system"),
      },
    ];

    if (!currentGroup) return items;

    items.unshift(
      {
        id: "page:students",
        title: t("sidebar.students"),
        subtitle: t("commandPalette.items.studentRoster"),
        keywords: ["student roster", "roster", "students"],
        category: "pages",
        icon: <Users size={18} />,
        perform: () => goToStudents(currentGroup),
      },
      {
        id: "page:attendance",
        title: t("sidebar.attendance"),
        subtitle: t("attendance.title"),
        keywords: ["roll call", "attendance records"],
        category: "pages",
        icon: <ClipboardCheck size={18} />,
        perform: () => goToAttendance(currentGroup),
      },
      {
        id: "page:assignments",
        title: t("sidebar.assignments"),
        subtitle: t("commandPalette.items.lessonPlansAlias"),
        keywords: ["lesson plans", "lesson plan", "gradebook", "assignments"],
        category: "pages",
        icon: <BookOpen size={18} />,
        perform: () => goToAssignments(currentGroup),
      },
      {
        id: "page:reports",
        title: t("sidebar.reports"),
        subtitle: currentGroup.name,
        keywords: ["exports", "documents"],
        category: "pages",
        icon: <FileText size={18} />,
        perform: () => goToReports(currentGroup),
      },
    );

    items.push(
      ...paletteStudents.map((student) => ({
        id: `student:${currentGroup.id}:${student.id}`,
        title: student.name,
        subtitle: student.student_number
          ? `${t("studentProfile.overview.studentId")}: ${student.student_number}`
          : currentGroup.name,
        keywords: [
          "student",
          "profile",
          "roster",
          student.student_number ?? "",
        ],
        category: "students" as const,
        icon: <User size={18} />,
        perform: () => goToStudentProfile(currentGroup, student),
      })),
      ...paletteAssignments.map((assignment) => ({
        id: `assignment:${currentGroup.id}:${assignment.id}`,
        title: assignment.title,
        subtitle: assignment.period_name
          ? `${assignment.period_name} • ${currentGroup.name}`
          : currentGroup.name,
        keywords: [
          "assignment",
          "lesson plan",
          "gradebook",
          assignment.period_name,
        ],
        category: "assignments" as const,
        icon: <BookOpen size={18} />,
        perform: () => goToAssignmentDetail(currentGroup, assignment),
      })),
    );

    return items;
  }, [
    changeGroup,
    currentGroup,
    goToAssignmentDetail,
    goToAssignments,
    goToAttendance,
    goToGroups,
    goToReports,
    goToSchedule,
    goToSettings,
    goToStudentProfile,
    goToStudents,
    paletteAssignments,
    paletteStudents,
    resolvedTheme,
    setTheme,
    t,
  ]);

  const recentCommands = useMemo(() => {
    const byId = new Map(commandItems.map((item) => [item.id, item]));
    return recentCommandIds
      .map((id) => byId.get(id))
      .filter((item): item is CommandPaletteItem => item !== undefined);
  }, [commandItems, recentCommandIds]);

  const handleSelectCommand = useCallback((item: CommandPaletteItem) => {
    item.perform();
    setRecentCommandIds((previous) =>
      [item.id, ...previous.filter((id) => id !== item.id)].slice(0, 6),
    );
    setPaletteOpen(false);
  }, []);

  function renderPage() {
    switch (route.page) {
      case "groups":
        return (
          <GroupsPage
            currentGroup={currentGroup}
            groups={groups}
            loading={groupsLoading}
            error={groupsError}
            onAddGroup={addGroup}
            onSelectGroup={(c) => {
              setCurrentGroup(c);
              goToStudents(c);
            }}
            onGoToSettings={goToSettings}
          />
        );
      case "students":
        return (
          <StudentsPage
            group={route.group}
            onGoToGroups={goToGroups}
            onSelectStudent={(s) => goToStudentProfile(route.group, s)}
          />
        );
      case "student-profile":
        return (
          <StudentProfilePage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToContacts={() => goToContacts(route.group, route.student)}
            onGoToAddresses={() => goToAddresses(route.group, route.student)}
            onGoToStudentInfo={() =>
              goToStudentInfoPage(route.group, route.student)
            }
            onGoToServices={() =>
              goToStudentServices(route.group, route.student)
            }
            onGoToAccommodations={() =>
              goToStudentAccommodations(route.group, route.student)
            }
            onGoToObservations={() =>
              goToStudentObservations(route.group, route.student)
            }
          />
        );
      case "notes":
        return (
          <NotesPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "contacts":
        return (
          <ContactsPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "addresses":
        return (
          <AddressesPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "student-info":
        return (
          <StudentInfoPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "student-services":
        return (
          <ServicesPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "student-accommodations":
        return (
          <AccommodationsPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "student-observations":
        return (
          <ObservationsPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "visitations":
        return (
          <VisitationsPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() =>
              goToStudentProfile(route.group, route.student)
            }
          />
        );
      case "schedule":
        return (
          <SchedulePage
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToSettings={() => goToSettings(route.group)}
          />
        );
      case "attendance":
        return (
          <AttendancePage
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToSchedule={() => goToSchedule(route.group)}
          />
        );
      case "assignments":
        return (
          <AssignmentsPage
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onSelectAssignment={(a) => goToAssignmentDetail(route.group, a)}
          />
        );
      case "assignment-detail":
        return (
          <AssignmentDetailPage
            assignment={route.assignment}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToAssignments={() => goToAssignments(route.group)}
            onDirtyChange={setAssignmentDetailDirty}
          />
        );
      case "reports":
        return (
          <Suspense
            fallback={
              <div className="flex min-h-full items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            }
          >
            <ReportsPage group={route.group} />
          </Suspense>
        );
      case "settings":
        return (
          <SettingsPage
            theme={theme}
            onThemeChange={setTheme}
            onGoToTermsOfService={goToTermsOfService}
            onGoToPrivacyPolicy={goToPrivacyPolicy}
            group={route.group}
            onGoToSchedule={route.group ? () => goToSchedule(route.group!) : undefined}
            onGoToGroups={changeGroup}
          />
        );
      case "terms-of-service":
        return <TermsOfServicePage onGoToSettings={goToSettings} />;
      case "privacy-policy":
        return <PrivacyPolicyPage onGoToSettings={goToSettings} />;
    }
  }

  const showSidebar =
    route.page !== "groups" &&
    !(route.page === "settings" && route.group === null);
  const showWindowsBar = navigator.userAgent.toLowerCase().includes("windows");

  return (
    <div className="app-container">
      {showWindowsBar ? (
        <WindowBar />
      ) : (
        <div
          data-tauri-drag-region
          className="fixed top-0 left-0 right-0 h-7 z-50"
        />
      )}

      <div className="flex h-screen overflow-hidden">
        {showSidebar && (
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar {...sidebarProps} onClose={() => setDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        {showSidebar && (
          <div className="hidden lg:flex">
            <Sidebar {...sidebarProps} />
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {showSidebar && (
            <div className="lg:hidden flex items-center gap-2 px-4 py-3 bg-background border-b border-border shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                ☰
              </Button>
              <span className="text-lg font-bold">{APP_NAME}</span>
            </div>
          )}
          <main className="flex-1 bg-background flex flex-col overflow-y-auto">
            {renderPage()}
          </main>
        </div>
      </div>

      <ConfirmModal
        isOpen={pendingSidebarNav !== null}
        onClose={() => setPendingSidebarNav(null)}
        onConfirm={() => {
          pendingSidebarNav?.();
          setPendingSidebarNav(null);
          setAssignmentDetailDirty(false);
        }}
        title={t("assignmentDetail.leaveModalTitle")}
        description={t("assignmentDetail.leaveModalDescription")}
        confirmLabel={t("assignmentDetail.leaveModalConfirm")}
      />

      <CommandPalette
        isOpen={isPaletteOpen}
        items={commandItems}
        recentItems={recentCommands}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleSelectCommand}
      />
    </div>
  );
}

export default App;
