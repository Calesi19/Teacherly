import { useState, useCallback } from "react";
import {
  Button,
  EmptyState,
  Modal,
  Label,
  Input,
  Spinner,
  TableRoot,
  TableScrollContainer,
  TableContent,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  useOverlayState,
  Tooltip,
} from "@heroui/react";
import { Inbox, Pencil, Star, Trash2 } from "lucide-react";
import { useAddresses } from "../hooks/useAddresses";
import { ConfirmModal } from "../components/ConfirmModal";
import { Breadcrumb } from "../components/Breadcrumb";
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
  const addModalState = useOverlayState();
  const editModalState = useOverlayState();
  const [form, setForm] = useState<NewAddressInput>(emptyForm);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [editForm, setEditForm] = useState<NewAddressInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  const closeAddModal = useCallback(() => {
    setForm(emptyForm);
    setAddError(null);
    addModalState.close();
  }, [addModalState]);

  const openEditModal = useCallback(
    (address: Address) => {
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
      editModalState.open();
    },
    [editModalState],
  );

  const closeEditModal = useCallback(() => {
    setEditingAddress(null);
    setEditForm(emptyForm);
    setEditError(null);
    editModalState.close();
  }, [editModalState]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.street.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await addAddress(form);
      closeAddModal();
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
      closeEditModal();
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
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("attendance.studentsHeader"), onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("addresses.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("addresses.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={addModalState.open}>
          {t("addresses.addAddress")}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="accent" />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 text-danger px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {!loading && !error && (
          <TableRoot variant="primary" className="flex-1 h-full">
            <TableScrollContainer className="h-full">
              <TableContent aria-label={t("addresses.title")} selectionMode="none">
                <TableHeader>
                  <TableColumn isRowHeader>{t("addresses.columns.label")}</TableColumn>
                  <TableColumn>{t("addresses.columns.street")}</TableColumn>
                  <TableColumn>{t("addresses.columns.city")}</TableColumn>
                  <TableColumn>{t("addresses.columns.state")}</TableColumn>
                  <TableColumn>{t("addresses.columns.zip")}</TableColumn>
                  <TableColumn>{t("addresses.columns.country")}</TableColumn>
                  <TableColumn> </TableColumn>
                  <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody
                  renderEmptyState={() => (
                    <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                      <Inbox className="size-6 text-muted" />
                      <span className="text-sm font-medium text-muted">{t("addresses.noAddressesYet")}</span>
                      <span className="text-xs text-foreground/40">{t("addresses.noAddressesHint")}</span>
                    </EmptyState>
                  )}
                >
                  {addresses.map((address) => (
                    <TableRow key={address.id} id={address.id}>
                      <TableCell className="font-medium">
                        {address.label ?? <span className="text-foreground/30">—</span>}
                      </TableCell>
                      <TableCell>{address.street}</TableCell>
                      <TableCell>{address.city ?? <span className="text-foreground/30">—</span>}</TableCell>
                      <TableCell>{address.state ?? <span className="text-foreground/30">—</span>}</TableCell>
                      <TableCell>{address.zip_code ?? <span className="text-foreground/30">—</span>}</TableCell>
                      <TableCell>{address.country ?? <span className="text-foreground/30">—</span>}</TableCell>
                      <TableCell>
                        {address.is_student_home ? (
                          <Tooltip>
                            <Tooltip.Trigger>
                              <span className="inline-flex items-center justify-center size-6 rounded-full bg-success/10 text-success">
                                <Star size={11} fill="currentColor" />
                              </span>
                            </Tooltip.Trigger>
                            <Tooltip.Content>{t("addresses.studentLivesHere")}</Tooltip.Content>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(address)}
                            className="inline-flex items-center text-foreground/30 hover:text-foreground/70 transition-colors"
                            aria-label={t("addresses.editModal.title")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAddress(address)}
                            className="inline-flex items-center text-foreground/30 hover:text-danger transition-colors"
                            aria-label={t("addresses.deleteModal.title")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableContent>
            </TableScrollContainer>
          </TableRoot>
        )}
      </div>

      {/* Add Modal */}
      <Modal state={addModalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleAddSubmit}>
                <Modal.Header>{t("addresses.addModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <AddressFormFields form={form} onChange={setForm} t={t} prefix="add" />
                  {addError && <p className="text-danger text-sm">{addError}</p>}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeAddModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting || !form.street.trim()}>
                    {submitting ? <Spinner size="sm" /> : t("common.add")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Edit Modal */}
      <Modal state={editModalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleEditSubmit}>
                <Modal.Header>{t("addresses.editModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <AddressFormFields form={editForm} onChange={setEditForm} t={t} prefix="edit" />
                  {editError && <p className="text-danger text-sm">{editError}</p>}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeEditModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting || !editForm.street.trim()}>
                    {submitting ? <Spinner size="sm" /> : t("common.save")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Delete Confirm */}
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
  );
}

function AddressFormFields({
  form,
  onChange,
  t,
  prefix,
}: {
  form: NewAddressInput;
  onChange: (f: NewAddressInput) => void;
  t: (key: string) => string;
  prefix: string;
}) {
  return (
    <>
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
        <button
          type="button"
          onClick={() => onChange({ ...form, is_student_home: !form.is_student_home })}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${form.is_student_home ? "bg-success/20 text-success" : "bg-foreground/8 text-foreground/40 hover:bg-foreground/12"}`}
        >
          <Star size={11} fill="currentColor" className="mr-1.5" />
          {t("addresses.studentLivesHere")}
        </button>
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
    </>
  );
}
