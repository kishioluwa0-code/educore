import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Banknote, CheckCircle2, Eye, Plus, Receipt, Search } from "lucide-react";
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
import { useAcademicContext } from "@/lib/academic-context";
import { useRole } from "@/lib/role-context";
import { getProfile } from "@/lib/role-profiles";
import { useStudents } from "@/data/student-store";
import {
  approveInvoice,
  canFinanceAction,
  createInvoice,
  postPayment,
  reversePayment,
  useFinanceStore,
} from "@/data/finance-store";

type Reconciliation = { paymentId: string; status: "Matched" | "Review"; reconciledAt: string };

const RECONCILIATION_KEY = "educore.finance-reconciliation";
const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

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

export const Route = createFileRoute("/finance/payments")({
  head: () => ({
    meta: [
      { title: "Payments — EduCore" },
      { name: "description", content: "Record and reconcile school fee payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { session, term } = useAcademicContext();
  const { role, profileId } = useRole();
  const allStudents = useStudents();
  const profile = getProfile(role, profileId);
  const students =
    role === "parent" || role === "student"
      ? allStudents.filter((student) => profile?.childIds.includes(student.id))
      : allStudents;
  const canManageFinance = canFinanceAction(role, "post");

  const finance = useFinanceStore();
  const payments = finance.payments.filter(
    (payment) =>
      payment.session === session &&
      payment.term === term &&
      students.some((student) => student.id === payment.studentId),
  );
  const [reconciliation, setReconciliation] = useState<Reconciliation[]>(readReconciliation);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [paymentSearch, setPaymentSearch] = useState("");
  const studentMatches = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    return students
      .filter((student) => student.feeBalance > 0)
      .filter((student) =>
        !query || `${student.firstName} ${student.lastName} ${student.admissionNo} ${student.id}`.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [paymentSearch, students]);
  const visiblePayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    return payments.filter((payment) => {
      const student = students.find((item) => item.id === payment.studentId);
      return !query || `${student?.firstName ?? ""} ${student?.lastName ?? ""} ${student?.admissionNo ?? ""} ${payment.reference}`.toLowerCase().includes(query);
    });
  }, [paymentSearch, payments, students]);

  const reconcilePayment = (paymentId: string, status: Reconciliation["status"]) => {
    const next = [
      ...reconciliation.filter((item) => item.paymentId !== paymentId),
      { paymentId, status, reconciledAt: new Date().toISOString() },
    ];
    window.localStorage.setItem(RECONCILIATION_KEY, JSON.stringify(next));
    setReconciliation(next);
    toast.success(status === "Matched" ? "Payment matched" : "Payment flagged for review");
  };

  const recordPayment = () => {
    const student = students.find((item) => item.id === selectedStudentId);
    const paymentAmount = Number(amount);

    if (!student || !paymentAmount || paymentAmount <= 0) {
      toast.error("Select a student and enter a valid payment amount");
      return;
    }

    let invoice = finance.invoices.find(
      (item) =>
        item.studentId === student.id &&
        item.session === session &&
        item.term === term &&
        ["Open", "Partially paid"].includes(item.status),
    );
    if (!invoice) {
      const generated = createInvoice(student, session, term, role);
      if (!generated.invoice) {
        toast.error("No fee structure is configured for this student and period");
        return;
      }
      invoice = approveInvoice(generated.invoice.id, role) ?? generated.invoice;
      toast.success("Invoice generated and approved automatically");
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
    setSelectedStudentId(student.id);
    toast.success(`Payment posted for ${student.firstName} ${student.lastName}`);
  };

  const matchedCount = reconciliation.filter((item) => item.status === "Matched").length;

  return (
    <AppShell>
      <PageHeader
        title="Payments"
        description="Post tuition and fee payments and reconcile them against bank records."
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Finance", to: "/finance" },
          { label: "Payments" },
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
          label="Posted"
          value={`${payments.length}`}
          sub={`${session} · ${term}`}
          icon={Banknote}
        />
        <KpiCard
          label="Matched"
          value={`${matchedCount}`}
          sub="Reviewed against bank/POS"
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Outstanding"
          value={naira(students.reduce((sum, student) => sum + student.feeBalance, 0))}
          sub="Current balances"
          icon={Receipt}
          tone="warning"
        />
        <KpiCard
          label="Access"
          value={canManageFinance ? "Finance" : "View only"}
          sub={canManageFinance ? "Posting enabled" : "Read-only"}
          icon={Eye}
        />
      </div>

      {canManageFinance && (
        <SectionCard
          title="Record payment"
          description="Search for a student, review their balance, then apply a payment to the selected ledger."
          className="mt-6"
        >
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="payment-student-search">Student</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="payment-student-search"
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  placeholder="Search name or admission number"
                  className="pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {studentMatches.length ? studentMatches.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted ${selectedStudentId === student.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedStudentId(student.id)}
                  >
                    <span><span className="font-medium">{student.firstName} {student.lastName}</span><span className="block text-xs text-muted-foreground">{student.admissionNo} · {student.level}{student.arm}</span></span>
                    <span className="text-xs font-semibold text-warning">{naira(student.feeBalance)}</span>
                  </button>
                )) : <p className="px-3 py-2 text-xs text-muted-foreground">No students with an outstanding balance found.</p>}
              </div>
              <p className="text-xs text-muted-foreground">Selected: {students.find((student) => student.id === selectedStudentId)?.firstName ?? "None"}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 25000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                  <SelectItem value="POS">POS</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Online payment">Online payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={recordPayment}>
                <Plus className="size-4" /> Post payment
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Payment register"
        description="Posted payments and reconciliation status."
        className="mt-6"
        bodyClassName="p-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={paymentSearch}
            onChange={(event) => setPaymentSearch(event.target.value)}
            placeholder="Search student or admission number"
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            aria-label="Search payments"
          />
        </div>
        <div className="divide-y divide-border">
          {visiblePayments.length ? (
            visiblePayments.map((payment) => {
              const student = students.find((item) => item.id === payment.studentId);
              const match = reconciliation.find((item) => item.paymentId === payment.id);
              return (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {student ? `${student.firstName} ${student.lastName}` : payment.studentId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.reference} · {payment.method} · {payment.session} · {payment.term}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular">{naira(payment.amount)}</span>
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
                    {!match && canManageFinance && (
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
                    {canManageFinance && payment.status === "Posted" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const student = students.find((item) => item.id === payment.studentId);
                          reversePayment(payment.id, role, student);
                          toast.success("Payment reversed");
                        }}
                      >
                        Reverse
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {paymentSearch ? "No payments match this student search." : "No payments have been posted yet."}
            </div>
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
