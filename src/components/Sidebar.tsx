import { Button, Select, ListBox, Spinner } from "@heroui/react";
import { Users, CalendarDays, ClipboardCheck, Settings } from "lucide-react";
import { useClassrooms } from "../hooks/useClassrooms";
import type { Classroom } from "../types/classroom";

interface SidebarProps {
  currentPage: string;
  currentClassroom: Classroom | null;
  onSelectClassroom: (classroom: Classroom) => void;
  onGoToStudents: () => void;
  onGoToSchedule: () => void;
  onGoToAttendance: () => void;
  onGoToSettings: () => void;
  onClose?: () => void;
}

const STUDENTS_PAGES = new Set(["students", "student-profile", "family-members", "notes"]);

export function Sidebar({
  currentPage,
  currentClassroom,
  onSelectClassroom,
  onGoToStudents,
  onGoToSchedule,
  onGoToAttendance,
  onGoToSettings,
  onClose,
}: SidebarProps) {
  const { classrooms, loading } = useClassrooms();

  const nav = (action: () => void) => () => {
    action();
    onClose?.();
  };

  const navItems = [
    {
      id: "students",
      label: "Students",
      icon: <Users size={16} />,
      active: STUDENTS_PAGES.has(currentPage),
      onPress: nav(onGoToStudents),
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: <CalendarDays size={16} />,
      active: currentPage === "schedule",
      onPress: nav(onGoToSchedule),
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: <ClipboardCheck size={16} />,
      active: currentPage === "attendance",
      onPress: nav(onGoToAttendance),
    },
  ];

  return (
    <aside className="bg-surface-secondary h-screen w-64 flex flex-col">
      <div className="p-5 pb-4">
        <h1 className="text-xl font-bold text-accent">Tizara</h1>
        <p className="text-xs text-muted mt-0.5">Classroom Manager</p>
      </div>

      <div className="px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center h-9">
            <Spinner size="sm" />
          </div>
        ) : classrooms.length === 0 ? (
          <p className="text-xs text-foreground/40 px-2 py-2">No classrooms yet.</p>
        ) : (
          <Select
            aria-label="Select classroom"
            selectedKey={currentClassroom ? String(currentClassroom.id) : null}
            onSelectionChange={(key) => {
              const classroom = classrooms.find((c) => String(c.id) === String(key));
              if (classroom) onSelectClassroom(classroom);
            }}
          >
            <Select.Trigger className="w-full">
              <Select.Value>
                {({ isPlaceholder }) =>
                  isPlaceholder ? (
                    <span className="text-foreground/40">Select classroom…</span>
                  ) : (
                    <span className="font-medium truncate">{currentClassroom?.name}</span>
                  )
                }
              </Select.Value>
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {classrooms.map((c) => (
                  <ListBox.Item key={c.id} id={String(c.id)} textValue={c.name}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{c.name}</span>
                      {(c.subject || c.grade) && (
                        <span className="text-xs text-foreground/50">
                          {[c.subject, c.grade].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>

      <nav className="flex-1 px-2 py-1">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <Button
                variant={item.active ? "secondary" : "ghost"}
                fullWidth
                className="justify-start gap-2"
                isDisabled={!currentClassroom}
                onPress={item.onPress}
              >
                {item.icon}
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-2 pb-3 border-t border-border/40 pt-2">
        <Button
          variant={currentPage === "settings" ? "secondary" : "ghost"}
          fullWidth
          className="justify-start gap-2"
          onPress={nav(onGoToSettings)}
        >
          <Settings size={16} />
          Settings
        </Button>
      </div>
    </aside>
  );
}
