import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Plus, Save, Trash2, WalletCards } from "lucide-react";
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
import { SESSIONS, TERMS } from "@/data/school";
import {
  archiveFeeStructure,
  deleteFeeStructure,
  isFeeStructureLocked,
  publishFeeStructure,
  saveFeeStructure,
  useFinanceStore,
} from "@/data/finance-store";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/finance/fees")({
  head: () => ({
    meta: [
      { title: "Fee structures — EduCore" },
      {
        name: "description",
        content: "Create and manage itemized school fees by session, term, and class level.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeeStructuresPage,
});

const LEVELS = ["Nursery 1 - Nursery 3", "Primary 1 - Primary 6", "JSS 1 - JSS 3", "SS 1 - SS 3"];
const CATEGORIES = [
  "Tuition",
  "Sports",
  "ICT levy",
  "Examination",
  "Transport",
  "Uniform",
  "Books",
  "Other",
];
const naira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

function FeeStructuresPage() {
  const { session: activeSession, term: activeTerm } = useAcademicContext();
  const { role } = useRole();
  const finance = useFinanceStore();
  const canEdit = role === "administrator" || role === "principal" || role === "bursar";
  const canPublish = role === "administrator" || role === "principal";

  const [session, setSession] = useState(activeSession);
  const [term, setTerm] = useState(activeTerm);
  const [level, setLevel] = useState(LEVELS[2]!);
  const [category, setCategory] = useState("Tuition");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<"Class" | "Class group">("Class");
  const [mandatory, setMandatory] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"One-time" | "Recurring">("Recurring");
  const isDirty = Boolean(amount || customCategory || editingId);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);
  const visibleFees = finance.feeStructures.filter(
    (fee) => fee.session === session && fee.term === term,
  );
  const levelFees = visibleFees.filter((fee) => fee.level === level);
  const total = levelFees.reduce((sum, fee) => sum + fee.amount, 0);
  const save = () => {
    const feeCategory = category === "Other" ? customCategory.trim() : category;
    const value = Number(amount);

    if (!canEdit) return;
    if (!feeCategory || !value || value <= 0) {
      toast.error("Enter a fee category and a valid amount");
      return;
    }

    if (editingId && isFeeStructureLocked(editingId)) {
      toast.error("This fee item is locked because it is already used by an invoice");
      return;
    }
    if (editingId) {
      deleteFeeStructure(editingId, role);
    }

    saveFeeStructure(
      {
        session,
        term,
        level,
        category: feeCategory,
        amount: value,
        targetType,
        mandatory,
        billingCycle,
      },
      role,
    );
    setEditingId(null);
    setTargetType("Class");
    setMandatory(true);
    setBillingCycle("Recurring");
    setAmount("");
    setCustomCategory("");
    toast.success(`${feeCategory} saved to the ${level} schedule`);
  };

  const removeFee = (id: string) => {
    if (!canEdit) return;
    const fee = finance.feeStructures.find((item) => item.id === id);
    if (!fee) return;

    if (!window.confirm("Delete this fee item from the schedule?")) return;
    if (isFeeStructureLocked(id)) {
      toast.error("This fee item is locked because it is already used by an invoice");
      return;
    }
    const deleted = deleteFeeStructure(id, role);
    if (!deleted) return;

    setAmount("");
    setCustomCategory("");
    setEditingId(null);
    toast.success(`${fee.category} removed from ${fee.level}`);
  };

  const publish = (id: string) => {
    if (!canPublish) return;
    publishFeeStructure(id, role);
    toast.success("Fee structure published and available for invoice generation");
  };

  const archive = (id: string) => {
    if (!canPublish) return;
    archiveFeeStructure(id, role);
    toast.success("Fee structure archived");
  };

  const applyEdit = (fee: (typeof finance.feeStructures)[number]) => {
    setSession(fee.session);
    setTerm(fee.term);
    setLevel(fee.level);
    setCategory(fee.category === "Other" ? "Other" : fee.category);
    setCustomCategory(fee.category === "Other" ? fee.category : "");
    setAmount(String(fee.amount));
    setEditingId(fee.id);
    setTargetType(fee.targetType);
    setMandatory(fee.mandatory);
    setBillingCycle(fee.billingCycle);
  };

  return (
    <AppShell>
      <PageHeader
        title="Fee structures"
        description="Build draft fee schedules by session, term, class level, and category. Publish only after review; student charges are created later through invoices."
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Finance", to: "/finance" },
          { label: "Fee structures" },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href="/finance">
              <ArrowLeft className="size-4" /> Finance overview
            </a>
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Selected level total"
          value={naira(total)}
          sub={`${level} · ${term}`}
          icon={WalletCards}
        />
        <KpiCard
          label="Fee categories"
          value={`${levelFees.length}`}
          sub="Configured for selected level"
          icon={Plus}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.35fr]">
        <SectionCard
          title="Create or update a fee"
          description="Saving the same session, term, level, and category updates that fee item."
          action={!canEdit && <StatusBadge tone="neutral">View only</StatusBadge>}
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Session</Label>
                <Select value={session} onValueChange={setSession} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Class level</Label>
              <Select value={level} onValueChange={setLevel} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Target type</Label>
                <Select
                  value={targetType}
                  onValueChange={(value) => setTargetType(value as "Class" | "Class group")}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Class">Exact class</SelectItem>
                    <SelectItem value="Class group">Class group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <Select
                  value={billingCycle}
                  onValueChange={(value) => setBillingCycle(value as "One-time" | "Recurring")}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Recurring">Recurring</SelectItem>
                    <SelectItem value="One-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mandatory}
                onChange={(event) => setMandatory(event.target.checked)}
                disabled={!canEdit}
              />{" "}
              Mandatory fee
            </label>

            <div className="space-y-1.5">
              <Label>Fee category</Label>
              <Select
                value={category === "Other" ? "Other" : category}
                onValueChange={(value) => setCategory(value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {category === "Other" && (
                <div className="mt-2">
                  <Input
                    value={customCategory}
                    onChange={(event) => setCustomCategory(event.target.value)}
                    placeholder="Custom fee category"
                    disabled={!canEdit}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 180000"
                disabled={!canEdit}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {editingId ? `Editing fee item ${editingId}` : "Creating a new fee item"}
              </div>
              <Button onClick={save} disabled={!canEdit}>
                <Save className="size-4" /> {editingId ? "Update fee" : "Save fee"}
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Current structure"
          description="Live fee totals for the selected level and term."
        >
          <div className="space-y-3">
            {levelFees.length ? (
              levelFees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{fee.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {fee.session} · {fee.term} · {fee.level} · {fee.targetType} ·{" "}
                      {fee.billingCycle} · v{fee.version}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular">{naira(fee.amount)}</span>
                    <StatusBadge
                      tone={
                        fee.status === "Published"
                          ? "success"
                          : fee.status === "Draft"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {fee.status}
                    </StatusBadge>
                    {canEdit && fee.status !== "Archived" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isFeeStructureLocked(fee.id)}
                          onClick={() => applyEdit(fee)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={isFeeStructureLocked(fee.id)}
                          onClick={() => removeFee(fee.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        {canPublish && fee.status === "Draft" && (
                          <Button variant="outline" size="sm" onClick={() => publish(fee.id)}>
                            Publish
                          </Button>
                        )}
                        {canPublish && fee.status === "Published" && (
                          <Button variant="ghost" size="sm" onClick={() => archive(fee.id)}>
                            Archive
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No fee items are configured for this level yet.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
