import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <BreadcrumbRoot className="text-sm mb-6">
      <BreadcrumbList>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <BreadcrumbItem>
              {item.onClick ? (
                <BreadcrumbLink
                  onClick={item.onClick}
                  className="cursor-pointer"
                >
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-muted">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {i < items.length - 1 && <BreadcrumbSeparator />}
          </span>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
