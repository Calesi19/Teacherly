import { useState } from "react";
import "./App.css";
import { Button, Drawer, useOverlayState } from "@heroui/react";
import { Sidebar } from "./components/Sidebar";
import { ClassroomsPage } from "./pages/ClassroomsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { FamilyMembersPage } from "./pages/FamilyMembersPage";
import { NotesPage } from "./pages/NotesPage";
import { SchedulePage } from "./pages/SchedulePage";
import { AttendancePage } from "./pages/AttendancePage";
import { SettingsPage } from "./pages/SettingsPage";
import type { Classroom } from "./types/classroom";
import type { Student } from "./types/student";

type Route =
  | { page: "classrooms" }
  | { page: "students"; classroom: Classroom }
  | { page: "student-profile"; classroom: Classroom; student: Student }
  | { page: "family-members"; classroom: Classroom; student: Student }
  | { page: "notes"; classroom: Classroom; student: Student }
  | { page: "schedule"; classroom: Classroom }
  | { page: "attendance"; classroom: Classroom }
  | { page: "settings" };

function App() {
  const drawerState = useOverlayState();
  const [route, setRoute] = useState<Route>({ page: "classrooms" });

  const goToClassrooms = () => setRoute({ page: "classrooms" });
  const goToStudents = (classroom: Classroom) => setRoute({ page: "students", classroom });
  const goToStudentProfile = (classroom: Classroom, student: Student) =>
    setRoute({ page: "student-profile", classroom, student });
  const goToFamilyMembers = (classroom: Classroom, student: Student) =>
    setRoute({ page: "family-members", classroom, student });
  const goToNotes = (classroom: Classroom, student: Student) =>
    setRoute({ page: "notes", classroom, student });
  const goToSchedule = (classroom: Classroom) => setRoute({ page: "schedule", classroom });
  const goToAttendance = (classroom: Classroom) => setRoute({ page: "attendance", classroom });
  const goToSettings = () => setRoute({ page: "settings" });

  const currentClassroom: Classroom | null =
    route.page !== "classrooms" && route.page !== "settings" ? route.classroom : null;

  const handleSelectClassroom = (classroom: Classroom) => {
    switch (route.page) {
      case "schedule": return goToSchedule(classroom);
      case "attendance": return goToAttendance(classroom);
      default: return goToStudents(classroom);
    }
  };

  const sidebarProps = {
    currentPage: route.page,
    currentClassroom,
    onSelectClassroom: handleSelectClassroom,
    onGoToStudents: () => currentClassroom && goToStudents(currentClassroom),
    onGoToSchedule: () => currentClassroom && goToSchedule(currentClassroom),
    onGoToAttendance: () => currentClassroom && goToAttendance(currentClassroom),
    onGoToSettings: goToSettings,
  };

  function renderPage() {
    switch (route.page) {
      case "classrooms":
        return <ClassroomsPage onSelectClassroom={(c) => goToStudents(c)} />;
      case "students":
        return (
          <StudentsPage
            classroom={route.classroom}
            onGoToClassrooms={goToClassrooms}
            onSelectStudent={(s) => goToStudentProfile(route.classroom, s)}
          />
        );
      case "student-profile":
        return (
          <StudentProfilePage
            student={route.student}
            classroom={route.classroom}
            onGoToClassrooms={goToClassrooms}
            onGoToStudents={() => goToStudents(route.classroom)}
            onGoToFamilyMembers={() => goToFamilyMembers(route.classroom, route.student)}
            onGoToNotes={() => goToNotes(route.classroom, route.student)}
          />
        );
      case "notes":
        return (
          <NotesPage
            student={route.student}
            classroom={route.classroom}
            onGoToClassrooms={goToClassrooms}
            onGoToStudents={() => goToStudents(route.classroom)}
            onGoToStudentProfile={() => goToStudentProfile(route.classroom, route.student)}
          />
        );
      case "family-members":
        return (
          <FamilyMembersPage
            student={route.student}
            classroom={route.classroom}
            onGoToClassrooms={goToClassrooms}
            onGoToStudents={() => goToStudents(route.classroom)}
            onGoToStudentProfile={() => goToStudentProfile(route.classroom, route.student)}
          />
        );
      case "schedule":
        return (
          <SchedulePage
            classroom={route.classroom}
            onGoToClassrooms={goToClassrooms}
            onGoToStudents={() => goToStudents(route.classroom)}
            onGoToAttendance={() => goToAttendance(route.classroom)}
          />
        );
      case "attendance":
        return (
          <AttendancePage
            classroom={route.classroom}
            onGoToClassrooms={goToClassrooms}
            onGoToStudents={() => goToStudents(route.classroom)}
            onGoToSchedule={() => goToSchedule(route.classroom)}
          />
        );
      case "settings":
        return <SettingsPage />;
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
