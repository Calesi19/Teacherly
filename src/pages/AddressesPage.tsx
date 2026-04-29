import { useState, useCallback } from "react";
import { Inbox, Pencil, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAddresses } from "../hooks/useAddresses";
import { ConfirmModal } from "../components/ConfirmModal";
import { Breadcrumb } from "../components/Breadcrumb";
import { PageBackButton } from "../components/PageBackButton";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { Address, NewAddressInput } from "../types/address";

interface AddressesPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

const emptyForm: NewAddressInput = {
  label: "",
  street: "",
  city: "",
  state: "",
  zip_code: "",
  country: "",
  is_student_home: false,
};

function formatAddress(address: Address): string {
  return [address.street, address.city, address.state, address.zip_code, address.country]
    .filter(Boolean)
    .join(", ");
}

function AddressFormFields({
  form,
  onChange,
  t,
  prefix,
}: {
  form: NewAddressInput;
  onChange: (form: NewAddressInput) => void;
  t: (key: string) => string;
  prefix: string;
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-label`}>{t("addresses.fields.label")}</Label>
        <Input
          id={`${prefix}-label`}
          value={form.label}
          onChange={(e) => onChange({ ...form, label: e.target.value })}
          placeholder={t("addresses.fields.labelPlaceholder")}
        />
      </div>

      <div>
        <Badge
          variant={form.is_student_home ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-transform active:scale-95",
            form.is_student_home
              ? "border-transparent bg-success/20 text-success"
              : "text-foreground/40 hover:text-foreground",
          )}
          onClick={() =>
            onChange({ ...form, is_student_home: !form.is_student_home })
          }
        >
          <Star size={11} fill="currentColor" className="mr-1.5" />
          {t("addresses.studentLivesHere")}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-street`}>{t("addresses.fields.street")} *</Label>
        <Input
          id={`${prefix}-street`}
          value={form.street}
          onChange={(e) => onChange({ ...form, street: e.target.value })}
          placeholder={t("addresses.fields.streetPlaceholder")}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-city`}>{t("addresses.fields.city")}</Label>
          <Input
            id={`${prefix}-city`}
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
            placeholder={t("addresses.fields.cityPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-state`}>{t("addresses.fields.state")}</Label>
          <Input
            id={`${prefix}-state`}
            value={form.state}
            onChange={(e) => onChange({ ...form, state: e.target.value })}
            placeholder={t("addresses.fields.statePlaceholder")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-zip`}>{t("addresses.fields.zip")}</Label>
          <Input
            id={`${prefix}-zip`}
            value={form.zip_code}
            onChange={(e) => onChange({ ...form, zip_code: e.target.value })}
            placeholder={t("addresses.fields.zipPlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-country`}>{t("addresses.fields.country")}</Label>
          <Input
            id={`${prefix}-country`}
            value={form.country}
            onChange={(e) => onChange({ ...form, country: e.target.value })}
            placeholder={t("addresses.fields.countryPlaceholder")}
          />
        </div>
      </div>
    </div>
  );
}

