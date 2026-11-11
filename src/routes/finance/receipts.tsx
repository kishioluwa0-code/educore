import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, FileText, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStudents } from "@/data/student-store";
import { getProfile } from "@/lib/role-profiles";
import { useRole } from "@/lib/role-context";
import { useFinanceStore, voidReceipt } from "@/data/finance-store";
import { FinanceReceiptDocument, downloadReceiptFile } from "@/components/kit/finance-receipt";

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

export const Route = createFileRoute("/finance/receipts")({
  head: () => ({
    meta: [
      { title: "Receipts — EduCore" },
      { name: "description", content: "View and download payment receipts for students." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { role, profileId } = useRole();
  const allStudents = useStudents();
  const profile = getProfile(role, profileId);
  const students =
    role === "parent" || role === "student"
      ? allStudents.filter((student) => profile?.childIds.includes(student.id))
      : allStudents;
  const finance = useFinanceStore();
  const payments = finance.payments;
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewReceipt = finance.receipts.find((receipt) => receipt.id === previewId);
  const previewPayment = previewReceipt
    ? payments.find((payment) => payment.id === previewReceipt.paymentId)
    : undefined;
  const previewStudent = previewPayment
    ? students.find((student) => student.id === previewPayment.studentId)
    : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return finance.receipts.filter((receipt) => {
      const payment = payments.find((item) => item.id === receipt.paymentId);
      const student = students.find((item) => item.id === payment.studentId);
      if (!q) return true;
      return `${student?.firstName ?? ""} ${student?.lastName ?? ""} ${receipt.reference}`
        .toLowerCase()
        .includes(q);
    });
  }, [finance.receipts, payments, query, students]);

  const downloadReceipt = (receipt: (typeof finance.receipts)[number]) => {
    const payment = payments.find((item) => item.id === receipt.paymentId);
    if (!payment) return;
    const student = students.find((item) => item.id === payment.studentId);
    downloadReceiptFile(
      payment,
      receipt,
      student ? `${student.firstName} ${student.lastName}` : payment.studentId,
    );
  };

  return (
    <AppShell>
      <PageHeader
        title="Receipts"
        description="Official student payment confirmations and downloadable receipts."
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Finance", to: "/finance" },
          { label: "Receipts" },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/finance">
              <ArrowLeft className="size-4" /> Finance overview
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Receipts"
          value={`${filtered.length}`}
          sub="Issued for visible payments"
          icon={Receipt}
        />
        <KpiCard
          label="Total value"
          value={naira(filtered.reduce((sum, receipt) => sum + receipt.amount, 0))}
          sub="Across visible receipts"
          icon={FileText}
        />
        <KpiCard
          label="Search"
          value={filtered.length ? `${filtered.length}` : "0"}
          sub="Results in active filter"
          icon={Search}
        />
      </div>

      <SectionCard
        title="Receipt register"
        description="Download or review each payment confirmation."
        className="mt-6"
        bodyClassName="p-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search receipt or student"
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            aria-label="Search receipts"
          />
        </div>
        <div className="divide-y divide-border">
          {filtered.length ? (
            filtered.map((receipt) => {
              const payment = payments.find((item) => item.id === receipt.paymentId);
              if (!payment) return null;
              const student = students.find((item) => item.id === payment.studentId);
              return (
                <div
                  key={receipt.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {student ? `${student.firstName} ${student.lastName}` : payment.studentId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.reference} · {new Date(receipt.issuedAt).toLocaleDateString()} ·{" "}
                      {payment.method}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular">{naira(payment.amount)}</span>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewId(receipt.id)}>
                      Preview
                    </Button>
                    {receipt.status === "Issued" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          voidReceipt(receipt.id, role);
                          toast.success("Receipt voided");
                        }}
                      >
                        Void
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => downloadReceipt(receipt)}>
                      Save locally
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No receipts are available yet.
            </div>
          )}
        </div>
      </SectionCard>
      <Dialog
        open={Boolean(previewReceipt && previewPayment)}
        onOpenChange={(open) => !open && setPreviewId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt preview</DialogTitle>
            <DialogDescription>
              Print or save the official receipt using the shared document.
            </DialogDescription>
          </DialogHeader>
          {previewReceipt && previewPayment && (
            <FinanceReceiptDocument
              payment={previewPayment}
              receipt={previewReceipt}
              studentName={
                previewStudent
                  ? `${previewStudent.firstName} ${previewStudent.lastName}`
                  : previewPayment.studentId
              }
              onClose={() => setPreviewId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
