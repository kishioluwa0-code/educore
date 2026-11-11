import { useEffect, useState } from "react";
import { recordAudit } from "@/data/audit-store";
import { SCHOOL, type Student } from "@/data/school";
import { updateStudent } from "@/data/student-store";

export type FeeStructure = {
  id: string;
  session: string;
  term: string;
  level: string;
  category: string;
  amount: number;
  updatedAt: string;
  status: "Draft" | "Published" | "Archived";
  version: number;
  createdBy: string;
  approvedBy?: string;
  publishedAt?: string;
  effectiveFrom?: string;
  targetType: "Class" | "Class group";
  mandatory: boolean;
  billingCycle: "Recurring" | "One-time";
};
export type DebtFollowUp = {
  id: string;
  studentId: string;
  status: "Open" | "Contacted" | "Promise to pay" | "Resolved";
  note: string;
  updatedAt: string;
};
export type FinancePermissionAction = "create" | "approve" | "post" | "reverse" | "reconcile" | "export";
export type FinanceAdjustment = {
  id: string;
  studentId: string;
  invoiceId?: string;
  lineId?: string;
  session: string;
  term: string;
  type: "Scholarship" | "Discount" | "Waiver";
  amount: number;
  reason: string;
  status: "Approved" | "Pending" | "Rejected";
  date: string;
};
export type InvoiceStatus = "Pending approval" | "Open" | "Partially paid" | "Paid" | "Cancelled";
export type FinanceInvoice = {
  id: string;
  studentId: string;
  session: string;
  term: string;
  lines: { feeId: string; description: string; amount: number }[];
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  reference: string;
  createdAt: string;
  description?: string;
  legacy?: boolean;
};
export type FinancePayment = {
  id: string;
  invoiceId: string;
  studentId: string;
  session: string;
  term: string;
  amount: number;
  method: string;
  reference: string;
  postedAt: string;
  status: "Posted" | "Reversed";
  legacy?: boolean;
};
export type PaymentAllocation = {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
};
export type FinanceReceipt = {
  id: string;
  paymentId: string;
  invoiceId: string;
  studentId: string;
  amount: number;
  reference: string;
  issuedAt: string;
  status: "Issued" | "Voided";
};
const FEE_KEY = "educore.finance-fee-structures";
const DEBT_KEY = "educore.finance-debt-followups";
const INVOICE_KEY = "educore.finance-invoices";
const PAYMENT_KEY = "educore.finance-payments";
const ALLOCATION_KEY = "educore.finance-payment-allocations";
const RECEIPT_KEY = "educore.finance-receipts";
const ADJUSTMENT_KEY = "educore.finance-adjustments";
const CHANGE_EVENT = "educore:finance-changed";
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
function normalizeFeeLevel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseClassNumber(value: string) {
  const match = value.match(/([a-z]+)\s*(\d+)/i);
  if (!match) return null;
  return {
    stage: match[1].toLowerCase(),
    number: Number(match[2]),
  };
}

