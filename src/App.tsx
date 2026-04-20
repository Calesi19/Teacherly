import { useState, useCallback, useEffect } from "react";
import "./App.css";
import { Button, Drawer, useOverlayState } from "@heroui/react";

type ThemePreference = "light" | "dark" | "system";
const THEME_KEY = "heroui-theme";

type ColorTheme = "default" | "ocean" | "forest" | "sunset" | "rose";
const COLOR_THEME_KEY = "tizara-color-theme";

function useAppColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const s = localStorage.getItem(COLOR_THEME_KEY);
    if (s === "ocean" || s === "forest" || s === "sunset" || s === "rose") return s;
    return "default";
  });

  const applyColorTheme = useCallback((t: ColorTheme) => {
    if (t === "default") {
      document.documentElement.removeAttribute("data-color-theme");
    } else {
      document.documentElement.setAttribute("data-color-theme", t);
    }
  }, []);

  const setColorTheme = useCallback((t: ColorTheme) => {
    localStorage.setItem(COLOR_THEME_KEY, t);
    setColorThemeState(t);
    applyColorTheme(t);
  }, [applyColorTheme]);

  useEffect(() => { applyColorTheme(colorTheme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { colorTheme, setColorTheme };
}

function useAppTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark" || s === "system") return s;
    return "system";
  });

  const apply = useCallback((pref: ThemePreference) => {
    const resolved = pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : pref;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
  }, []);

  const setTheme = useCallback((pref: ThemePreference) => {
    localStorage.setItem(THEME_KEY, pref);
    setThemeState(pref);
    apply(pref);
  }, [apply]);

  useEffect(() => { apply(theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme, apply]);

  return { theme, setTheme };
}
import { Sidebar } from "./components/Sidebar";
import { GroupsPage } from "./pages/GroupsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { ContactsPage } from "./pages/ContactsPage";
import { VisitationsPage } from "./pages/VisitationsPage";
import { NotesPage } from "./pages/NotesPage";
import { SchedulePage } from "./pages/SchedulePage";
import { AttendancePage } from "./pages/AttendancePage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { AssignmentDetailPage } from "./pages/AssignmentDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import type { Group } from "./types/group";
import type { Student } from "./types/student";
import type { Assignment } from "./types/assignment";

type Route =
  | { page: "groups" }
  | { page: "students"; group: Group }
  | { page: "student-profile"; group: Group; student: Student }
  | { page: "contacts"; group: Group; student: Student }
  | { page: "visitations"; group: Group; student: Student }
  | { page: "notes"; group: Group; student: Student }
  | { page: "schedule"; group: Group }
  | { page: "attendance"; group: Group }
  | { page: "assignments"; group: Group }
  | { page: "assignment-detail"; group: Group; assignment: Assignment }
  | { page: "settings" };

function App() {
  const drawerState = useOverlayState();
  const { theme, setTheme } = useAppTheme();
  const { colorTheme, setColorTheme } = useAppColorTheme();
  const [route, setRoute] = useState<Route>({ page: "groups" });

  const goToGroups = () => setRoute({ page: "groups" });
  const goToStudents = (group: Group) => setRoute({ page: "students", group });
  const goToStudentProfile = (group: Group, student: Student) =>
    setRoute({ page: "student-profile", group, student });
  const goToContacts = (group: Group, student: Student) =>
    setRoute({ page: "contacts", group, student });
  const goToSchedule = (group: Group) => setRoute({ page: "schedule", group });
  const goToAttendance = (group: Group) => setRoute({ page: "attendance", group });
  const goToAssignments = (group: Group) => setRoute({ page: "assignments", group });
  const goToAssignmentDetail = (group: Group, assignment: Assignment) =>
    setRoute({ page: "assignment-detail", group, assignment });
  const goToSettings = () => setRoute({ page: "settings" });

  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);

  const handleSelectGroup = (group: Group) => {
    setCurrentGroup(group);
    switch (route.page) {
      case "schedule": return goToSchedule(group);
      case "attendance": return goToAttendance(group);
      case "assignments":
      case "assignment-detail": return goToAssignments(group);
      default: return goToStudents(group);
    }
  };

  const sidebarProps = {
    currentPage: route.page,
    currentGroup,
    onSelectGroup: handleSelectGroup,
    onGoToStudents: () => currentGroup && goToStudents(currentGroup),
    onGoToSchedule: () => currentGroup && goToSchedule(currentGroup),
    onGoToAttendance: () => currentGroup && goToAttendance(currentGroup),
    onGoToAssignments: () => currentGroup && goToAssignments(currentGroup),
    onGoToSettings: goToSettings,
  };

  function renderPage() {
    switch (route.page) {
      case "groups":
        return <GroupsPage currentGroup={currentGroup} onSelectGroup={(c) => { setCurrentGroup(c); goToStudents(c); }} />;
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
          />
        );
      case "notes":
        return (
          <NotesPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() => goToStudentProfile(route.group, route.student)}
          />
        );
      case "contacts":
        return (
          <ContactsPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() => goToStudentProfile(route.group, route.student)}
          />
        );
      case "visitations":
        return (
          <VisitationsPage
            student={route.student}
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToStudentProfile={() => goToStudentProfile(route.group, route.student)}
          />
        );
      case "schedule":
        return (
          <SchedulePage
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
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
          />
        );
      case "settings":
        return <SettingsPage theme={theme} onThemeChange={setTheme} colorTheme={colorTheme} onColorThemeChange={setColorTheme} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Drawer state={drawerState}>
        <Drawer.Backdrop isDismissable>
          <Drawer.Content placement="left">
            <Drawer.Dialog aria-label="Navigation">
              <Drawer.Body className="p-0">
                <Sidebar {...sidebarProps} onClose={drawerState.close} />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <div className="hidden lg:flex">
        <Sidebar {...sidebarProps} />
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 bg-background border-b border-border shadow-sm">
          <Button variant="ghost" isIconOnly size="sm" onPress={drawerState.open} aria-label="Open menu">
            ☰
          </Button>
          <span className="text-lg font-bold">Tizara</span>
        </div>
        <main className="flex-1 bg-background-secondary flex flex-col overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
