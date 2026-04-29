import { useState, useCallback } from "react";
import { Inbox, Pencil } from "lucide-react";
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
import { cn } from "@/lib/utils";
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

const emptyForm: NewContactInput = {
  name: "",
  relationship: "",
  phone: "",
  email: "",
  is_emergency_contact: false,
  is_primary_guardian: false,
};

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
      className="ml-1.5 inline-flex items-center text-foreground/30 transition-colors hover:text-foreground/70"
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

function ToggleBadge({
  active,
  activeClassName,
  inactiveClassName,
  onClick,
  children,
}: {
  active: boolean;
  activeClassName: string;
  inactiveClassName: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className={cn(
        "cursor-pointer transition-transform active:scale-95",
        active ? activeClassName : inactiveClassName,
      )}
      onClick={onClick}
    >
      {children}
    </Badge>
  );
}

function ContactForm({
  form,
  setForm,
  prefix,
  t,
}: {
  form: NewContactInput;
  setForm: (form: NewContactInput) => void;
  prefix: string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-contact-name`}>{t(`contacts.${prefix}Modal.nameLabel`)}</Label>
        <Input
          id={`${prefix}-contact-name`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t(`contacts.${prefix}Modal.namePlaceholder`)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-contact-relationship`}>
          {t(`contacts.${prefix}Modal.relationshipLabel`)}
        </Label>
        <Input
          id={`${prefix}-contact-relationship`}
          value={form.relationship}
          onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          placeholder={t(`contacts.${prefix}Modal.relationshipPlaceholder`)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-contact-phone`}>{t(`contacts.${prefix}Modal.phoneLabel`)}</Label>
        <Input
          id={`${prefix}-contact-phone`}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder={t(`contacts.${prefix}Modal.phonePlaceholder`)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-contact-email`}>{t(`contacts.${prefix}Modal.emailLabel`)}</Label>
        <Input
          id={`${prefix}-contact-email`}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t(`contacts.${prefix}Modal.emailPlaceholder`)}
        />
      </div>
      <div className="flex gap-2">
        <ToggleBadge
          active={form.is_primary_guardian}
          activeClassName="bg-accent/20 text-accent border-transparent"
          inactiveClassName="text-foreground/40 hover:text-foreground"
          onClick={() =>
            setForm({ ...form, is_primary_guardian: !form.is_primary_guardian })
          }
        >
          {t(`contacts.${prefix}Modal.primaryGuardian`)}
        </ToggleBadge>
        <ToggleBadge
          active={form.is_emergency_contact}
          activeClassName="bg-warning/20 text-warning border-transparent"
          inactiveClassName="text-foreground/40 hover:text-foreground"
          onClick={() =>
            setForm({ ...form, is_emergency_contact: !form.is_emergency_contact })
          }
        >
          {t(`contacts.${prefix}Modal.primaryEmergency`)}
        </ToggleBadge>
      </div>
    </div>
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
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<NewContactInput>(emptyForm);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<NewContactInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const closeAddDialog = () => {
    setForm(emptyForm);
    setAddError(null);
    setAddOpen(false);
  };

  const openEditDialog = (contact: Contact) => {
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
    setEditOpen(true);
  };

  const closeEditDialog = () => {
    setEditingContact(null);
    setEditForm(emptyForm);
    setEditError(null);
    setEditOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await addContact(form);
      closeAddDialog();
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
      closeEditDialog();
    } catch (err) {
      setEditError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <Breadcrumb
        items={[
          { label: t("groups.breadcrumb"), onClick: onGoToGroups },
          { label: group.name },
          { label: t("attendance.studentsHeader"), onClick: onGoToStudents },
          { label: student.name, onClick: onGoToStudentProfile },
          { label: t("contacts.breadcrumb") },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("contacts.title")}</h2>
          <p className="text-sm text-muted">{student.name}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          {t("contacts.addContact")}
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
                    <TableHead>{t("contacts.columns.name")}</TableHead>
                    <TableHead>{t("contacts.columns.relationship")}</TableHead>
                    <TableHead>{t("contacts.columns.phone")}</TableHead>
                    <TableHead>{t("contacts.columns.email")}</TableHead>
                    <TableHead />
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>
                        {contact.relationship ?? <span className="text-foreground/30">—</span>}
                      </TableCell>
                      <TableCell>
                        {contact.phone ? (
                          <span className="inline-flex items-center">
                            {contact.phone}
                            <CopyButton value={contact.phone} />
                          </span>
                        ) : (
                          <span className="text-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <span className="inline-flex items-center">
                            {contact.email}
                            <CopyButton value={contact.email} />
                          </span>
                        ) : (
                          <span className="text-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {contact.is_primary_guardian === 1 && (
                            <Badge className="bg-accent/10 text-accent border-transparent">
                              {t("contacts.columns.primaryGuardian")}
                            </Badge>
                          )}
                          {contact.is_emergency_contact === 1 && (
                            <Badge className="bg-warning/10 text-warning border-transparent">
                              {t("contacts.columns.emergencyContact")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openEditDialog(contact)}
                          className="inline-flex items-center text-foreground/30 transition-colors hover:text-foreground/70"
                          aria-label={t("contacts.editModal.title")}
                        >
                          <Pencil size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {contacts.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Inbox className="size-6 text-muted" />
                  <span className="text-sm font-medium text-muted">{t("contacts.noContactsYet")}</span>
                  <span className="text-xs text-foreground/40">{t("contacts.noContactsHint")}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open && !submitting) closeEditDialog();
        }}
      >
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>{t("contacts.editModal.title")}</DialogTitle>
            </DialogHeader>
            <ContactForm form={editForm} setForm={setEditForm} prefix="edit" t={t} />
            {editError && <p className="text-sm text-danger">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeEditDialog}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
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

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && !submitting) closeAddDialog();
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("contacts.addModal.title")}</DialogTitle>
            </DialogHeader>
            <ContactForm form={form} setForm={setForm} prefix="add" t={t} />
            {addError && <p className="text-sm text-danger">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeAddDialog}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
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
    </div>
  );
}
