import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileUp } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStaffRecord, saveStaffRecord, type StaffDocument, type StaffRecord } from "@/data/staff-store";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/people/staff/new")({
  head: () => ({ meta: [{ title: "Onboard staff — EduCore" }, { name: "description", content: "Guided teacher and non-teaching staff onboarding." }, { name: "robots", content: "noindex" }] }),
  component: StaffOnboarding,
});

const STEPS = ["Identity", "Role & employment", "Qualifications", "HR & payroll", "Documents", "Review"];
const departments = ["Academics", "Administration", "Finance", "Operations", "Examinations", "Student services"];

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label} {required && <span className="text-danger">*</span>}</Label>{children}</div>;
}

function StaffOnboarding() {
  const navigate = useNavigate();
  const { role } = useRole();
  const canCreate = role === "administrator" || role === "principal" || role === "hr";
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [staffType, setStaffType] = useState<"Teaching" | "Non-teaching">("Teaching");
  const [department, setDepartment] = useState("Academics");
  const [jobTitle, setJobTitle] = useState("Primary Teacher");
  const [employmentType, setEmploymentType] = useState<StaffRecord["employmentType"]>("Full-time");
  const [employmentStart, setEmploymentStart] = useState(new Date().toISOString().slice(0, 10));
  const [contractEnd, setContractEnd] = useState("");
  const [lineManager, setLineManager] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [salary, setSalary] = useState("");
  const [qualification, setQualification] = useState("");
  const [qualificationInstitution, setQualificationInstitution] = useState("");
  const [certificationNumber, setCertificationNumber] = useState("");
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [created, setCreated] = useState<StaffRecord | null>(null);

  function addDocument(file: File, category: StaffDocument["category"]) {
    setDocuments((current) => [...current, { id: `DOC-${Date.now()}`, name: file.name, category, size: file.size, uploadedAt: new Date().toISOString(), status: "Uploaded" }]);
  }

  function validCurrentStep() {
    if (step === 0) return Boolean(name.trim() && email.trim() && phone.trim());
    if (step === 1) return Boolean(department && jobTitle.trim() && employmentStart);
    if (step === 2) return Boolean(qualification.trim() && qualificationInstitution.trim());
    if (step === 4) return documents.some((document) => document.category === "Certificate");
    return true;
  }

  function submit() {
    if (!canCreate || !validCurrentStep()) return;
    const staff = createStaffRecord({ name: name.trim(), role: staffType === "Teaching" ? "Teacher" : "Non-teaching staff", dept: department, email: email.trim(), phone: phone.trim(), employmentType, jobTitle: jobTitle.trim(), employmentStart, qualification: qualification.trim() }, role);
    if (!staff) { toast.error("Complete the required onboarding fields"); return; }
    const updated = saveStaffRecord(staff.id, { address: address.trim(), emergencyContact: emergencyContact.trim(), contractEnd: contractEnd || undefined, lineManager: lineManager.trim(), qualificationInstitution: qualificationInstitution.trim(), certificationNumber: certificationNumber.trim() || undefined, documents, documentsComplete: documents.length > 0, payroll: bankName.trim() || accountNumber.trim() || salary ? { bankName: bankName.trim(), accountNumber: accountNumber.trim(), salary: Number(salary) || 0, currency: "NGN", frequency: "Monthly", effectiveFrom: employmentStart } : undefined }, role);
    if (!updated) { toast.error("Staff record could not be completed"); return; }
    setCreated(updated);
    toast.success("Staff onboarding submitted for verification");
  }

  if (!canCreate) return <AppShell><SectionCard className="mt-6" title="Restricted access"><p className="text-sm text-muted-foreground">Only HR, administrators, and principals can onboard staff.</p></SectionCard></AppShell>;
  if (created) return <AppShell><PageHeader title="Onboarding submitted" breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "People", to: "/people" }, { label: "Onboard staff" }]} /><SectionCard className="mt-6" title={created.name} description="The staff profile is pending verification before it can receive teaching or operational assignments."><div className="flex flex-wrap items-center gap-3"><StatusBadge tone="warning">Pending verification</StatusBadge><span className="text-sm text-muted-foreground">{created.id} · {created.role} · {created.dept}</span></div><div className="mt-6 flex gap-2"><Button asChild><Link to="/people">Return to People</Link></Button><Button variant="outline" onClick={() => navigate({ to: "/people/staff/new" })}>Onboard another</Button></div></SectionCard></AppShell>;

  return <AppShell><PageHeader title="Onboard staff" description="Create a teacher or non-teaching staff profile in six short steps. New records require HR verification before activation." breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "People", to: "/people" }, { label: "Onboard staff" }]} actions={<StatusBadge tone="info">Step {step + 1} of {STEPS.length}</StatusBadge>} /><ol className="mt-6 flex flex-wrap gap-3 rounded-lg border border-border bg-surface p-4">{STEPS.map((label, index) => <li key={label} className="flex items-center gap-2 text-xs"><span className={`flex size-6 items-center justify-center rounded-full border ${index < step ? "border-success bg-success text-success-foreground" : index === step ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{index < step ? <Check className="size-3" /> : index + 1}</span><span className={index === step ? "font-medium" : "text-muted-foreground"}>{label}</span></li>)}</ol><SectionCard className="mt-4" title={STEPS[step]} description="Required fields are marked with an asterisk."><div className="grid gap-4 sm:grid-cols-2">{step === 0 && <><Field label="Full legal name" required><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Mrs. Ada Nwosu" /></Field><Field label="Work email" required><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@school.edu.ng" /></Field><Field label="Phone number" required><Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234 ..." /></Field><Field label="Home address"><Input value={address} onChange={(event) => setAddress(event.target.value)} /></Field><Field label="Emergency contact"><Input value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} placeholder="Name and phone" /></Field></>}{step === 1 && <><Field label="Staff category" required><Select value={staffType} onValueChange={(value) => { const next = value as typeof staffType; setStaffType(next); if (next === "Non-teaching") { setDepartment("Administration"); setJobTitle("Support staff"); } else { setDepartment("Academics"); setJobTitle("Primary Teacher"); } }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Teaching">Teaching staff</SelectItem><SelectItem value="Non-teaching">Non-teaching staff</SelectItem></SelectContent></Select></Field><Field label="Department" required><Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Job title" required><Input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} /></Field><Field label="Employment type"><Select value={employmentType} onValueChange={(value) => setEmploymentType(value as StaffRecord["employmentType"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Part-time">Part-time</SelectItem><SelectItem value="Contract">Contract</SelectItem></SelectContent></Select></Field><Field label="Employment start" required><Input type="date" value={employmentStart} onChange={(event) => setEmploymentStart(event.target.value)} /></Field><Field label="Contract end"><Input type="date" value={contractEnd} onChange={(event) => setContractEnd(event.target.value)} /></Field><Field label="Line manager"><Input value={lineManager} onChange={(event) => setLineManager(event.target.value)} /></Field></>}{step === 2 && <><Field label="Highest qualification" required><Input value={qualification} onChange={(event) => setQualification(event.target.value)} placeholder="e.g. B.Ed Mathematics" /></Field><Field label="Institution" required><Input value={qualificationInstitution} onChange={(event) => setQualificationInstitution(event.target.value)} placeholder="College or university" /></Field><Field label="Teaching certificate/license number"><Input value={certificationNumber} onChange={(event) => setCertificationNumber(event.target.value)} /></Field></>}{step === 3 && <><Field label="Bank name"><Input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Payroll bank" /></Field><Field label="Account number"><Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} /></Field><Field label="Monthly salary (NGN)"><Input type="number" min="0" value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="Restricted HR field" /></Field><p className="text-xs text-muted-foreground sm:col-span-2">Payroll details are restricted to HR and authorized Finance users.</p></>}{step === 4 && <div className="space-y-4 sm:col-span-2"><p className="text-sm text-muted-foreground">Upload at least one certificate. Files are stored as onboarding metadata until secure server storage is connected.</p><div className="grid gap-3 sm:grid-cols-3"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-sm hover:bg-muted"><FileUp className="size-4" /> Certificate<input hidden type="file" accept=".pdf,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) addDocument(file, "Certificate"); event.target.value = ""; }} /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-sm hover:bg-muted"><FileUp className="size-4" /> Identity<input hidden type="file" accept=".pdf,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) addDocument(file, "Identity"); event.target.value = ""; }} /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-sm hover:bg-muted"><FileUp className="size-4" /> Employment letter<input hidden type="file" accept=".pdf,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) addDocument(file, "Employment"); event.target.value = ""; }} /></label></div><div className="divide-y divide-border rounded-md border border-border">{documents.map((document) => <div key={document.id} className="flex items-center justify-between px-3 py-2 text-sm"><span>{document.name}</span><span className="text-xs text-muted-foreground">{document.category} · {Math.ceil(document.size / 1024)} KB</span></div>)}{documents.length === 0 && <p className="p-4 text-sm text-muted-foreground">No documents uploaded yet.</p>}</div></div>}{step === 5 && <div className="space-y-3 text-sm sm:col-span-2"><p><strong>Name:</strong> {name}</p><p><strong>Category:</strong> {staffType} · {jobTitle}</p><p><strong>Department:</strong> {department}</p><p><strong>Employment:</strong> {employmentType} from {employmentStart}</p><p><strong>Qualification:</strong> {qualification} · {qualificationInstitution}</p><p><strong>Payroll:</strong> {salary ? "Entered and restricted" : "Not entered"}</p><p><strong>Documents:</strong> {documents.length} uploaded</p><div className="rounded-md border border-warning/30 bg-warning-soft/40 p-3 text-xs text-muted-foreground">Submit creates a `Pending verification` profile. HR must verify the certificate and documents before the profile can become Active.</div></div>}</div><div className="mt-6 flex justify-between border-t border-border pt-4"><Button variant="outline" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ChevronLeft className="size-4" /> Back</Button>{step < STEPS.length - 1 ? <Button onClick={() => validCurrentStep() ? setStep((value) => value + 1) : toast.error("Complete the required fields before continuing")}><ChevronRight className="size-4" /> Next</Button> : <Button onClick={submit}><Check className="size-4" /> Submit onboarding</Button>}</div></SectionCard></AppShell>;
}
