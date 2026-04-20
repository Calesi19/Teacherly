import { Select, ListBox } from "@heroui/react";

type ThemePreference = "light" | "dark" | "system";

interface SettingsPageProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export function SettingsPage({ theme, onThemeChange }: SettingsPageProps) {
  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted mt-0.5">App preferences and configuration</p>
      </div>

      <div className="max-w-md flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Appearance</label>
          <Select
            aria-label="Theme"
            selectedKey={theme}
            onSelectionChange={(key) => onThemeChange(String(key) as ThemePreference)}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="light">Light</ListBox.Item>
                <ListBox.Item id="dark">Dark</ListBox.Item>
                <ListBox.Item id="system">System</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    </div>
  );
}