function feeLevelMatchesStudent(studentLevel: string, feeLevel: string, targetType: FeeStructure["targetType"]) {
  const student = normalizeFeeLevel(studentLevel);
  const configured = normalizeFeeLevel(feeLevel);
  if (!student || !configured) return false;

  if (targetType === "Class") {
    return configured === student || configured.includes(student) || student.includes(configured);
  }

  const ruleParts = configured
    .split(/\s*-\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (ruleParts.length === 2) {
    const first = parseClassNumber(ruleParts[0]);
    const second = parseClassNumber(ruleParts[1]);
    const current = parseClassNumber(student);
    if (first && second && current && first.stage === second.stage && current.stage === first.stage) {
      return current.number >= first.number && current.number <= second.number;
    }
  }

  return configured.includes(student) || student.includes(configured);
}

export function getFeeStructures() {
  return read<FeeStructure[]>(FEE_KEY, [
    {
      id: "FEE-001",
      session: "2026/2027",
      term: "First Term",
      level: "JSS 1 - JSS 3",
      category: "Tuition",
      amount: 180000,
      updatedAt: new Date(0).toISOString(),
      status: "Published",
      version: 1,
      createdBy: "System",
      targetType: "Class group",
      mandatory: true,
      billingCycle: "Recurring",
    },
    {
      id: "FEE-002",
      session: "2026/2027",
      term: "First Term",
      level: "JSS 1 - JSS 3",
      category: "Sports",
      amount: 15000,
      updatedAt: new Date(0).toISOString(),
      status: "Published",
      version: 1,
      createdBy: "System",
      targetType: "Class group",
      mandatory: true,
      billingCycle: "Recurring",
    },
    {
      id: "FEE-003",
      session: "2026/2027",
      term: "First Term",
      level: "JSS 1 - JSS 3",
      category: "ICT levy",
      amount: 10000,
      updatedAt: new Date(0).toISOString(),
      status: "Published",
      version: 1,
      createdBy: "System",
      targetType: "Class group",
      mandatory: true,
      billingCycle: "Recurring",
    },
    {
      id: "FEE-004",
      session: "2026/2027",
      term: "First Term",
      level: "SS 1 - SS 3",
      category: "Tuition",
      amount: 220000,
      updatedAt: new Date(0).toISOString(),
      status: "Published",
      version: 1,
      createdBy: "System",
      targetType: "Class group",
      mandatory: true,
      billingCycle: "Recurring",
    },
    {
      id: "FEE-005",
      session: "2026/2027",
      term: "First Term",
      level: "SS 1 - SS 3",
      category: "Sports",
      amount: 15000,
      updatedAt: new Date(0).toISOString(),
      status: "Published",
      version: 1,
      createdBy: "System",
      targetType: "Class group",
      mandatory: true,
      billingCycle: "Recurring",
    },
    {
      id: "FEE-006",
      session: "2026/2027",
      term: "First Term",
      level: "SS 1 - SS 3",
      category: "Examination",
      amount: 20000,
      updatedAt: new Date(0).toISOString(),
      status: "Published",
      version: 1,
      createdBy: "System",
      targetType: "Class group",
      mandatory: true,
      billingCycle: "Recurring",
    },
  ]).map((fee) => ({
    ...fee,
    status: fee.status ?? "Published",
    version: fee.version ?? 1,
    createdBy: fee.createdBy ?? "System",
    targetType: fee.targetType ?? "Class",
    mandatory: fee.mandatory ?? true,
    billingCycle: fee.billingCycle ?? "Recurring",
  }));
}

export function isFeeStructureLocked(id: string) {
  const fee = getFeeStructures().find((item) => item.id === id);
  if (!fee) return false;
  return getInvoices().some((invoice) => invoice.lines.some((line) => line.feeId === fee.id));
}

export function getStudentFeeBreakdown(student: Student, session: string, term: string) {
  return getFeeStructures().filter((fee) => {
    if (fee.session !== session || fee.term !== term || fee.status !== "Published") return false;
    return feeLevelMatchesStudent(student.level, fee.level, fee.targetType ?? "Class");
  });
}
export function saveFeeStructure(
  input: Omit<
    FeeStructure,
    "id" | "updatedAt" | "status" | "version" | "createdBy" | "approvedBy" | "publishedAt"
  >,
  actor: string,
) {
  const existing = getFeeStructures().find(
    (item) =>
      item.session === input.session &&
      item.term === input.term &&
      item.level === input.level &&
      item.category === input.category,
  );
  if (existing && isFeeStructureLocked(existing.id)) {
    return null;
  }

  const next: FeeStructure = {
    ...input,
    id: existing?.id ?? `FEE-${Date.now()}`,
    updatedAt: new Date().toISOString(),
    status: existing?.status === "Published" ? "Draft" : (existing?.status ?? "Draft"),
    version: (existing?.version ?? 0) + 1,
    createdBy: existing?.createdBy ?? actor,
    targetType: input.targetType ?? "Class",
    mandatory: input.mandatory ?? true,
    billingCycle: input.billingCycle ?? "Recurring",
  };
  write(FEE_KEY, [...getFeeStructures().filter((item) => item.id !== existing?.id), next]);
  recordAudit({
    action: "Fee structure saved",
    actor,
    scope: `${input.session} · ${input.term} · ${input.level}`,
    category: "Finance",
  });
  return next;
}
export function publishFeeStructure(id: string, actor: string) {
  const fee = getFeeStructures().find((item) => item.id === id);
  if (!fee || !["administrator", "principal"].includes(actor)) return null;
  const updated: FeeStructure = {
    ...fee,
    status: "Published",
    approvedBy: actor,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  write(
    FEE_KEY,
    getFeeStructures().map((item) => (item.id === id ? updated : item)),
  );
  recordAudit({
    action: "Fee structure published",
    actor,
    scope: `${fee.session} · ${fee.term} · ${fee.level} · ${fee.category}`,
    category: "Finance",
  });
  return updated;
}
export function archiveFeeStructure(id: string, actor: string) {
  const fee = getFeeStructures().find((item) => item.id === id);
  if (!fee || !["administrator", "principal"].includes(actor)) return null;
  const updated: FeeStructure = { ...fee, status: "Archived", updatedAt: new Date().toISOString() };
  write(
    FEE_KEY,
    getFeeStructures().map((item) => (item.id === id ? updated : item)),
  );
  recordAudit({
    action: "Fee structure archived",
    actor,
    scope: `${fee.session} · ${fee.term} · ${fee.level} · ${fee.category}`,
    category: "Finance",
  });
  return updated;
}
export function deleteFeeStructure(id: string, actor: string) {
  const fee = getFeeStructures().find((item) => item.id === id);
  if (!fee || isFeeStructureLocked(id)) return null;
  const next = getFeeStructures().filter((item) => item.id !== id);
  write(FEE_KEY, next);
  recordAudit({
    action: "Fee structure deleted",
    actor,
    scope: `${fee.session} · ${fee.term} · ${fee.level} · ${fee.category}`,
    category: "Finance",
  });
  return fee;
}
export function canFinanceAction(role: string, action: FinancePermissionAction) {
  const allowed: Record<string, FinancePermissionAction[]> = {
    administrator: ["create", "approve", "post", "reverse", "reconcile", "export"],
    principal: ["create", "approve", "post", "reverse", "reconcile", "export"],
    bursar: ["create", "approve", "post", "reverse", "reconcile", "export"],
    teacher: [],
    examinations: ["export"],
    hr: [],
    security: [],
    parent: ["export"],
    student: ["export"],
  };
  return (allowed[role] ?? []).includes(action);
}

export function getFinanceAdjustments() {
  return read<FinanceAdjustment[]>(ADJUSTMENT_KEY, []);
}

export function saveFinanceAdjustment(
  input: Omit<FinanceAdjustment, "id" | "status" | "date">,
  actor: string,
) {
  if (!canFinanceAction(actor, "create")) return null;
  const next: FinanceAdjustment = {
    ...input,
    id: `ADJ-${Date.now()}`,
    status: "Approved",
    date: new Date().toISOString(),
  };
  const existing = [...getFinanceAdjustments(), next];
  write(ADJUSTMENT_KEY, existing);
  recordAudit({
    action: `Finance adjustment applied: ${input.type}`,
    actor,
    scope: `${input.session} · ${input.term} · ${input.studentId}`,
    category: "Finance",
  });
  return next;
}

export function getFinanceReportSnapshot(session: string, term: string) {
  const invoices = getInvoices().filter((invoice) => invoice.session === session && invoice.term === term);
  const payments = getPayments().filter(
    (payment) => payment.session === session && payment.term === term && payment.status === "Posted",
  );
  const adjustments = getFinanceAdjustments().filter(
    (adjustment) => adjustment.session === session && adjustment.term === term,
  );
  const expected = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const collected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
  const totalAdjustments = adjustments.reduce((sum, adjustment) => sum + adjustment.amount, 0);
  return {
    expected,
    collected,
    outstanding,
    adjustments: totalAdjustments,
    receipts: payments.length,
    invoices: invoices.length,
  };
}

export function getDebtFollowUps() {
  return read<DebtFollowUp[]>(DEBT_KEY, []);
}
export function saveDebtFollowUp(
  student: Student,
  status: DebtFollowUp["status"],
  note: string,
  actor: string,
) {
  const next = {
    id: `DEBT-${Date.now()}`,
    studentId: student.id,
    status,
    note,
    updatedAt: new Date().toISOString(),
  };
  write(DEBT_KEY, [...getDebtFollowUps().filter((item) => item.studentId !== student.id), next]);
  recordAudit({
    action: `Debt follow-up: ${status}`,
    actor,
    scope: student.id,
    category: "Finance",
  });
  return next;
}
export function getInvoices() {
  return read<FinanceInvoice[]>(INVOICE_KEY, []).map((invoice) => ({
    ...invoice,
    session: invoice.session || SCHOOL.session,
    term: invoice.term || SCHOOL.term,
    lines:
      Array.isArray(invoice.lines) && invoice.lines.length
        ? invoice.lines
        : [
            {
              feeId: "LEGACY",
              description: invoice.description ?? "Legacy school fees",
              amount: invoice.amount,
            },
          ],
    paidAmount: invoice.paidAmount ?? 0,
    legacy: (invoice.legacy ?? !invoice.session) || !invoice.term,
  }));
}
export function getInvoiceById(invoiceId: string) {
  return getInvoices().find((invoice) => invoice.id === invoiceId) ?? null;
}
export function getPayments() {
  return read<FinancePayment[]>(PAYMENT_KEY, []).map((payment) => ({
    ...payment,
    session: payment.session || SCHOOL.session,
    term: payment.term || SCHOOL.term,
    invoiceId: payment.invoiceId ?? "LEGACY",
    status: payment.status ?? "Posted",
    postedAt:
      payment.postedAt ??
      (payment as FinancePayment & { date?: string }).date ??
      new Date(0).toISOString(),
    legacy: (payment.legacy ?? !payment.session) || !payment.term || !payment.invoiceId,
  }));
}
export function getPaymentAllocations() {
  return read<PaymentAllocation[]>(ALLOCATION_KEY, []);
}
export function getReceipts() {
  return read<FinanceReceipt[]>(RECEIPT_KEY, []);
}
export function getReceiptById(receiptId: string) {
  return getReceipts().find((receipt) => receipt.id === receiptId) ?? null;
}

function saveFinanceRecords<T>(key: string, value: T) {
  write(key, value);
}

export function createInvoice(student: Student, session: string, term: string, actor: string) {
  const invoices = getInvoices();
  const existing = invoices.find(
    (invoice) =>
      invoice.studentId === student.id &&
      invoice.session === session &&
      invoice.term === term &&
      !["Paid", "Cancelled"].includes(invoice.status),
  );
  if (existing) return { invoice: existing, created: false };
  const lines = getStudentFeeBreakdown(student, session, term).map((fee) => ({
    feeId: fee.id,
    description: fee.category,
    amount: fee.amount,
  }));
  const amount = lines.reduce((sum, line) => sum + line.amount, 0);
  if (!amount) return { invoice: null, created: false };
  const now = new Date().toISOString();
  const invoice: FinanceInvoice = {
    id: `INV-${Date.now()}`,
    studentId: student.id,
    session,
    term,
    lines,
    amount,
    paidAmount: 0,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: "Pending approval",
    reference: `EDC-INV-${Date.now().toString().slice(-6)}`,
    createdAt: now,
  };
  saveFinanceRecords(INVOICE_KEY, [...invoices, invoice]);
  recordAudit({
    action: "Invoice generated",
    actor,
    scope: invoice.reference,
    category: "Finance",
  });
  return { invoice, created: true };
}

export function approveInvoice(invoiceId: string, actor: string) {
  const invoice = getInvoices().find((item) => item.id === invoiceId);
  if (!invoice || invoice.status !== "Pending approval") return null;
  const updated = { ...invoice, status: "Open" as const };
  saveFinanceRecords(
    INVOICE_KEY,
    getInvoices().map((item) => (item.id === invoiceId ? updated : item)),
  );
  recordAudit({ action: "Invoice approved", actor, scope: invoice.reference, category: "Finance" });
  return updated;
}

export function postPayment(
  input: Pick<FinancePayment, "invoiceId" | "amount" | "method">,
  actor: string,
  student?: Student,
) {
  const invoice = getInvoices().find((item) => item.id === input.invoiceId);
  if (!invoice || !["Open", "Partially paid"].includes(invoice.status))
    return {
      payment: null,
      receipt: null,
      error: "Invoice must be approved before payment can be posted",
    };
  const outstanding = invoice.amount - invoice.paidAmount;
  if (input.amount <= 0 || input.amount > outstanding)
    return {
      payment: null,
      receipt: null,
      error: "Payment must be greater than zero and cannot exceed the invoice balance",
    };
  const now = new Date().toISOString();
  const payment: FinancePayment = {
    id: `PAY-${Date.now()}`,
    invoiceId: invoice.id,
    studentId: invoice.studentId,
    session: invoice.session,
    term: invoice.term,
    amount: input.amount,
    method: input.method,
    reference: `EDC-PAY-${Date.now().toString().slice(-6)}`,
    postedAt: now,
    status: "Posted",
  };
  const updatedInvoice = {
    ...invoice,
    paidAmount: invoice.paidAmount + input.amount,
    status:
      invoice.paidAmount + input.amount >= invoice.amount
        ? ("Paid" as const)
        : ("Partially paid" as const),
  };
  const receipt: FinanceReceipt = {
    id: `RCT-${Date.now()}`,
    paymentId: payment.id,
    invoiceId: invoice.id,
    studentId: invoice.studentId,
    amount: payment.amount,
    reference: `EDC-RCT-${Date.now().toString().slice(-6)}`,
    issuedAt: now,
    status: "Issued",
  };
  saveFinanceRecords(PAYMENT_KEY, [...getPayments(), payment]);
  saveFinanceRecords(ALLOCATION_KEY, [
    ...getPaymentAllocations(),
    {
      id: `ALLOC-${Date.now()}`,
      paymentId: payment.id,
      invoiceId: invoice.id,
      amount: payment.amount,
    },
  ]);
  saveFinanceRecords(
    INVOICE_KEY,
    getInvoices().map((item) => (item.id === invoice.id ? updatedInvoice : item)),
  );
  saveFinanceRecords(RECEIPT_KEY, [...getReceipts(), receipt]);
  if (student)
    updateStudent(student.id, { feeBalance: Math.max(0, student.feeBalance - input.amount) });
  recordAudit({
    action: "Payment posted and receipt issued",
    actor,
    scope: payment.reference,
    category: "Finance",
  });
  return { payment, receipt, error: null };
}

export function reversePayment(paymentId: string, actor: string, student?: Student) {
  const payment = getPayments().find((item) => item.id === paymentId);
  if (!payment || payment.status !== "Posted") return null;
  const invoice = getInvoiceById(payment.invoiceId);
  if (!invoice) return null;

  const updatedPayment = { ...payment, status: "Reversed" as const };
  const nextInvoice = {
    ...invoice,
    paidAmount: Math.max(0, invoice.paidAmount - payment.amount),
    status:
      invoice.paidAmount - payment.amount <= 0
        ? ("Open" as const)
        : invoice.paidAmount - payment.amount >= invoice.amount
          ? ("Paid" as const)
          : ("Partially paid" as const),
  };
  saveFinanceRecords(
    PAYMENT_KEY,
    getPayments().map((item) => (item.id === paymentId ? updatedPayment : item)),
  );
  saveFinanceRecords(
    INVOICE_KEY,
    getInvoices().map((item) => (item.id === invoice.id ? nextInvoice : item)),
  );

  const matchingReceipt = getReceipts().find((receipt) => receipt.paymentId === paymentId);
  if (matchingReceipt) {
    saveFinanceRecords(
      RECEIPT_KEY,
      getReceipts().map((receipt) =>
        receipt.id === matchingReceipt.id ? { ...receipt, status: "Voided" } : receipt,
      ),
    );
  }

  if (student) updateStudent(student.id, { feeBalance: student.feeBalance + payment.amount });
  recordAudit({ action: "Payment reversed", actor, scope: payment.reference, category: "Finance" });
  return updatedPayment;
}

export function voidReceipt(receiptId: string, actor: string) {
  const receipt = getReceiptById(receiptId);
  if (!receipt || receipt.status !== "Issued") return null;
  const updated = { ...receipt, status: "Voided" as const };
  saveFinanceRecords(
    RECEIPT_KEY,
    getReceipts().map((item) => (item.id === receiptId ? updated : item)),
  );
  recordAudit({ action: "Receipt voided", actor, scope: receipt.reference, category: "Finance" });
  return updated;
}

export function useFinanceStore() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((value) => value + 1);
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return {
    feeStructures: getFeeStructures(),
    debtFollowUps: getDebtFollowUps(),
    invoices: getInvoices(),
    payments: getPayments(),
    allocations: getPaymentAllocations(),
    receipts: getReceipts(),
  };
}
