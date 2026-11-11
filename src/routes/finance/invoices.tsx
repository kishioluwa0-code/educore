import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicContext } from "@/lib/academic-context";
import { useRole } from "@/lib/role-context";
import { getProfile } from "@/lib/role-profiles";
import { useStudents } from "@/data/student-store";
import {
  approveInvoice as approveInvoiceRecord,
  createInvoice as createInvoiceRecord,
  getInvoiceById,
  useFinanceStore,
} from "@/data/finance-store";

export const Route = createFileRoute("/finance/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — EduCore" },
      { name: "description", content: "Generate, review and approve school fee invoices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicesPage,
});

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

function InvoicesPage() {
  const { session, term } = useAcademicContext();
  const { role, profileId } = useRole();
  const allStudents = useStudents();
  const profile = getProfile(role, profileId);
  const students =
    role === "parent" || role === "student"
      ? allStudents.filter((student) => profile?.childIds.includes(student.id))
      : allStudents;
  const finance = useFinanceStore();
  const canManageFinance = ["administrator", "principal", "bursar"].includes(role);
  const canApproveFinance = role === "administrator" || role === "principal";

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const visibleInvoices = useMemo(
    () =>
      finance.invoices.filter(
        (invoice) =>
          invoice.session === session &&
          invoice.term === term &&
          students.some((student) => student.id === invoice.studentId),
      ),
    [finance.invoices, session, students, term],
  );

  const totalOpen = visibleInvoices.reduce(
    (sum, invoice) => sum + invoice.amount - invoice.paidAmount,
    0,
  );
  const pendingCount = visibleInvoices.filter(
    (invoice) => invoice.status === "Pending approval",
  ).length;
  const previewInvoice =
    (selectedInvoiceId ? getInvoiceById(selectedInvoiceId) : null) ??
    visibleInvoices.find((invoice) => invoice.id === previewId) ??
    null;
  const previewStudent = previewInvoice
    ? students.find((student) => student.id === previewInvoice.studentId)
    : null;

  const downloadInvoice = () => {
    if (!previewInvoice) return;
    const content = [
      "EduCore School Invoice",
      `Invoice: ${previewInvoice.reference}`,
      `Student: ${previewStudent ? `${previewStudent.firstName} ${previewStudent.lastName}` : previewInvoice.studentId}`,
      `Academic period: ${previewInvoice.session} · ${previewInvoice.term}`,
      ...previewInvoice.lines.map((line) => `${line.description}: ${naira(line.amount)}`),
      `Total: ${naira(previewInvoice.amount)}`,
      `Paid: ${naira(previewInvoice.paidAmount)}`,
      `Balance: ${naira(previewInvoice.amount - previewInvoice.paidAmount)}`,
      `Status: ${previewInvoice.status}`,
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    link.download = `${previewInvoice.reference}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Invoice saved locally");
  };

  const approveInvoice = (invoiceId: string) => {
    if (!canApproveFinance) return;
    approveInvoiceRecord(invoiceId, role);
    toast.success("Invoice approved");
  };

  const createInvoice = () => {
    const student = students.find((item) => item.id === selectedStudentId);
    if (!student) {
      toast.error("Select a student");
      return;
    }
    const result = createInvoiceRecord(student, session, term, role);
    if (!result.created) {
      toast.error(
        result.invoice
          ? "An active invoice already exists for this period"
          : "No configured fees exist for this student and period",
      );
      return;
    }
    toast.success(`Invoice generated for ${student.firstName} ${student.lastName}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Invoices"
        description="Issue, review and approve fee invoices for each student."
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Finance", to: "/finance" },
          { label: "Invoices" },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/finance">
              <ArrowLeft className="size-4" /> Finance overview
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Invoices"
          value={`${visibleInvoices.length}`}
          sub="All active invoice records"
          icon={FileText}
        />
        <KpiCard
          label="Open value"
          value={naira(totalOpen)}
          sub="Pending + approved balances"
          icon={WalletCards}
          tone="warning"
        />
        <KpiCard
          label="Pending approvals"
          value={`${pendingCount}`}
          sub="Awaiting review"
          icon={ReceiptText}
        />
        <KpiCard
          label="Status"
          value={canManageFinance ? "Enabled" : "View only"}
          sub={canManageFinance ? "Finance controls active" : "Read-only mode"}
          icon={CheckCircle2}
        />
      </div>

      {canManageFinance && (
        <SectionCard
          title="Generate an invoice"
          description="Create a student invoice for the current term and outstanding balance."
          className="mt-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="w-full md:max-w-sm">
              <label className="mb-1.5 block text-sm font-medium">Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} · {student.level} {student.arm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createInvoice}>
              <Plus className="size-4" /> Create invoice
            </Button>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Invoice pipeline"
        description="Open invoices and approval status across the student ledger."
        className="mt-6"
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {visibleInvoices.length ? (
            visibleInvoices.map((invoice) => {
              const student = students.find((item) => item.id === invoice.studentId);
              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {student ? `${student.firstName} ${student.lastName}` : invoice.studentId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.reference} · {invoice.lines.length} fee lines · Due {invoice.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular">
                      {naira(invoice.paidAmount)} / {naira(invoice.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedInvoiceId(invoice.id);
                        setPreviewId(invoice.id);
                      }}
                    >
                      <FileText className="size-4" /> Preview
                    </Button>
                    <StatusBadge
                      tone={
                        invoice.status === "Paid"
                          ? "success"
                          : invoice.status === "Pending approval"
                            ? "info"
                            : "warning"
                      }
                    >
                      {invoice.status}
                    </StatusBadge>
                    {invoice.status === "Pending approval" && canApproveFinance && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveInvoice(invoice.id)}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No invoices have been generated yet.
            </div>
          )}
        </div>
      </SectionCard>
      <Dialog
        open={Boolean(previewInvoice)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewId(null);
            setSelectedInvoiceId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
            <DialogDescription>
              Review this invoice before printing, downloading, or sharing it with the responsible
              account.
            </DialogDescription>
          </DialogHeader>
          {previewInvoice && (
            <article
              id="invoice-preview"
              className="space-y-5 rounded-md border border-border bg-white p-6 text-slate-950"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    EduCore School Invoice
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{previewInvoice.reference}</h2>
                </div>
                <StatusBadge
                  tone={
                    previewInvoice.status === "Paid"
                      ? "success"
                      : previewInvoice.status === "Pending approval"
                        ? "info"
                        : "warning"
                  }
                >
                  {previewInvoice.status}
                </StatusBadge>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Student</p>
                  <p className="font-medium">
                    {previewStudent
                      ? `${previewStudent.firstName} ${previewStudent.lastName}`
                      : previewInvoice.studentId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Academic period</p>
                  <p className="font-medium">
                    {previewInvoice.session} · {previewInvoice.term}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Due date</p>
                  <p className="font-medium">{previewInvoice.dueDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Invoice lines</p>
                  <p className="font-medium">{previewInvoice.lines.length} fee entries</p>
                </div>
              </div>
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {previewInvoice.lines.map((line) => (
                  <div key={line.feeId} className="flex justify-between gap-4 py-3 text-sm">
                    <span>{line.description}</span>
                    <span className="font-medium tabular">{naira(line.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="ml-auto max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total</span>
                  <strong>{naira(previewInvoice.amount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Paid</span>
                  <span>{naira(previewInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                  <span>Balance due</span>
                  <span>{naira(previewInvoice.amount - previewInvoice.paidAmount)}</span>
                </div>
              </div>
            </article>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button onClick={downloadInvoice}>
              <Download className="size-4" /> Save locally
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
