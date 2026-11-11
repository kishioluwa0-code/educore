import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, FileUp, Save } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createStudent } from "@/data/student-store";
import { STUDENTS, type Student } from "@/data/school";
import { createServerStudent, uploadServerStudentDocument } from "@/lib/student-api";
import { useRole } from "@/lib/role-context";
import { toast } from "sonner";

export const Route = createFileRoute("/people/students/new")({
  head: () => ({
    meta: [
      { title: "New admission — EduCore" },
      {
        name: "description",
        content: "Six-step admission wizard: personal details, guardians, academic placement, documents, review and confirmation.",
      },
      { property: "og:title", content: "New admission — EduCore" },
      { property: "og:description", content: "Admit a student and issue their ID and QR identity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdmissionWizard,
});

const STEPS = ["Personal information", "Parent / guardian", "Academic information", "Documents", "Review", "Confirmation"];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
    </div>
  );
}

function AdmissionWizard() {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("Chinaza");
  const [lastName, setLastName] = useState("Obiora");
  const [otherName, setOtherName] = useState("");
  const [gender, setGender] = useState<Student["gender"]>("Female");
  const [dob, setDob] = useState("2014-05-12");
  const [section, setSection] = useState<Student["section"]>("Junior Secondary");
  const [level, setLevel] = useState("JSS 1");
  const [arm, setArm] = useState("A");
  const [religion, setReligion] = useState("Christianity");
  const [stateOfOrigin, setStateOfOrigin] = useState("Anambra");
  const [lga, setLga] = useState("Onitsha North");
  const [address, setAddress] = useState("24 Ogunlana Drive, Surulere, Lagos");
  const [genotype, setGenotype] = useState("AA");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [guardianName, setGuardianName] = useState("Mr. Emeka Obiora");
  const [guardianRelationship, setGuardianRelationship] = useState("Father");
  const [guardianPhone, setGuardianPhone] = useState("+234 803 442 9111");
  const [guardianEmail, setGuardianEmail] = useState("e.obiora@mail.com");
  const [guardianAddress, setGuardianAddress] = useState("24 Ogunlana Drive, Surulere");
  const [guardianOccupation, setGuardianOccupation] = useState("Civil Engineer");
  const [primaryGuardian, setPrimaryGuardian] = useState(true);
  const [financiallyResponsible, setFinanciallyResponsible] = useState(true);
  const [pickupAuthorized, setPickupAuthorized] = useState(true);
  const [admissionType, setAdmissionType] = useState<Student["admissionType"]>("Fresh admission");
  const [previousSchool, setPreviousSchool] = useState("");
  const [house, setHouse] = useState("Emerald");
  const [documents, setDocuments] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File>>({});
  const [touchedNext, setTouchedNext] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { authenticated } = useRole();

  useEffect(() => {
    const saved = window.localStorage.getItem("educore.admission-draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as Partial<{
        firstName: string;
        lastName: string;
        otherName: string;
        gender: Student["gender"];
        dob: string;
        section: Student["section"];
        level: string;
        arm: string;
        religion: string;
        stateOfOrigin: string;
        lga: string;
        address: string;
        genotype: string;
        bloodGroup: string;
        guardianName: string;
        guardianRelationship: string;
        guardianPhone: string;
        guardianEmail: string;
        guardianAddress: string;
        guardianOccupation: string;
        primaryGuardian: boolean;
        financiallyResponsible: boolean;
        pickupAuthorized: boolean;
        admissionType: Student["admissionType"];
        previousSchool: string;
        house: string;
        documents: string[];
        step: number;
      }>;
      if (draft.firstName) setFirstName(draft.firstName);
      if (draft.lastName) setLastName(draft.lastName);
      if (draft.otherName) setOtherName(draft.otherName);
      if (draft.gender) setGender(draft.gender);
      if (draft.dob) setDob(draft.dob);
      if (draft.section) setSection(draft.section);
      if (draft.level) setLevel(draft.level);
      if (draft.arm) setArm(draft.arm);
      if (draft.religion) setReligion(draft.religion);
      if (draft.stateOfOrigin) setStateOfOrigin(draft.stateOfOrigin);
      if (draft.lga) setLga(draft.lga);
      if (draft.address) setAddress(draft.address);
      if (draft.genotype) setGenotype(draft.genotype);
      if (draft.bloodGroup) setBloodGroup(draft.bloodGroup);
      if (draft.guardianName) setGuardianName(draft.guardianName);
      if (draft.guardianRelationship) setGuardianRelationship(draft.guardianRelationship);
      if (draft.guardianPhone) setGuardianPhone(draft.guardianPhone);
      if (draft.guardianEmail) setGuardianEmail(draft.guardianEmail);
      if (draft.guardianAddress) setGuardianAddress(draft.guardianAddress);
      if (draft.guardianOccupation) setGuardianOccupation(draft.guardianOccupation);
      if (typeof draft.primaryGuardian === "boolean") setPrimaryGuardian(draft.primaryGuardian);
      if (typeof draft.financiallyResponsible === "boolean") setFinanciallyResponsible(draft.financiallyResponsible);
      if (typeof draft.pickupAuthorized === "boolean") setPickupAuthorized(draft.pickupAuthorized);
      if (draft.admissionType) setAdmissionType(draft.admissionType);
      if (draft.previousSchool) setPreviousSchool(draft.previousSchool);
      if (draft.house) setHouse(draft.house);
      if (draft.documents) setDocuments(draft.documents);
      if (typeof draft.step === "number") setStep(Math.min(4, Math.max(0, draft.step)));
      setDraftSaved(true);
    } catch {
      window.localStorage.removeItem("educore.admission-draft");
    }
  }, []);

  const nameValid = firstName.trim() !== "" && lastName.trim() !== "";
  const requiredDocumentsComplete = ["Birth certificate", "Passport photograph"].every((document) => documents.includes(document));

  function saveDraft() {
    window.localStorage.setItem(
      "educore.admission-draft",
      JSON.stringify({ firstName, lastName, otherName, gender, dob, section, level, arm, religion, stateOfOrigin, lga, address, genotype, bloodGroup, guardianName, guardianRelationship, guardianPhone, guardianEmail, guardianAddress, guardianOccupation, primaryGuardian, financiallyResponsible, pickupAuthorized, admissionType, previousSchool, house, documents, step }),
    );
    setDraftSaved(true);
  }

  async function submitAdmission() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const localInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      otherName: otherName.trim() || undefined,
      gender,
      dob,
      section,
      level,
      arm,
      religion,
      stateOfOrigin,
      lga,
      address,
      status: "Pending approval",
      genotype,
      bloodGroup,
      admissionType,
      previousSchool: previousSchool.trim() || undefined,
      house,
      guardians: guardianName.trim() && guardianPhone.trim() ? [{ id: `GRD-${Date.now()}`, name: guardianName.trim(), relationship: guardianRelationship, phone: guardianPhone.trim(), email: guardianEmail, occupation: guardianOccupation, verified: "Pending", primary: primaryGuardian, financiallyResponsible, pickupAuthorized, address: guardianAddress }] : [],
      documents: documents.map((name, index) => ({ id: `DOC-${Date.now()}-${index}`, name, status: "Uploaded" as const })),
      documentsComplete: documents.includes("Birth certificate") && documents.includes("Passport photograph"),
    };

    try {
      if (authenticated) {
        const serverStudent = await createServerStudent({
          admissionNo: `ADM-${new Date().getFullYear()}-${Date.now()}`,
          firstName: localInput.firstName,
          middleName: localInput.otherName,
          lastName: localInput.lastName,
          dateOfBirth: localInput.dob,
          gender: localInput.gender,
          classId: localInput.level,
          armId: localInput.arm,
          session: "2026/2027",
        });
        const requiredFiles = [
          ["Birth certificate", "birth_certificate"],
          ["Passport photograph", "passport_photo"],
        ] as const;
        for (const [documentType, requirementKey] of requiredFiles) {
          const file = documentFiles[documentType];
          if (!file) throw new Error(`${documentType} must be selected again before submission`);
          await uploadServerStudentDocument(serverStudent.id, file, documentType, requirementKey);
        }
        setCreatedStudent({
          ...STUDENTS[0]!,
          ...localInput,
          id: serverStudent.id,
          admissionNo: serverStudent.admissionNo,
          status: "Pending approval",
        });
      } else {
        setCreatedStudent(createStudent(localInput));
      }
      window.localStorage.removeItem("educore.admission-draft");
      setStep(5);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to submit this admission";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="New admission"
        description="Complete each step. Your progress is saved as a draft so nothing is lost."
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Students", to: "/people/students" },
          { label: "New admission" },
        ]}
        actions={<StatusBadge tone="info">Draft · last saved 2 minutes ago</StatusBadge>}
      />

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-card">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "tabular flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                i < step
                  ? "border-success bg-success text-success-foreground"
                  : i === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-xs", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" aria-hidden />}
          </li>
        ))}
      </ol>

      <SectionCard title={STEPS[step]!} description={`Step ${step + 1} of ${STEPS.length}`}>
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="First name" required>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-invalid={touchedNext && !firstName} />
              {touchedNext && !firstName && <p className="text-xs text-danger">First name is required.</p>}
            </Field>
            <Field label="Surname" required>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} aria-invalid={touchedNext && !lastName} />
            </Field>
            <Field label="Other names">
              <Input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Gender" required>
              <Select value={gender} onValueChange={(value) => setGender(value as Student["gender"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth" required>
              <Input type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
            </Field>
            <Field label="Religion">
              <Select value={religion} onValueChange={setReligion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Christianity">Christianity</SelectItem>
                  <SelectItem value="Islam">Islam</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="State of origin" required>
              <Select value={stateOfOrigin} onValueChange={setStateOfOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Anambra", "Lagos", "Ogun", "Kano", "Rivers", "Enugu"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Local government area">
              <Input value={lga} onChange={(event) => setLga(event.target.value)} />
            </Field>
            <Field label="Genotype / blood group">
              <div className="grid grid-cols-2 gap-2">
                <Input value={genotype} onChange={(e) => setGenotype(e.target.value)} placeholder="AA" aria-label="Genotype" />
                <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="O+" aria-label="Blood group" />
              </div>
            </Field>
            <div className="md:col-span-3">
              <Field label="Residential address" required>
                <Textarea rows={2} value={address} onChange={(event) => setAddress(event.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Guardian full name" required>
                <Input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} />
              </Field>
              <Field label="Relationship" required>
                <Select value={guardianRelationship} onValueChange={setGuardianRelationship}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Father", "Mother", "Uncle", "Aunt", "Legal guardian"].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Occupation">
                <Input value={guardianOccupation} onChange={(event) => setGuardianOccupation(event.target.value)} />
              </Field>
              <Field label="Phone number" required>
                <Input value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} />
              </Field>
              <Field label="Email address">
                <Input type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} />
              </Field>
              <Field label="Address">
                <Input value={guardianAddress} onChange={(event) => setGuardianAddress(event.target.value)} />
              </Field>
            </div>
            <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={primaryGuardian} onCheckedChange={(checked) => setPrimaryGuardian(checked === true)} /> Primary guardian</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={financiallyResponsible} onCheckedChange={(checked) => setFinanciallyResponsible(checked === true)} /> Financially responsible</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={pickupAuthorized} onCheckedChange={(checked) => setPickupAuthorized(checked === true)} /> Authorized for pickup</label>
            </div>
            <p className="text-xs text-muted-foreground">
              A verification link will be sent to the guardian. The relationship becomes active only after
              verification and administrator approval.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Section" required>
              <Select value={section} onValueChange={(value) => setSection(value as Student["section"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Nursery", "Primary", "Junior Secondary", "Senior Secondary"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class / level" required>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Arm" required>
              <Select value={arm} onValueChange={setArm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["A", "B", "C"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Admission type">
              <Select value={admissionType} onValueChange={(value) => setAdmissionType(value as Student["admissionType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresh admission">Fresh admission</SelectItem>
                  <SelectItem value="Transfer">Transfer from another school</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Previous school">
              <Input value={previousSchool} onChange={(event) => setPreviousSchool(event.target.value)} placeholder="If applicable" />
            </Field>
            <Field label="House">
              <Select value={house} onValueChange={setHouse}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Ruby", "Emerald", "Sapphire", "Topaz"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {[
              ["Birth certificate", true],
              ["Passport photograph", true],
              ["Previous result / transfer certificate", false],
              ["Immunisation record", false],
            ].map(([doc, required]) => (
              <div
                key={doc as string}
                className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border px-4 py-3"
              >
                <FileUp className="size-4 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium">{doc}</span>
                {required ? (
                  <StatusBadge tone="warning">Required</StatusBadge>
                ) : (
                  <StatusBadge>Optional</StatusBadge>
                )}
                <Input type="file" className="ml-auto h-9 w-full max-w-xs text-xs" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setDocumentFiles((current) => ({ ...current, [doc as string]: file })); setDocuments((current) => [...current.filter((name) => name !== doc), doc as string]); } }} />
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Student", `${[firstName, otherName, lastName].filter(Boolean).join(" ")} · ${gender} · ${dob}`],
              ["Placement", `${section} · ${level}${arm} · ${house} house`],
              ["Primary guardian", guardianName ? `${guardianName} (${guardianRelationship}) · ${guardianPhone}` : "No guardian provided"],
              ["Documents", `${documents.length} of 4 uploaded · ${documents.filter((document) => ["Birth certificate", "Passport photograph"].includes(document)).length} required documents provided`],
              ["Fees", `Standard ${section} billing will be raised on approval`],
              ["Approval", admissionType === "Transfer" ? "Requires transfer record review and administrator approval" : "Requires administrator approval"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-success/25 bg-success-soft px-4 py-3">
                <CheckCircle2 className="mt-0.5 size-5 text-success" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">
                    {firstName} {lastName} has been admitted
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Student record, identity number and QR identity have been generated.
                  </p>
                </div>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Admission number", createdStudent?.admissionNo ?? "Generated on submission"],
                  ["Student ID", createdStudent?.id ?? "Generated on submission"],
                  ["Class placement", `${level}${arm}`],
                  ["Session", "2026/2027 · First Term"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-border px-3 py-2.5">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="tabular text-sm font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/people/students/ids">Issue identity card</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/people/students">Back to student register</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-muted/40 p-5">
              <QRCodeSVG
                value={`educore:student:${createdStudent?.id ?? "pending"}`}
                size={132}
                bgColor="transparent"
                fgColor="#101a33"
              />
              <p className="tabular text-xs text-muted-foreground">{createdStudent?.id}</p>
              <p className="max-w-[160px] text-center text-[11px] text-muted-foreground">
                QR encodes the record reference only — no personal data.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={step === STEPS.length - 1}>
              <Save className="size-4" /> Save draft
            </Button>
            <Button
              disabled={step === STEPS.length - 1 || submitting}
              onClick={() => {
                setTouchedNext(true);
                if (step === 0 && !nameValid) return;
                if (step === 4) {
                  if (!requiredDocumentsComplete) {
                    toast.error("Required documents are missing", { description: "Upload the birth certificate and passport photograph before submitting." });
                    return;
                  }
                  void submitAdmission();
                  return;
                }
                setStep((s) => Math.min(STEPS.length - 1, s + 1));
              }}
            >
              {step === 4 ? "Submit admission" : "Continue"} <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        {submitError && <p className="text-xs text-danger" role="alert">{submitError} Your draft remains saved on this device.</p>}
        {draftSaved && step < STEPS.length - 1 && (
          <p className="text-xs text-success" role="status">Draft saved on this device.</p>
        )}
      </SectionCard>
    </AppShell>
  );
}
