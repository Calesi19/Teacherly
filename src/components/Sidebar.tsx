import { Button, Select, ListBox, Spinner, Label } from "@heroui/react";
import { Users, CalendarDays, ClipboardCheck, BookOpen, Settings } from "lucide-react";
import { useGroups } from "../hooks/useGroups";
import type { Group } from "../types/group";

interface SidebarProps {
  currentPage: string;
  currentGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  onGoToStudents: () => void;
  onGoToSchedule: () => void;
  onGoToAttendance: () => void;
  onGoToAssignments: () => void;
  onGoToSettings: () => void;
  onClose?: () => void;
}

const STUDENTS_PAGES = new Set([
  "students",
  "student-profile",
  "contacts",
  "visitations",
  "notes",
]);

export function Sidebar({
  currentPage,
  currentGroup,
  onSelectGroup,
  onGoToStudents,
  onGoToSchedule,
  onGoToAttendance,
  onGoToAssignments,
  onGoToSettings,
  onClose,
}: SidebarProps) {
  const { groups, loading } = useGroups();

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
    {
      id: "assignments",
      label: "Assignments",
      icon: <BookOpen size={16} />,
      active: currentPage === "assignments" || currentPage === "assignment-detail",
      onPress: nav(onGoToAssignments),
    },
  ];

  return (
    <aside className="bg-surface-secondary h-screen w-64 flex flex-col">
      <div className="p-5 pb-4 flex items-center gap-3">
        <img src="/icon-light.webp" alt="Tizara" className="w-9 h-9 rounded-xl shrink-0 dark:hidden" />
        <img src="/icon-dark.webp" alt="Tizara" className="w-9 h-9 rounded-xl shrink-0 hidden dark:block" />
        <div>
          <h1 className="text-xl font-bold text-accent">Tizara</h1>
          <p className="text-xs text-muted">Teacher's Helper</p>
        </div>
      </div>

      <div className="px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center h-9">
            <Spinner size="sm" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-foreground/40 px-2 py-2">No groups yet.</p>
        ) : (
          <>
          <Label id="group-select-label" className="text-xs font-semibold text-foreground/50 uppercase tracking-wide px-1 mb-1">Group</Label>
          <Select
            aria-label="Select group"
            selectedKey={currentGroup ? String(currentGroup.id) : null}
            onSelectionChange={(key) => {
              const group = groups.find((c) => String(c.id) === String(key));
              if (group) onSelectGroup(group);
            }}
          >
            <Select.Trigger className="w-full">
              <Select.Value>
                {({ isPlaceholder }) =>
                  isPlaceholder ? (
                    <span className="text-foreground/40">Select group…</span>
                  ) : (
                    <span className="font-medium truncate">
                      {currentGroup?.name}
                    </span>
                  )
                }
              </Select.Value>
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {groups.map((c) => (
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
          </>
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
