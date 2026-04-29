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
} from "@heroui/react";
import { Inbox, Pencil } from "lucide-react";
import { useContacts } from "../hooks/useContacts";
import { Breadcrumb } from "../components/Breadcrumb";
import { useTranslation } from "../i18n/LanguageContext";
import type { Group } from "../types/group";
import type { Student } from "../types/student";
import type { Contact, NewContactInput } from "../types/contact";

interface ContactsPageProps {
  student: Student;
  group: Group;
  onGoToGroups: () => void;
  onGoToStudents: () => void;
  onGoToStudentProfile: () => void;
}

const emptyForm: NewContactInput = { name: "", relationship: "", phone: "", email: "", is_emergency_contact: false, is_primary_guardian: false };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 inline-flex items-center text-foreground/30 hover:text-foreground/70 transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export function ContactsPage({
  student,
  group,
  onGoToGroups,
  onGoToStudents,
  onGoToStudentProfile,
}: ContactsPageProps) {
  const { contacts, loading, error, addContact, updateContact } = useContacts(student.id);
  const { t } = useTranslation();
  const modalState = useOverlayState();
  const editModalState = useOverlayState();
  const [form, setForm] = useState<NewContactInput>(emptyForm);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<NewContactInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const closeModal = () => {
    setForm(emptyForm);
    setAddError(null);
    modalState.close();
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name,
      relationship: contact.relationship ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      is_emergency_contact: contact.is_emergency_contact === 1,
      is_primary_guardian: contact.is_primary_guardian === 1,
    });
    setEditError(null);
    editModalState.open();
  };

  const closeEditModal = () => {
    setEditingContact(null);
    setEditForm(emptyForm);
    setEditError(null);
    editModalState.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await addContact(form);
      setForm(emptyForm);
      modalState.close();
    } catch (err) {
      setAddError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !editForm.name.trim()) return;
    setSubmitting(true);
    setEditError(null);
    try {
      await updateContact(editingContact.id, editForm);
      closeEditModal();
    } catch (err) {
      setEditError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("attendance.studentsHeader"), onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("contacts.breadcrumb") },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("contacts.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button variant="primary" size="sm" onPress={modalState.open}>
          {t("contacts.addContact")}
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
              <TableContent aria-label={t("contacts.title")} selectionMode="none">
                <TableHeader>
                  <TableColumn isRowHeader>{t("contacts.columns.name")}</TableColumn>
                  <TableColumn>{t("contacts.columns.relationship")}</TableColumn>
                  <TableColumn>{t("contacts.columns.phone")}</TableColumn>
                  <TableColumn>{t("contacts.columns.email")}</TableColumn>
                  <TableColumn> </TableColumn>
                  <TableColumn> </TableColumn>
                </TableHeader>
                <TableBody
                  renderEmptyState={() => (
                    <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-2 py-12 text-center">
                      <Inbox className="size-6 text-muted" />
                      <span className="text-sm font-medium text-muted">{t("contacts.noContactsYet")}</span>
                      <span className="text-xs text-foreground/40">{t("contacts.noContactsHint")}</span>
                    </EmptyState>
                  )}
                >
                  {contacts.map((contact) => (
                    <TableRow key={contact.id} id={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.relationship ?? <span className="text-foreground/30">—</span>}</TableCell>
                      <TableCell>
                        {contact.phone
                          ? <span className="inline-flex items-center">{contact.phone}<CopyButton value={contact.phone} /></span>
                          : <span className="text-foreground/30">—</span>}
                      </TableCell>
                      <TableCell>
                        {contact.email
                          ? <span className="inline-flex items-center">{contact.email}<CopyButton value={contact.email} /></span>
                          : <span className="text-foreground/30">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {contact.is_primary_guardian ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                              {t("contacts.columns.primaryGuardian")}
                            </span>
                          ) : null}
                          {contact.is_emergency_contact ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                              {t("contacts.columns.emergencyContact")}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openEditModal(contact)}
                          className="inline-flex items-center text-foreground/30 hover:text-foreground/70 transition-colors"
                          aria-label={t("contacts.editModal.title")}
                        >
                          <Pencil size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableContent>
            </TableScrollContainer>
          </TableRoot>
        )}
      </div>

      <Modal state={editModalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleEditSubmit}>
                <Modal.Header>{t("contacts.editModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-contact-name">{t("contacts.editModal.nameLabel")}</Label>
                    <Input
                      id="edit-contact-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder={t("contacts.editModal.namePlaceholder")}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-contact-relationship">{t("contacts.editModal.relationshipLabel")}</Label>
                    <Input
                      id="edit-contact-relationship"
                      value={editForm.relationship}
                      onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                      placeholder={t("contacts.editModal.relationshipPlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-contact-phone">{t("contacts.editModal.phoneLabel")}</Label>
                    <Input
                      id="edit-contact-phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder={t("contacts.editModal.phonePlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-contact-email">{t("contacts.editModal.emailLabel")}</Label>
                    <Input
                      id="edit-contact-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder={t("contacts.editModal.emailPlaceholder")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, is_primary_guardian: !editForm.is_primary_guardian })}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${editForm.is_primary_guardian ? "bg-accent/20 text-accent" : "bg-foreground/8 text-foreground/40 hover:bg-foreground/12"}`}
                    >
                      {t("contacts.editModal.primaryGuardian")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, is_emergency_contact: !editForm.is_emergency_contact })}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${editForm.is_emergency_contact ? "bg-warning/20 text-warning" : "bg-foreground/8 text-foreground/40 hover:bg-foreground/12"}`}
                    >
                      {t("contacts.editModal.primaryEmergency")}
                    </button>
                  </div>
                  {editError && (
                    <p className="text-danger text-sm">{editError}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeEditModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting}>
                    {submitting ? <Spinner size="sm" /> : t("common.save")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={modalState}>
        <Modal.Backdrop isDismissable={!submitting}>
          <Modal.Container>
            <Modal.Dialog>
              <form onSubmit={handleSubmit}>
                <Modal.Header>{t("contacts.addModal.title")}</Modal.Header>
                <Modal.Body className="flex flex-col gap-4 pb-px overflow-visible">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-name">{t("contacts.addModal.nameLabel")}</Label>
                    <Input
                      id="contact-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t("contacts.addModal.namePlaceholder")}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-relationship">{t("contacts.addModal.relationshipLabel")}</Label>
                    <Input
                      id="contact-relationship"
                      value={form.relationship}
                      onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                      placeholder={t("contacts.addModal.relationshipPlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-phone">{t("contacts.addModal.phoneLabel")}</Label>
                    <Input
                      id="contact-phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder={t("contacts.addModal.phonePlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contact-email">{t("contacts.addModal.emailLabel")}</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t("contacts.addModal.emailPlaceholder")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_primary_guardian: !form.is_primary_guardian })}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${form.is_primary_guardian ? "bg-accent/20 text-accent" : "bg-foreground/8 text-foreground/40 hover:bg-foreground/12"}`}
                    >
                      {t("contacts.addModal.primaryGuardian")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_emergency_contact: !form.is_emergency_contact })}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${form.is_emergency_contact ? "bg-warning/20 text-warning" : "bg-foreground/8 text-foreground/40 hover:bg-foreground/12"}`}
                    >
                      {t("contacts.addModal.primaryEmergency")}
                    </button>
                  </div>
                  {addError && (
                    <p className="text-danger text-sm">{addError}</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="ghost" onPress={closeModal}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting}>
                    {submitting ? <Spinner size="sm" /> : t("common.add")}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
