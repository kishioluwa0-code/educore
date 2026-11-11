import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SCHOOL } from "@/data/school";
import { getApprovalRules, saveApprovalRules, type ApprovalRule } from "@/data/approval-store";
import { toast } from "sonner";
import { getServerSchoolSetup, saveServerSchoolSetup } from "@/lib/school-api";
import { useRole } from "@/lib/role-context";
import { getStaffRecords, type StaffRecord } from "@/data/staff-store";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "School setup — EduCore" },
      {
        name: "description",
        content: "Configure school profile, academic session, class structure, grading and assessment weighting.",
      },
      { property: "og:title", content: "School setup — EduCore" },
      { property: "og:description", content: "Guided configuration for a new school on EduCore." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

const STEPS = [
  { title: "School profile", hint: "Identity and contact" },
  { title: "Academic session", hint: "Session and terms" },
  { title: "Class structure", hint: "Sections, levels, arms" },
  { title: "Grading & assessment", hint: "Scales and weighting" },
  { title: "Governance", hint: "Roles and approvals" },
  { title: "Ready", hint: "Review and finish" },
];

const DEFAULT_GRADES = [
  { grade: "A1", min: 75, max: 100, remark: "Excellent" },
  { grade: "B2", min: 70, max: 74, remark: "Very good" },
  { grade: "B3", min: 65, max: 69, remark: "Good" },
  { grade: "C4", min: 60, max: 64, remark: "Credit" },
  { grade: "C5", min: 55, max: 59, remark: "Credit" },
  { grade: "C6", min: 50, max: 54, remark: "Credit" },
  { grade: "D7", min: 45, max: 49, remark: "Pass" },
  { grade: "E8", min: 40, max: 44, remark: "Pass" },
  { grade: "F9", min: 0, max: 39, remark: "Fail" },
];

const PRIMARY_GRADES = [
  { grade: "A", min: 75, max: 100, remark: "Excellent" },
  { grade: "B", min: 65, max: 74, remark: "Very good" },
  { grade: "C", min: 55, max: 64, remark: "Good" },
  { grade: "D", min: 45, max: 54, remark: "Pass" },
  { grade: "E", min: 40, max: 44, remark: "Fair" },
  { grade: "F", min: 0, max: 39, remark: "Needs support" },
];

const GOVERNANCE_ROLES = [
  ["School administrator", "Full configuration and approval authority", "All modules"],
  ["Principal", "Academic, student and operational approvals", "Academics · People · Operations"],
  ["Examination officer", "Examination registration and result workflow", "Examinations · Assessment"],
  ["Bursar / Finance", "Fee posting, reconciliation and finance reports", "Finance"],
];

const SETUP_PROGRESS_KEY = "educore.setup-progress";
const SETUP_CHECKLIST_KEY = "educore.setup-checklist";
const SETUP_CONFIG_KEY = "educore.setup-config";

const SETUP_CHECKLIST = [
  ["profile", "School profile and official contacts confirmed"],
  ["session", "Academic session and term dates confirmed"],
  ["structure", "Sections, levels and class arms reviewed"],
  ["grading", "Grading scale and assessment weighting approved"],
  ["governance", "Approval owners and role access reviewed"],
] as const;

function SetupPage() {
  const [step, setStep] = useState(0);
  const [savedStep, setSavedStep] = useState(0);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>(getApprovalRules);
  const [staff, setStaff] = useState<StaffRecord[]>(getStaffRecords);
  const [schoolType, setSchoolType] = useState("all");
  const [weights, setWeights] = useState({ ca1: 20, ca2: 20, assignment: 10, exam: 50 });
  const [grades, setGrades] = useState(DEFAULT_GRADES);
  const [sessionName, setSessionName] = useState("2026/2027");
  const [terms, setTerms] = useState([
    { name: "First Term", starts: "2026-09-14", ends: "2026-12-11" },
    { name: "Second Term", starts: "2027-01-11", ends: "2027-04-02" },
    { name: "Third Term", starts: "2027-04-26", ends: "2027-07-23" },
  ]);
  const [classStructure, setClassStructure] = useState([
    { section: "Nursery", name: "Nursery 1", arm: "A" },
    { section: "Nursery", name: "Nursery 2", arm: "A" },
    { section: "Primary", name: "Primary 1", arm: "A" },
    { section: "Primary", name: "Primary 2", arm: "A" },
    { section: "Junior Secondary", name: "JSS 1", arm: "A" },
    { section: "Senior Secondary", name: "SS 1", arm: "A" },
  ]);
  const { authenticated } = useRole();
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const onboardedStaff = staff.filter((item) => item.status === "Active");
  const progress = Math.round((savedStep / (STEPS.length - 1)) * 100);

  useEffect(() => {
    setApprovalRules((current) => current.filter((rule) => staff.some((person) => person.id === rule.primaryStaffId) && (!rule.secondaryStaffId || staff.some((person) => person.id === rule.secondaryStaffId))));
    const stored = Number(window.localStorage.getItem(SETUP_PROGRESS_KEY));
    if (Number.isInteger(stored) && stored >= 0 && stored < STEPS.length) {
      setStep(stored);
      setSavedStep(stored);
    }
    const storedChecklist = window.localStorage.getItem(SETUP_CHECKLIST_KEY);
    if (storedChecklist) {
      try {
        const parsed = JSON.parse(storedChecklist);
        if (Array.isArray(parsed)) setChecklist(parsed.filter((item): item is string => typeof item === "string"));
      } catch {
        window.localStorage.removeItem(SETUP_CHECKLIST_KEY);
      }
    }
    const storedConfig = window.localStorage.getItem(SETUP_CONFIG_KEY);
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig) as { schoolType?: string; sessionName?: string; terms?: typeof terms; classStructure?: typeof classStructure; weights?: typeof weights; grades?: typeof grades };
        if (config.schoolType) setSchoolType(config.schoolType);
        if (config.sessionName) setSessionName(config.sessionName);
        if (config.terms) setTerms(config.terms);
        if (config.classStructure) setClassStructure(config.classStructure);
        if (config.weights) setWeights(config.weights);
        if (config.grades) setGrades(config.grades);
      } catch {
        window.localStorage.removeItem(SETUP_CONFIG_KEY);
      }
    }
    if (authenticated) {
      getServerSchoolSetup()
        .then((serverSetup) => {
          const serverStep = serverSetup.setup?.setupStep ?? 0;
          const serverChecklist = Array.isArray(serverSetup.setup?.checklist)
            ? serverSetup.setup.checklist.filter((item): item is string => typeof item === "string")
            : [];
          setStep(serverStep);
          setSavedStep(serverStep);
          setChecklist(serverChecklist);
          setLogoUrl(serverSetup.setup?.logoUrl ?? "");
        })
        .catch(() => undefined);
    }
  }, [authenticated]);

  const saveProgress = (nextStep: number) => {
    const boundedStep = Math.min(STEPS.length - 1, Math.max(0, nextStep));
    const nextSavedStep = Math.max(savedStep, boundedStep);
    setStep(boundedStep);
    setSavedStep(nextSavedStep);
    window.localStorage.setItem(SETUP_CONFIG_KEY, JSON.stringify({ schoolType, weights, grades, sessionName, terms, classStructure }));
    window.localStorage.setItem(SETUP_PROGRESS_KEY, String(nextSavedStep));
    if (authenticated) void saveServerSchoolSetup({ setupStep: nextSavedStep, logoUrl: logoUrl || undefined }).catch(() => undefined);
  };

  const chooseLogo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Logo must be smaller than 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const saveForLater = () => {
    const nextSavedStep = Math.max(savedStep, step);
    window.localStorage.setItem(SETUP_PROGRESS_KEY, String(nextSavedStep));
    setSavedStep(nextSavedStep);
    if (authenticated) {
      void saveServerSchoolSetup({ setupStep: nextSavedStep, checklist, logoUrl: logoUrl.trim() || undefined }).catch(() =>
        toast.error("Server setup save failed; local progress is still available"),
      );
    }
    toast.success("Setup progress saved", { description: "You can resume this wizard from the same step later." });
  };

  const toggleChecklist = (id: string) => {
    const nextChecklist = checklist.includes(id)
      ? checklist.filter((item) => item !== id)
      : [...checklist, id];
    setChecklist(nextChecklist);
    window.localStorage.setItem(SETUP_CHECKLIST_KEY, JSON.stringify(nextChecklist));
    if (authenticated) void saveServerSchoolSetup({ setupStep: savedStep, checklist: nextChecklist }).catch(() => undefined);
  };

  return (
    <AppShell>
      <PageHeader
        title="School setup"
        description="Configure the foundations of your school. You can revise every value later in Settings."
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "School setup" }]}
        actions={<StatusBadge tone="info">{progress}% configured</StatusBadge>}
      />

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface px-3 py-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">Setup progress</span>
              <span className="tabular text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Saved through {STEPS[savedStep]!.title.toLowerCase()}</p>
          </div>
          <ol className="space-y-1">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                onClick={() => saveProgress(i)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  i === step ? "bg-surface shadow-card ring-1 ring-border" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    i < step
                      ? "border-success bg-success text-success-foreground"
                      : i === step
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="size-3" aria-hidden /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{s.title}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            </li>
          ))}
          </ol>
        </div>

        <SectionCard title={STEPS[step]!.title} description={`Step ${step + 1} of ${STEPS.length}`}>
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sname">School name</Label>
                <Input id="sname" defaultValue={SCHOOL.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="short">Short code</Label>
                <Input id="short" defaultValue="GMC" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">School type</Label>
                <Select value={schoolType} onValueChange={(value) => { setSchoolType(value); setGrades(value === "sec" ? DEFAULT_GRADES : PRIMARY_GRADES); }}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Nursery, Primary & Secondary</SelectItem>
                    <SelectItem value="basic">Nursery & Primary</SelectItem>
                    <SelectItem value="sec">Secondary only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Select defaultValue="Lagos">
                  <SelectTrigger id="state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Lagos", "Ogun", "Oyo", "FCT Abuja", "Rivers", "Kano", "Enugu"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="addr">Address</Label>
                <Textarea id="addr" defaultValue={SCHOOL.address} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Official phone</Label>
                <Input id="phone" defaultValue="+234 803 421 7788" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mail">Official email</Label>
                <Input id="mail" type="email" defaultValue="" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="school-logo">School logo</Label>
                <Input id="school-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseLogo(event.target.files?.[0])} />
                {logoUrl && <img src={logoUrl} alt="Selected school logo" className="mt-2 size-20 rounded-md border border-border object-contain p-1" />}
                <p className="text-xs text-muted-foreground">Choose a PNG, JPG, or WebP image from this computer. Maximum size: 1.5 MB.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="session">Current academic session</Label>
                  <Input id="session" value={sessionName} onChange={(event) => setSessionName(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="term">Current term</Label>
                  <Select defaultValue="First Term">
                    <SelectTrigger id="term">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Term</th>
                      <th className="px-3 py-2 text-left font-medium">Starts</th>
                      <th className="px-3 py-2 text-left font-medium">Ends</th>
                      <th className="px-3 py-2 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {terms.map((term, index) => (
                      <tr key={term.name}>
                        <td className="px-3 py-2"><Input value={term.name} onChange={(event) => setTerms((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className="h-8" /></td>
                        <td className="px-3 py-2">
                          <Input type="date" value={term.starts} onChange={(event) => setTerms((current) => current.map((item, i) => i === index ? { ...item, starts: event.target.value } : item))} className="h-8 w-40" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="date" value={term.ends} onChange={(event) => setTerms((current) => current.map((item, i) => i === index ? { ...item, ends: event.target.value } : item))} className="h-8 w-40" />
                        </td>
                        <td className="px-3 py-2"><Button variant="ghost" size="icon" className="size-7" aria-label={`Remove ${term.name}`} onClick={() => setTerms((current) => current.filter((_, i) => i !== index))}><Trash2 className="size-3.5" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTerms((current) => [...current, { name: "New Term", starts: "", ends: "" }])}><Plus className="size-3.5" /> Add term</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add, edit, or remove the classes and arms your school actually uses.
              </p>
              <div className="space-y-2">
                {classStructure.map((item, index) => <div key={`${item.section}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_auto]"><Input value={item.section} aria-label="Section" onChange={(event) => setClassStructure((current) => current.map((row, i) => i === index ? { ...row, section: event.target.value } : row))} /><Input value={item.name} aria-label="Class" onChange={(event) => setClassStructure((current) => current.map((row, i) => i === index ? { ...row, name: event.target.value } : row))} /><Input value={item.arm} aria-label="Arm" onChange={(event) => setClassStructure((current) => current.map((row, i) => i === index ? { ...row, arm: event.target.value } : row))} /><Button variant="ghost" size="icon" aria-label={`Remove ${item.name} ${item.arm}`} onClick={() => setClassStructure((current) => current.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div>)}
              </div>
              <Button variant="outline" size="sm" onClick={() => setClassStructure((current) => [...current, { section: "Primary", name: "New Class", arm: "A" }])}><Plus className="size-3.5" /> Add class arm</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold">Assessment weighting</h3>
                <p className="text-xs text-muted-foreground">
                  Weights must total 100%. These values drive every grade book in the school.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["ca1", "CA 1"],
                      ["ca2", "CA 2"],
                      ["assignment", "Assignment"],
                      ["exam", "Exam"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key} className="text-xs">
                        {label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={key}
                          type="number"
                          className="tabular pr-7"
                          value={weights[key]}
                          onChange={(e) =>
                            setWeights({ ...weights, [key]: Number(e.target.value || 0) })
                          }
                        />
                        <span className="absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  {total === 100 ? (
                    <StatusBadge tone="success">Weighting totals 100%</StatusBadge>
                  ) : (
                    <StatusBadge tone="danger">
                      Weighting totals {total}% — adjust to exactly 100%
                    </StatusBadge>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold">Grading scale</h3>
                <p className="text-xs text-muted-foreground">{schoolType === "sec" ? "Secondary school scale" : "Nursery and primary school scale"}. Edit or remove grades to match your approved policy.</p>
                <div className="mt-3 overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Grade</th>
                        <th className="px-3 py-2 text-left font-medium">Minimum</th>
                        <th className="px-3 py-2 text-left font-medium">Maximum</th>
                        <th className="px-3 py-2 text-left font-medium">Remark</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {grades.map((gr, index) => (
                        <tr key={`${gr.grade}-${index}`}>
                          <td className="px-3 py-2"><Input value={gr.grade} onChange={(event) => setGrades((current) => current.map((row, i) => i === index ? { ...row, grade: event.target.value } : row))} className="h-8 w-20" /></td>
                          <td className="tabular px-3 py-2"><Input type="number" value={gr.min} onChange={(event) => setGrades((current) => current.map((row, i) => i === index ? { ...row, min: Number(event.target.value) } : row))} className="h-8 w-20" /></td>
                          <td className="tabular px-3 py-2"><Input type="number" value={gr.max} onChange={(event) => setGrades((current) => current.map((row, i) => i === index ? { ...row, max: Number(event.target.value) } : row))} className="h-8 w-20" /></td>
                          <td className="px-3 py-2"><Input value={gr.remark} onChange={(event) => setGrades((current) => current.map((row, i) => i === index ? { ...row, remark: event.target.value } : row))} className="h-8" /></td>
                          <td className="px-3 py-2 text-right">
                            <Button variant="ghost" size="icon" className="size-7" aria-label={`Remove ${gr.grade}`} onClick={() => setGrades((current) => current.filter((_, i) => i !== index))}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setGrades((current) => [...current, { grade: "New", min: 0, max: 0, remark: "" }])}><Plus className="size-3.5" /> Add grade</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold">Approval hierarchy</h3>
                <p className="text-xs text-muted-foreground">
                  Sensitive changes should have a named owner and a second-person approval path.
                </p>
              </div>
              {onboardedStaff.length === 0 ? <div className="rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-muted-foreground">Onboard and verify teachers and staff before configuring approval owners. Demo staff are not available here.</div> : <>
                <div className="grid gap-4 md:grid-cols-2">
                  {approvalRules.map((rule) => <div key={rule.id} className="space-y-1.5"><Label>{rule.area} approvals</Label><div className="grid gap-2 sm:grid-cols-2"><Select value={rule.primaryStaffId} onValueChange={(value) => setApprovalRules((current) => current.map((item) => item.id === rule.id ? { ...item, primaryStaffId: value } : item))}><SelectTrigger aria-label={`${rule.area} primary approver`}><SelectValue /></SelectTrigger><SelectContent>{onboardedStaff.map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select><Select value={rule.secondaryStaffId ?? "none"} onValueChange={(value) => setApprovalRules((current) => current.map((item) => item.id === rule.id ? { ...item, secondaryStaffId: value === "none" ? undefined : value } : item))}><SelectTrigger aria-label={`${rule.area} secondary approver`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No second approver</SelectItem>{onboardedStaff.filter((person) => person.id !== rule.primaryStaffId).map((person) => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}</SelectContent></Select></div></div>)}
                </div>
                <Button variant="outline" size="sm" onClick={() => { saveApprovalRules(approvalRules.map((rule) => ({ ...rule, updatedAt: new Date().toISOString() }))); toast.success("Named approval hierarchy saved"); }}>Save named approval hierarchy</Button>
              </>}
              <Separator />
              <div>
                <h3 className="text-sm font-semibold">Role access baseline</h3>
                <div className="mt-3 overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Role</th>
                        <th className="px-3 py-2 text-left font-medium">Responsibility</th>
                        <th className="px-3 py-2 text-left font-medium">Default access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {GOVERNANCE_ROLES.map(([role, responsibility, access]) => (
                        <tr key={role}>
                          <td className="px-3 py-2 font-medium">{role}</td>
                          <td className="px-3 py-2 text-muted-foreground">{responsibility}</td>
                          <td className="px-3 py-2 text-muted-foreground">{access}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
                <p className="text-sm font-medium">Audit trail enabled</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Changes to student records, marks, fees, approvals and access settings will record the actor, time and reason.
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-md border border-success/25 bg-success-soft px-4 py-3">
                <CheckCircle2 className="mt-0.5 size-5 text-success" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">Your school is ready</p>
                  <p className="text-sm text-muted-foreground">
                    Structure, session and grading are configured. Next, admit students and issue identity
                    cards.
                  </p>
                </div>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["School", SCHOOL.name],
                  ["Session", "2026/2027 · 3 terms"],
                  ["Structure", "4 sections · 15 levels · 41 arms"],
                  ["Assessment", `${total}% weighting · 9-grade scale`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-md border border-border">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold">Go-live checklist</h3>
                    <p className="text-xs text-muted-foreground">Confirm each foundation before admitting students.</p>
                  </div>
                  <StatusBadge tone={checklist.length === SETUP_CHECKLIST.length ? "success" : "warning"}>
                    {checklist.length}/{SETUP_CHECKLIST.length} complete
                  </StatusBadge>
                </div>
                <div className="divide-y divide-border">
                  {SETUP_CHECKLIST.map(([id, label]) => (
                    <label key={id} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40">
                      <Checkbox checked={checklist.includes(id)} onCheckedChange={() => toggleChecklist(id)} />
                      <span className={cn(checklist.includes(id) && "text-muted-foreground line-through")}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/people/students/new">Admit your first student</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="size-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveForLater}>Save and continue later</Button>
              <Button
                onClick={() => saveProgress(step + 1)}
                disabled={step === STEPS.length - 1}
              >
                Continue <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
