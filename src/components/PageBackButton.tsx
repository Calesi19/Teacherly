import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageBackButtonProps {
  label: string;
  onClick: () => void;
}

export function PageBackButton({ label, onClick }: PageBackButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={onClick}
      aria-label={label}
      className="shrink-0"
    >
      <ChevronLeft size={16} />
    </Button>
  );
}
