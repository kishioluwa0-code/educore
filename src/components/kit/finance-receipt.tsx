import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { SCHOOL } from "@/data/school";
import { Button } from "@/components/ui/button";
import type { FinancePayment, FinanceReceipt } from "@/data/finance-store";

type ReceiptPayment = Pick<
  FinancePayment,
  "studentId" | "amount" | "method" | "postedAt" | "reference"
> & { date?: string };
type ReceiptDocumentProps = {
  payment: ReceiptPayment;
  receipt?: FinanceReceipt;
  studentName?: string;
  onClose?: () => void;
};

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

export function receiptText(
  payment: ReceiptPayment,
  receipt?: FinanceReceipt,
  studentName?: string,
) {
  return [
    "EduCore School Fees Receipt",
    `Receipt No: ${receipt?.reference ?? payment.reference}`,
    `Student: ${studentName ?? payment.studentId}`,
    `Amount: ${naira(payment.amount)}`,
    `Method: ${payment.method}`,
    `Date: ${new Date(receipt?.issuedAt ?? payment.postedAt ?? payment.date ?? new Date(0).toISOString()).toLocaleString("en-NG")}`,
  ].join("\n");
}

export function downloadReceiptFile(
  payment: ReceiptPayment,
  receipt?: FinanceReceipt,
  studentName?: string,
) {
  const reference = receipt?.reference ?? payment.reference;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([receiptText(payment, receipt, studentName)], { type: "text/plain;charset=utf-8" }),
  );
  link.download = `${reference}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success("Receipt saved locally");
}

export function FinanceReceiptDocument({
  payment,
  receipt,
  studentName,
  onClose,
}: ReceiptDocumentProps) {
  const issuedAt =
    receipt?.issuedAt ?? payment.postedAt ?? payment.date ?? new Date(0).toISOString();
  const receiptReference = receipt?.reference ?? payment.reference;
  return (
    <>
      <div
        id="finance-receipt"
        className="space-y-5 border border-slate-300 bg-white p-7 text-slate-950"
      >
        <header className="border-b-4 border-slate-900 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {SCHOOL.motto}
          </p>
          <h3 className="mt-1 text-2xl font-bold">{SCHOOL.name}</h3>
          <p className="text-xs text-slate-600">{SCHOOL.address}</p>
          <p className="mt-4 text-lg font-bold uppercase">Official payment receipt</p>
        </header>
        <div className="grid gap-3 border-b border-slate-200 pb-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Receipt reference</p>
            <p className="font-semibold">{receiptReference}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Issued</p>
            <p className="font-semibold">{new Date(issuedAt).toLocaleString("en-NG")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Student</p>
            <p className="font-semibold">{studentName ?? payment.studentId}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Student ID</p>
            <p className="font-semibold">{payment.studentId}</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md bg-slate-100 p-4">
          <span className="font-semibold">Amount paid</span>
          <span className="text-2xl font-bold tabular">{naira(payment.amount)}</span>
        </div>
        <div className="grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Payment method</p>
            <p className="font-semibold">{payment.method}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Security status</p>
            <p className="font-semibold text-emerald-700">Verified EduCore posting</p>
          </div>
        </div>
        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-600">
          <p>
            Keep this receipt for school records. Verify the reference against the EduCore finance
            ledger.
          </p>
          <p className="mt-2 font-semibold text-slate-900">Issued by EduCore Finance</p>
        </footer>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" /> Print receipt
        </Button>
        <Button onClick={() => downloadReceiptFile(payment, receipt, studentName)}>
          <Download className="size-4" /> Save locally
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </>
  );
}
