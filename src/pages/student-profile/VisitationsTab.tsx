import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "../../i18n/LanguageContext";
import type { Visitation } from "../../types/visitation";
import { LoadingSpinner, TableEmptyState } from "./shared";
import { formatVisitDate } from "./utils";

interface VisitationsTabProps {
  visitationSearch: string;
  onVisitationSearchChange: (value: string) => void;
  onOpenVisitation: () => void;
  loadingVisitations: boolean;
  visitations: Visitation[];
  filteredVisitations: Visitation[];
}

export function VisitationsTab({
  visitationSearch,
  onVisitationSearchChange,
  onOpenVisitation,
  loadingVisitations,
  visitations,
  filteredVisitations,
}: VisitationsTabProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="visitations" className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder={t("studentProfile.visitations.searchPlaceholder")}
          value={visitationSearch}
          onChange={(e) => onVisitationSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={onOpenVisitation}>
          {t("studentProfile.visitations.logVisitation")}
        </Button>
      </div>

      {loadingVisitations ? (
        <LoadingSpinner large />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("studentProfile.visitations.columns.notes")}</TableHead>
                  <TableHead>{t("studentProfile.visitations.columns.visitor")}</TableHead>
                  <TableHead>
                    {t("studentProfile.visitations.columns.relationship")}
                  </TableHead>
                  <TableHead>{t("studentProfile.visitations.columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitations.map((visitation) => (
                  <TableRow key={visitation.id}>
                    <TableCell className="text-sm text-foreground/50">
                      {visitation.notes || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {visitation.contact_name}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/50">
                      {visitation.contact_relationship || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground/50">
                      {formatVisitDate(visitation.visited_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredVisitations.length === 0 ? (
              <TableEmptyState
                title={
                  visitations.length === 0
                    ? t("studentProfile.visitations.noVisitations")
                    : t("studentProfile.visitations.noResults")
                }
                hint={
                  visitations.length === 0
                    ? t("studentProfile.visitations.noVisitationsHint")
                    : t("studentProfile.visitations.noResultsHint", {
                        search: visitationSearch,
                      })
                }
              />
            ) : null}
          </div>
        </div>
      )}
    </TabsContent>
  );
}