export function AddressesPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: AddressesPageProps) {
  const { addresses, loading, error, addAddress, updateAddress, deleteAddress } =
    useAddresses(student.id);
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<NewAddressInput>(emptyForm);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [editForm, setEditForm] = useState<NewAddressInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  const closeAddDialog = useCallback(() => {
    setForm(emptyForm);
    setAddError(null);
    setAddOpen(false);
  }, []);

  const openEditDialog = useCallback((address: Address) => {
    setEditingAddress(address);
    setEditForm({
      label: address.label ?? "",
      street: address.street,
      city: address.city ?? "",
      state: address.state ?? "",
      zip_code: address.zip_code ?? "",
      country: address.country ?? "",
      is_student_home: address.is_student_home === 1,
    });
    setEditError(null);
    setEditOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingAddress(null);
    setEditForm(emptyForm);
    setEditError(null);
    setEditOpen(false);
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.street.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await addAddress(form);
      closeAddDialog();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddress || !editForm.street.trim()) return;
    setSubmitting(true);
    setEditError(null);
    try {
      await updateAddress(editingAddress.id, editForm);
      closeEditDialog();
    } catch (err) {
      setEditError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAddress) return;
    await deleteAddress(deletingAddress.id);
    setDeletingAddress(null);
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col px-6 py-6 pl-3">
        <Breadcrumb
          items={[
            { label: t("groups.breadcrumb"), onClick: onGoToGroups },
            { label: group.name },
            { label: t("attendance.studentsHeader"), onClick: onGoToStudents },
            { label: student.name, onClick: onGoToStudentProfile },
            { label: t("addresses.breadcrumb") },
          ]}
        />

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PageBackButton
              label={t("common.back")}
              onClick={onGoToStudentProfile}
            />
            <div>
            <h2 className="text-2xl font-bold">{t("addresses.title")}</h2>
            <p className="text-sm text-muted">{student.name}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            {t("addresses.addAddress")}
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {!loading && !error && (
            <div className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border bg-background">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("addresses.columns.label")}</TableHead>
                      <TableHead>{t("addresses.columns.street")}</TableHead>
                      <TableHead>{t("addresses.columns.city")}</TableHead>
                      <TableHead>{t("addresses.columns.state")}</TableHead>
                      <TableHead>{t("addresses.columns.zip")}</TableHead>
                      <TableHead>{t("addresses.columns.country")}</TableHead>
                      <TableHead />
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addresses.map((address) => (
                      <TableRow key={address.id}>
                        <TableCell className="font-medium">
                          {address.label ?? <span className="text-foreground/30">—</span>}
                        </TableCell>
                        <TableCell>{address.street}</TableCell>
                        <TableCell>{address.city ?? <span className="text-foreground/30">—</span>}</TableCell>
                        <TableCell>{address.state ?? <span className="text-foreground/30">—</span>}</TableCell>
                        <TableCell>{address.zip_code ?? <span className="text-foreground/30">—</span>}</TableCell>
                        <TableCell>{address.country ?? <span className="text-foreground/30">—</span>}</TableCell>
                        <TableCell>
                          {address.is_student_home === 1 && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    type="button"
                                    className="inline-flex size-6 items-center justify-center rounded-full bg-success/10 text-success"
                                  />
                                }
                              >
                                <Star size={11} fill="currentColor" />
                              </TooltipTrigger>
                              <TooltipContent>{t("addresses.studentLivesHere")}</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDialog(address)}
                              className="inline-flex items-center text-foreground/30 transition-colors hover:text-foreground/70"
                              aria-label={t("addresses.editModal.title")}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingAddress(address)}
                              className="inline-flex items-center text-foreground/30 transition-colors hover:text-danger"
                              aria-label={t("addresses.deleteModal.title")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {addresses.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <Inbox className="size-6 text-muted" />
                    <span className="text-sm font-medium text-muted">{t("addresses.noAddressesYet")}</span>
                    <span className="text-xs text-foreground/40">{t("addresses.noAddressesHint")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            if (!open && !submitting) closeAddDialog();
          }}
        >
          <DialogContent>
            <form onSubmit={handleAddSubmit}>
              <DialogHeader>
                <DialogTitle>{t("addresses.addModal.title")}</DialogTitle>
              </DialogHeader>
              <AddressFormFields form={form} onChange={setForm} t={t} prefix="add" />
              {addError && <p className="text-sm text-danger">{addError}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeAddDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={submitting || !form.street.trim()}>
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t("common.add")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            if (!open && !submitting) closeEditDialog();
          }}
        >
          <DialogContent>
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>{t("addresses.editModal.title")}</DialogTitle>
              </DialogHeader>
              <AddressFormFields form={editForm} onChange={setEditForm} t={t} prefix="edit" />
              {editError && <p className="text-sm text-danger">{editError}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeEditDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={submitting || !editForm.street.trim()}>
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          isOpen={deletingAddress !== null}
          title={t("addresses.deleteModal.title")}
          description={
            deletingAddress
              ? t("addresses.deleteModal.description", {
                  address: formatAddress(deletingAddress),
                })
              : undefined
          }
          confirmLabel={t("common.delete")}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingAddress(null)}
        />
      </div>
    </TooltipProvider>
  );
}
