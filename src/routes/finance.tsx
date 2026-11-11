import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Award,
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  Receipt,
  Search,
  Tag,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAcademicContext } from "@/lib/academic-context";
import { updateStudent, useStudents } from "@/data/student-store";
import { getProfile } from "@/lib/role-profiles";
import { useRole } from "@/lib/role-context";
import { recordAudit } from "@/data/audit-store";
import {
  approveInvoice as approveInvoiceRecord,
  canFinanceAction,
  createInvoice as createInvoiceRecord,
  getStudentFeeBreakdown,
  postPayment,
  saveDebtFollowUp,
  saveFinanceAdjustment,
  useFinanceStore,
} from "@/data/finance-store";
import { FinanceReceiptDocument } from "@/components/kit/finance-receipt";

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  method: string;
  date: string;
  reference: string;
  status: "Posted";
};
type Invoice = {
  id: string;
  studentId: string;
  amount: number;
  paidAmount?: number;
  description: string;
  dueDate: string;
  status: "Pending approval" | "Open" | "Paid";
  reference: string;
};
type Adjustment = {
  id: string;
  studentId: string;
  type: "Scholarship" | "Discount" | "Waiver";
  amount: number;
  reason: string;
  status: "Approved";
  date: string;
  session: string;
  term: string;
  invoiceId?: string;
  lineId?: string;
};
type Reconciliation = { paymentId: string; status: "Matched" | "Review"; reconciledAt: string };
const ADJUSTMENT_KEY = "educore.finance-adjustments";
const RECONCILIATION_KEY = "educore.finance-reconciliation";
const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;
function readAdjustments(): Adjustment[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(ADJUSTMENT_KEY) ?? "[]") as Adjustment[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function readReconciliation(): Reconciliation[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(
      window.localStorage.getItem(RECONCILIATION_KEY) ?? "[]",
    ) as Reconciliation[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — EduCore" },
      {
        name: "description",
        content:
          "Fee structures, billing, invoicing, payments, receipts, scholarships and arrears in Naira.",
      },
      { property: "og:title", content: "Finance — EduCore" },
      {
        property: "og:description",
        content:
          "Fee structures, billing, invoicing, payments, receipts, scholarships and arrears in Naira.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname !== "/finance" ? <Outlet /> : <FinanceOverview />;
}

function FinanceOverview() {
  const { session, term } = useAcademicContext();
  const allStudents = useStudents();
  const { role, profileId } = useRole();
  const linkedProfile = getProfile(role, profileId);
  const students =
    role === "parent" || role === "student"
      ? allStudents.filter((student) => linkedProfile?.childIds.includes(student.id))
      : allStudents;
  const canManageFinance = ["administrator", "principal", "bursar"].includes(role);
  const canApproveFinance = canFinanceAction(role, "approve");
  const canCreateFinance = canFinanceAction(role, "create");
  const canPostFinance = canFinanceAction(role, "post");
  const canReconcileFinance = canFinanceAction(role, "reconcile");
  const canExportFinance = canFinanceAction(role, "export");
  const financeStore = useFinanceStore();
  const payments: Payment[] = financeStore.payments.map((payment) => ({
    ...payment,
    date: payment.postedAt,
  }));
  const invoices: Invoice[] = financeStore.invoices.map((invoice) => ({
    ...invoice,
    description: `${invoice.term} school fees`,
  }));
  const [adjustments, setAdjustments] = useState<Adjustment[]>(readAdjustments);
  const [reconciliation, setReconciliation] = useState<Reconciliation[]>(readReconciliation);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<Adjustment["type"]>("Scholarship");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [paymentStudentSearch, setPaymentStudentSearch] = useState("");
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? students.filter((student) =>
          `${student.firstName} ${student.lastName} ${student.admissionNo}`
            .toLowerCase()
            .includes(query),
        )
      : students;
  }, [search, students]);
  const totalExpected = students.reduce((sum, student) => sum + student.feeExpected, 0);
  const totalCollected = students.reduce(
    (sum, student) => sum + student.feeExpected - student.feeBalance,
    0,
  );
  const totalOutstanding = students.reduce((sum, student) => sum + student.feeBalance, 0);
  const visibleStudentIds = new Set(students.map((student) => student.id));
  const recentPayments = payments
    .filter((payment) => visibleStudentIds.has(payment.studentId))
    .slice()
    .reverse()
    .slice(0, 6);
  const recentInvoices = invoices
    .filter((invoice) => visibleStudentIds.has(invoice.studentId))
    .slice()
    .reverse()
    .slice(0, 5);
  const recentAdjustments = adjustments
    .filter((adjustment) => visibleStudentIds.has(adjustment.studentId))
    .slice()
    .reverse()
    .slice(0, 6);
  const matchedCount = reconciliation.filter((item) => item.status === "Matched").length;

  const reconcilePayment = (paymentId: string, status: Reconciliation["status"]) => {
    if (!canReconcileFinance) {
      toast.error("You do not have permission to reconcile payments");
      return;
    }
    const next = [
      ...reconciliation.filter((item) => item.paymentId !== paymentId),
      { paymentId, status, reconciledAt: new Date().toISOString() },
    ];
    window.localStorage.setItem(RECONCILIATION_KEY, JSON.stringify(next));
    setReconciliation(next);
    recordAudit({
      action: `Payment reconciliation: ${status}`,
      actor: role,
      scope: paymentId,
      category: "Finance",
    });
    toast.success(
      status === "Matched" ? "Payment marked as reconciled" : "Payment sent for review",
    );
  };

  const applyAdjustment = () => {
    if (!canCreateFinance) {
      toast.error("You do not have permission to apply adjustments");
      return;
    }
    const student = students.find((item) => item.id === selectedStudentId);
    const value = Number(adjustmentAmount);
    if (!student || !value || value <= 0 || !adjustmentReason.trim()) {
      toast.error("Select a student, amount and reason");
      return;
    }
    if (adjustmentType === "Discount" && value > 100) {
      toast.error("Discount percentage cannot exceed 100%");
      return;
    }
    const amount =
      adjustmentType === "Discount" && value <= 100
        ? Math.round(student.feeExpected * (value / 100))
        : value;
    if (amount > student.feeExpected) {
      toast.error("Adjustment cannot exceed the student's expected fee");
      return;
    }
    const adjustment: Adjustment = {
      id: `ADJ-${Date.now()}`,
      studentId: student.id,
      type: adjustmentType,
      amount,
      reason: adjustmentReason.trim(),
      status: "Approved",
      date: new Date().toISOString(),
      session,
      term,
    };
    const saved = saveFinanceAdjustment(
      {
        studentId: student.id,
        session,
        term,
        type: adjustmentType,
        amount,
        reason: adjustmentReason.trim(),
      },
      role,
    );
    if (!saved) {
      toast.error("Adjustment could not be saved for this role");
      return;
    }
    const nextAdjustments = [...adjustments, adjustment];
    window.localStorage.setItem(ADJUSTMENT_KEY, JSON.stringify(nextAdjustments));
    updateStudent(student.id, {
      feeExpected: student.feeExpected - amount,
      feeBalance: Math.max(0, student.feeBalance - amount),
    });
    setAdjustments(nextAdjustments);
    recordAudit({
      action: `${adjustmentType} applied`,
      actor: role,
      scope: student.id,
      category: "Finance",
    });
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentOpen(false);
    toast.success(`${adjustmentType} applied for ${student.firstName} ${student.lastName}`);
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
    setInvoiceOpen(false);
    toast.success(`Invoice generated for ${student.firstName} ${student.lastName}`);
  };

  const approveInvoice = (invoiceId: string) => {
    if (!canApproveFinance) return;
    approveInvoiceRecord(invoiceId, role);
    toast.success("Invoice approved");
  };
  const paymentMatches = students
    .filter((student) => {
      if (student.feeBalance <= 0) return false;
      const query = paymentStudentSearch.trim().toLowerCase();
      return (
        !query ||
        `${student.firstName} ${student.lastName} ${student.admissionNo} ${student.id}`
          .toLowerCase()
          .includes(query)
      );
    })
    .slice(0, 8);
  const updateDebt = (student: (typeof students)[number]) => {
    const status = window.prompt("Follow-up status", "Contacted") as
      "Open" | "Contacted" | "Promise to pay" | "Resolved" | null;
    if (!status || !["Open", "Contacted", "Promise to pay", "Resolved"].includes(status)) return;
    const note = window.prompt("Follow-up note", "Guardian contacted") ?? "";
    saveDebtFollowUp(student, status, note, role);
    toast.success("Debt follow-up saved");
  };
  const exportReport = () => {
    if (!canExportFinance) {
      toast.error("You do not have permission to export finance reports");
      return;
    }
    const csv = [
      "Student,Expected,Balance,Status",
      ...students.map((student) =>
        [
          `${student.firstName} ${student.lastName}`,
          student.feeExpected,
          student.feeBalance,
          student.feeBalance ? "Outstanding" : "Cleared",
        ].join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `educore-finance-${session}-${term}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Financial report exported");
  };

  const recordPayment = () => {
    if (!canPostFinance) {
      toast.error("You do not have permission to post payments");
      return;
    }
    const student = students.find((item) => item.id === selectedStudentId);
    const paymentAmount = Number(amount);
    if (!student || !paymentAmount || paymentAmount <= 0) {
      toast.error("Select a student and enter a valid payment amount");
      return;
    }
    if (paymentAmount > student.feeBalance) {
      toast.error("Payment cannot be greater than the outstanding balance");
      return;
    }
    const invoice = financeStore.invoices.find(
      (item) =>
        item.studentId === student.id &&
        item.session === session &&
        item.term === term &&
        ["Open", "Partially paid"].includes(item.status),
    );
    if (!invoice) {
      toast.error("Approve an invoice before posting a payment");
      return;
    }
    const result = postPayment(
      { invoiceId: invoice.id, amount: paymentAmount, method },
      role,
      student,
    );
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setAmount("");
    setPaymentOpen(false);
    setReceipt(payment);
    toast.success(`Payment posted for ${student.firstName} ${student.lastName}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Finance"
        description={
          canManageFinance
            ? "Manage fee billing, collections, receipts, scholarships and discounts for the current academic period."
            : "View fees, invoices and receipts linked to your account."
        }
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Finance" }]}
        actions={
          canManageFinance ? (
            <>
              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download className="size-4" /> Export report
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/finance/invoices">
                  <FileText className="size-4" /> Generate invoice
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/finance/payments">
                  <Plus className="size-4" /> Record payment
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Expected fees"
          value={naira(totalExpected)}
          sub={`${session} · ${term}`}
          icon={WalletCards}
        />
        <KpiCard
          label="Collected"
          value={naira(totalCollected)}
          sub={`${totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0}% of expected`}
          icon={Banknote}
          tone="success"
        />
        <KpiCard
          label="Outstanding"
          value={naira(totalOutstanding)}
          sub={`${students.filter((student) => student.feeBalance > 0).length} students with balances`}
          icon={FileText}
          tone={totalOutstanding ? "warning" : "default"}
        />
        <KpiCard
          label="Payments reconciled"
          value={`${matchedCount}/${payments.length}`}
          sub="Matched against bank or POS records"
          icon={Receipt}
        />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Student billing"
          description="View the current fee position and post a payment against a student."
          bodyClassName="p-0"
        >
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student or admission number"
              className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              aria-label="Search student billing"
            />
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Student</th>
                  <th className="px-3 py-2.5 text-right font-medium">Expected</th>
                  <th className="px-3 py-2.5 text-right font-medium">Balance</th>
                  <th className="px-5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <span className="block font-medium">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {student.admissionNo} · {student.level} {student.arm}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular">{naira(student.feeExpected)}</td>
                    <td className="px-3 py-3 text-right tabular font-medium">
                      {student.feeBalance ? (
                        naira(student.feeBalance)
                      ) : (
                        <StatusBadge tone="success" dot={false}>
                          Paid
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canManageFinance ? (
                        <Button asChild variant="outline" size="sm" disabled={!student.feeBalance}>
                          <Link to="/finance/payments">Pay</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <SectionCard
          title="Recent payments"
          description="Postings and reconciliation status."
          bodyClassName="p-0"
        >
          <div className="divide-y divide-border">
            {recentPayments.length ? (
              recentPayments.map((payment) => {
                const student = students.find((item) => item.id === payment.studentId);
                const match = reconciliation.find((item) => item.paymentId === payment.id);
                return (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {student ? `${student.firstName} ${student.lastName}` : payment.studentId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.reference} · {payment.method}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold tabular">{naira(payment.amount)}</p>
                        <StatusBadge
                          tone={
                            match?.status === "Matched"
                              ? "success"
                              : match?.status === "Review"
                                ? "warning"
                                : "info"
                          }
                        >
                          {match?.status ?? "Unmatched"}
                        </StatusBadge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View receipt for ${payment.reference}`}
                        onClick={() => setReceipt(payment)}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {!match && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reconcilePayment(payment.id, "Review")}
                          >
                            Review
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reconcilePayment(payment.id, "Matched")}
                          >
                            Match
                          </Button>
                        </>
                      )}
                      {match?.status === "Review" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reconcilePayment(payment.id, "Matched")}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No payments have been posted yet.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="Invoices"
        description="Open invoices and their collection status."
        className="mt-4"
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {recentInvoices.length ? (
            recentInvoices.map((invoice) => {
              const student = students.find((item) => item.id === invoice.studentId);
              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {student ? `${student.firstName} ${student.lastName}` : invoice.studentId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.reference} · {invoice.description} · Due {invoice.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular">
                      {naira(invoice.paidAmount ?? 0)} / {naira(invoice.amount)}
                    </span>
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
              No invoices generated yet.
            </div>
          )}
        </div>
      </SectionCard>
      <SectionCard
        title="Scholarships & discounts"
        description="Approved fee adjustments are reflected immediately in student balances."
        className="mt-4"
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {recentAdjustments.length ? (
            recentAdjustments.map((adjustment) => {
              const student = students.find((item) => item.id === adjustment.studentId);
              return (
                <div
                  key={adjustment.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                      {adjustment.type === "Scholarship" ? (
                        <Award className="size-4 text-success" />
                      ) : (
                        <Tag className="size-4 text-info" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium">
                        {student
                          ? `${student.firstName} ${student.lastName}`
                          : adjustment.studentId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {adjustment.type} · {adjustment.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular">-{naira(adjustment.amount)}</span>
                    <StatusBadge tone="success">Approved</StatusBadge>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No scholarships or discounts have been applied.
            </div>
          )}
        </div>
      </SectionCard>
      <SectionCard
        title="Fee structures"
        description={`${session} · ${term} · Current tuition and category rules.`}
        className="mt-4"
        bodyClassName="p-0"
        action={
          <Button asChild variant="outline" size="sm">
            <a href="/finance/fees">
              <Tag className="size-4" /> Manage fee structures
            </a>
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {financeStore.feeStructures
            .filter((fee) => fee.session === session && fee.term === term)
            .map((fee) => (
              <div
                key={fee.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {fee.category} · {fee.level}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fee.session} · {fee.term}
                  </p>
                </div>
                <span className="font-semibold tabular">{naira(fee.amount)}</span>
              </div>
            ))}
        </div>
      </SectionCard>
      <SectionCard
        title="Exact student fee schedule"
        description="The itemized fees assigned to the selected student for this session and term."
        className="mt-4"
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-full sm:w-72">
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
        {(() => {
          const student = students.find((item) => item.id === selectedStudentId);
          const breakdown = student ? getStudentFeeBreakdown(student, session, term) : [];
          const totalFees = breakdown.reduce((sum, fee) => sum + fee.amount, 0);
          return (
            <div>
              <div className="divide-y divide-border rounded-md border border-border">
                {breakdown.length ? (
                  breakdown.map((fee) => (
                    <div key={fee.id} className="flex justify-between px-4 py-3 text-sm">
                      <span>{fee.category}</span>
                      <span className="tabular font-medium">{naira(fee.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No fee structure has been configured for this student's level and current term.
                  </p>
                )}
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
                <span>Term total</span>
                <span className="tabular">{naira(totalFees)}</span>
              </div>
              {student && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current ledger balance: {naira(student.feeBalance)} · Payments and approved
                  adjustments are reflected separately.
                </p>
              )}
            </div>
          );
        })()}
      </SectionCard>
      <SectionCard
        title="Debt follow-up"
        description="Track collection actions for students with outstanding balances."
        className="mt-4"
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {students
            .filter((student) => student.feeBalance > 0)
            .slice(0, 8)
            .map((student) => {
              const followUp = financeStore.debtFollowUps.find(
                (item) => item.studentId === student.id,
              );
              return (
                <div
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {naira(student.feeBalance)} outstanding ·{" "}
                      {followUp?.note ?? "No follow-up recorded"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={followUp?.status === "Resolved" ? "success" : "warning"}>
                      {followUp?.status ?? "Open"}
                    </StatusBadge>
                    {canManageFinance && (
                      <Button size="sm" variant="outline" onClick={() => updateDebt(student)}>
                        Update
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </SectionCard>
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply scholarship or discount</DialogTitle>
            <DialogDescription>
              Approved adjustments reduce the student's expected fee and current balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students
                    .filter((student) => student.feeBalance > 0)
                    .map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} · {naira(student.feeBalance)} due
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Adjustment type</Label>
              <Select
                value={adjustmentType}
                onValueChange={(value) => setAdjustmentType(value as Adjustment["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scholarship">Scholarship (fixed amount)</SelectItem>
                  <SelectItem value="Discount">Discount (percentage up to 100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjustment-amount">
                {adjustmentType === "Discount" ? "Percentage" : "Amount (NGN)"}
              </Label>
              <Input
                id="adjustment-amount"
                type="number"
                min="1"
                max={adjustmentType === "Discount" ? 100 : undefined}
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                placeholder={adjustmentType === "Discount" ? "10" : "50000"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjustment-reason">Reason</Label>
              <Input
                id="adjustment-reason"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="Academic merit award"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAdjustment}>
              <CheckCircle2 className="size-4" /> Apply adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate student invoice</DialogTitle>
            <DialogDescription>
              Creates an invoice for the selected student's current outstanding balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter((student) => student.feeBalance > 0)
                  .map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} · {naira(student.feeBalance)} due
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createInvoice}>
              <FileText className="size-4" /> Generate invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record student payment</DialogTitle>
            <DialogDescription>
              Post a payment to the current student fee ledger. A receipt reference is generated
              automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment-student-search">Student</Label>
              <Input
                id="payment-student-search"
                value={paymentStudentSearch}
                onChange={(event) => setPaymentStudentSearch(event.target.value)}
                placeholder="Search name, admission number, or student ID"
              />
              {paymentStudentSearch && (
                <div className="max-h-48 overflow-auto rounded-md border border-border">
                  {paymentMatches.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted ${selectedStudentId === student.id ? "bg-muted" : ""}`}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setPaymentStudentSearch(`${student.firstName} ${student.lastName}`);
                      }}
                    >
                      <span>
                        <span className="block font-medium">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {student.admissionNo} · {student.level}
                          {student.arm}
                        </span>
                      </span>
                      <span className="tabular text-xs">{naira(student.feeBalance)} due</span>
                    </button>
                  ))}
                  {paymentMatches.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No students found.</p>
                  )}
                </div>
              )}
              {selectedStudentId && (
                <p className="text-xs text-muted-foreground">
                  Selected:{" "}
                  {students.find((student) => student.id === selectedStudentId)?.firstName}{" "}
                  {students.find((student) => student.id === selectedStudentId)?.lastName}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Amount (NGN)</Label>
              <Input
                id="payment-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="50000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                  <SelectItem value="POS">POS</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Online gateway">Online gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={recordPayment}>
              <CheckCircle2 className="size-4" /> Post payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={receipt !== null} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment receipt</DialogTitle>
            <DialogDescription>Official receipt reference {receipt?.reference}.</DialogDescription>
          </DialogHeader>
          {receipt && (
            <FinanceReceiptDocument
              payment={{ ...receipt, postedAt: receipt.date }}
              studentName={`${students.find((student) => student.id === receipt.studentId)?.firstName ?? ""} ${students.find((student) => student.id === receipt.studentId)?.lastName ?? ""}`.trim()}
              onClose={() => setReceipt(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
