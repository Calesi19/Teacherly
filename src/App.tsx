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
    if (s === "ocean" || s === "forest" || s === "sunset" || s === "rose")
      return s;
    return "default";
  });

  const applyColorTheme = useCallback((t: ColorTheme) => {
    if (t === "default") {
      document.documentElement.removeAttribute("data-color-theme");
    } else {
      document.documentElement.setAttribute("data-color-theme", t);
    }
  }, []);

  const setColorTheme = useCallback(
    (t: ColorTheme) => {
      localStorage.setItem(COLOR_THEME_KEY, t);
      setColorThemeState(t);
      applyColorTheme(t);
    },
    [applyColorTheme],
  );

  useEffect(() => {
    applyColorTheme(colorTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { colorTheme, setColorTheme };
}

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

  useEffect(() => {
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
import { LanguageProvider } from "./i18n/LanguageContext";
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
import { DashboardPage } from "./pages/DashboardPage";
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
  | { page: "dashboard"; group: Group }
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
  | { page: "settings" };

function App() {
  const drawerState = useOverlayState();
  const { theme, setTheme } = useAppTheme();
  const { colorTheme, setColorTheme } = useAppColorTheme();
  const [route, setRoute] = useState<Route>({ page: "groups" });

  const goToGroups = () => setRoute({ page: "groups" });
  const goToDashboard = (group: Group) =>
    setRoute({ page: "dashboard", group });
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
  const goToSettings = () => setRoute({ page: "settings" });

  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);

  const handleSelectGroup = (group: Group) => {
    setCurrentGroup(group);
    switch (route.page) {
      case "dashboard":
        return goToDashboard(group);
      case "schedule":
        return goToSchedule(group);
      case "attendance":
        return goToAttendance(group);
      case "assignments":
      case "assignment-detail":
        return goToAssignments(group);
      default:
        return goToStudents(group);
    }
  };

  const sidebarProps = {
    currentPage: route.page,
    currentGroup,
    onSelectGroup: handleSelectGroup,
    onGoToDashboard: () => currentGroup && goToDashboard(currentGroup),
    onGoToStudents: () => currentGroup && goToStudents(currentGroup),
    onGoToSchedule: () => currentGroup && goToSchedule(currentGroup),
    onGoToAttendance: () => currentGroup && goToAttendance(currentGroup),
    onGoToAssignments: () => currentGroup && goToAssignments(currentGroup),
    onGoToSettings: goToSettings,
  };

  function renderPage() {
    switch (route.page) {
      case "groups":
        return (
          <GroupsPage
            currentGroup={currentGroup}
            onSelectGroup={(c) => {
              setCurrentGroup(c);
              goToDashboard(c);
            }}
          />
        );
      case "dashboard":
        return (
          <DashboardPage
            group={route.group}
            onGoToGroups={goToGroups}
            onGoToStudents={() => goToStudents(route.group)}
            onGoToSchedule={() => goToSchedule(route.group)}
            onGoToAttendance={() => goToAttendance(route.group)}
            onGoToAssignments={() => goToAssignments(route.group)}
          />
        );
      case "students":
        return (
          <StudentsPage
            group={route.group}
            onGoToDashboard={() => goToDashboard(route.group)}
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
            onGoToDashboard={() => goToDashboard(route.group)}
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
        return (
          <SettingsPage
            theme={theme}
            onThemeChange={setTheme}
            colorTheme={colorTheme}
            onColorThemeChange={setColorTheme}
          />
        );
    }
  }

  return (
    <LanguageProvider>
      <div className="app-container">
        <div
          data-tauri-drag-region
          className="fixed top-0 left-0 right-0 h-7 z-50"
        />

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
              <Button
                variant="ghost"
                isIconOnly
                size="sm"
                onPress={drawerState.open}
                aria-label="Open menu"
              >
                ☰
              </Button>
              <span className="text-lg font-bold">Tizara</span>
            </div>
            <main className="flex-1 bg-background-secondary flex flex-col overflow-y-auto">
              {renderPage()}
            </main>
          </div>
        </div>
      </div>
    </LanguageProvider>
  );
}

export default App;
