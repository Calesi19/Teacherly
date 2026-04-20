import { Settings } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted mt-0.5">App preferences and configuration</p>
      </div>
      <div className="flex flex-col items-center justify-center flex-1 text-center gap-3">
        <Settings size={40} className="text-foreground/20" />
        <p className="text-lg font-semibold text-muted">Nothing here yet</p>
        <p className="text-sm text-foreground/40">Settings will appear here in a future update.</p>
      </div>
    </div>
  );
}
