import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Plus, ShieldCheck, Lock } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState, PageHeader, RestrictedState, SectionCard } from "@/components/kit/page";
import { StatusBadge, academicTone, attendanceTone } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SCHOOL, fullName, type Student, type StudentDocument } from "@/data/school";
import {
  addGuardian,
  getStudentAuditEvents,
  getStudents,
  transferStudent,
  updateStudent,
  useStudents,
  verifyGuardian,
  withdrawStudent,
} from "@/data/student-store";
import { formatDate, initials, naira } from "@/lib/format";
import { useAcademicContext } from "@/lib/academic-context";
import { getPublishedRowsForStudent, requestCorrectionForStudent } from "@/data/gradebook-store";
import { toast } from "sonner";
import { total, waecGrade } from "@/data/academics";
import { getProfile } from "@/lib/role-profiles";
import { useRole } from "@/lib/role-context";
import {
  listServerStudentDocuments,
  transferServerStudent,
  updateServerStudent,
  uploadServerStudentDocument,
  withdrawServerStudent,
  type ServerStudentDocument,
} from "@/lib/student-api";
import {
  approveInvoice,
  canFinanceAction,
  createInvoice,
  postPayment,
  useFinanceStore,
} from "@/data/finance-store";
import {
  generateReportCard,
  getReportCardSettings,
  saveReportCardSettings,
} from "@/data/report-card-store";
import { generatedPortrait } from "@/data/report-card-store";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/people/students/$studentId")({
  loader: ({ params }) => {
    const student = getStudents().find((s) => s.id === decodeURIComponent(params.studentId));
    if (!student) throw notFound();
    return { student };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Student not found — EduCore" }, { name: "robots", content: "noindex" }],
      };
    }
    const name = fullName(loaderData.student);
    return {
      meta: [
        { title: `${name} — Student profile — EduCore` },
        {
          name: "description",
          content: `Complete record for ${name}: academics, attendance, fees, guardians and audit history.`,
        },
        { property: "og:title", content: `${name} — Student profile` },
        { property: "og:description", content: "Student record on EduCore." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: StudentProfile,
});

const TABS = [
  "Overview",
  "Personal",
  "Guardians",
  "Academic",
  "Attendance",
  "Results",
  "Fees",
  "Documents",
  "Behaviour",
  "Movement",
  "Audit",
];

const SUBJECTS = [
  { subject: "Mathematics", ca: 27, exam: 46, grade: "A1" },
  { subject: "English Language", ca: 24, exam: 41, grade: "B2" },
  { subject: "Basic Science", ca: 22, exam: 38, grade: "B3" },
  { subject: "Civic Education", ca: 26, exam: 44, grade: "A1" },
  { subject: "Business Studies", ca: 19, exam: 35, grade: "C4" },
];

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function StudentProfile() {
  const { student: initialStudent } = Route.useLoaderData() as { student: Student };
  const student = useStudents().find((item) => item.id === initialStudent.id) ?? initialStudent;
  const audit = getStudentAuditEvents(student.id);
  const { role, profileId, authenticated } = useRole();
  const linkedProfile = getProfile(role, profileId);
  const { session, term } = useAcademicContext();
  const finance = useFinanceStore();
  const canPostPayment = canFinanceAction(role, "post");
  const [tab, setTab] = useState("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const publishedResults = getPublishedRowsForStudent(student.id, session, term);
  useEffect(() => {
    if (publishedResults.length) generateReportCard(student.id, session, term);
  }, [student.id, session, term, publishedResults.length]);
  const [reportCardOpen, setReportCardOpen] = useState(false);
  const [reportAudience, setReportAudience] = useState<"Parent / guardian" | "Administrator">(
    "Administrator",
  );
  const reportSettings = getReportCardSettings();
  const [principalName, setPrincipalName] = useState(reportSettings.principalName);
  const [principalSignature, setPrincipalSignature] = useState(
    reportSettings.principalSignature ?? "",
  );
  const [schoolStamp, setSchoolStamp] = useState(reportSettings.schoolStamp ?? "");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [serverDocuments, setServerDocuments] = useState<ServerStudentDocument[] | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const canViewStudent =
    (role !== "parent" && role !== "student") || linkedProfile?.childIds.includes(student.id);
  const serverStudentId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(student.id);
  const displayedDocuments: StudentDocument[] =
    serverDocuments?.map((document) => ({
      id: document.id,
      name: document.originalFilename,
      status: document.status === "verified" ? "Uploaded" : "Pending",
      size: `${Math.ceil(document.byteSize / 1024)} KB`,
    })) ??
    student.documents ??
    [];
  useEffect(() => {
    if (!authenticated || !serverStudentId) return;
    const controller = new AbortController();
    listServerStudentDocuments(student.id, controller.signal)
      .then(setServerDocuments)
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setDocumentError(
            error instanceof Error ? error.message : "Unable to sync student documents",
          );
      });
    return () => controller.abort();
  }, [authenticated, serverStudentId, student.id]);
  if (!canViewStudent)
    return (
      <AppShell>
        <RestrictedState action="view this student record" />
      </AppShell>
    );

  async function downloadReportCard() {
    const report = document.getElementById("report-card");
    if (!report) return;
    const canvas = await html2canvas(report, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const width = 190;
    const pageHeight = 277;
    const sliceHeight = Math.floor((canvas.width * pageHeight) / width);
    for (let offset = 0, page = 0; offset < canvas.height; offset += sliceHeight, page += 1) {
      if (page > 0) pdf.addPage();
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(sliceHeight, canvas.height - offset);
      const context = slice.getContext("2d");
      if (!context) continue;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(
        canvas,
        0,
        offset,
        canvas.width,
        slice.height,
        0,
        0,
        slice.width,
        slice.height,
      );
      pdf.addImage(
        slice.toDataURL("image/png"),
        "PNG",
        10,
        10,
        width,
        (slice.height * width) / canvas.width,
        undefined,
        "FAST",
      );
    }
    pdf.save(`${student.admissionNo}-${term.toLowerCase().replaceAll(" ", "-")}-report-card.pdf`);
  }

  async function saveRecord() {
    if (!firstName.trim() || !lastName.trim()) return;
    try {
      if (authenticated && serverStudentId) {
        await updateServerStudent(student.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      } else {
        updateStudent(student.id, { firstName: firstName.trim(), lastName: lastName.trim() });
      }
      setEditOpen(false);
      toast.success("Student record updated");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to update student record");
    }
  }

  function readReportAsset(file: File, setter: (value: string) => void) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  }

  function saveGuardian() {
    if (!guardianName.trim() || !guardianRelationship.trim() || !guardianPhone.trim()) return;
    addGuardian(student.id, {
      name: guardianName.trim(),
      relationship: guardianRelationship.trim(),
      phone: guardianPhone.trim(),
    });
    setGuardianName("");
    setGuardianRelationship("");
    setGuardianPhone("");
  }

  function recordStudentPayment() {
    if (!canPostPayment) {
      toast.error("You do not have permission to post payments");
      return;
    }
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0 || amount > student.feeBalance) {
      toast.error("Enter an amount within the student's outstanding balance");
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
    }
    const result = postPayment(
      { invoiceId: invoice.id, amount, method: paymentMethod },
      role,
      student,
    );
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setPaymentAmount("");
    setPaymentOpen(false);
    toast.success(`Payment posted for ${fullName(student)}`);
  }

  async function handleWithdrawal() {
    const reason = window.prompt("Reason for withdrawal");
    const effectiveDate = window.prompt(
      "Effective date (YYYY-MM-DD)",
      new Date().toISOString().slice(0, 10),
    );
    if (!reason?.trim() || !effectiveDate) return;
    try {
      if (authenticated && serverStudentId) {
        await withdrawServerStudent(student.id, { effectiveDate, reason: reason.trim() });
      } else if (!withdrawStudent(student.id, role, effectiveDate, reason.trim())) {
        return;
      }
      toast.success("Student withdrawal recorded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to withdraw student");
    }
  }

  async function handleTransfer() {
    if (role !== "administrator" && role !== "principal") return;
    const toLevel = window.prompt("New class level", student.level);
    const toArm = window.prompt("New class arm", student.arm);
    const reason = window.prompt("Reason for transfer");
    const effectiveDate = window.prompt(
      "Effective date (YYYY-MM-DD)",
      new Date().toISOString().slice(0, 10),
    );
    if (!toLevel?.trim() || !toArm?.trim() || !reason?.trim() || !effectiveDate) return;
    try {
      if (authenticated && serverStudentId) {
        await transferServerStudent(student.id, {
          classId: toLevel.trim(),
          armId: toArm.trim(),
          effectiveDate,
          reason: reason.trim(),
        });
      } else if (!transferStudent(student.id, toLevel.trim(), toArm.trim(), role, effectiveDate, reason.trim())) {
        return;
      }
      toast.success("Student transfer recorded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to transfer student");
    }
  }

  async function uploadDocument(file: File) {
    if (authenticated && serverStudentId) {
      try {
        const uploaded = await uploadServerStudentDocument(
          student.id,
          file,
          "Student document",
          "optional",
        );
        setServerDocuments((current) => [...(current ?? []), uploaded]);
        setDocumentError(null);
        toast.success("Document uploaded to the server");
        return;
      } catch (error: unknown) {
        setDocumentError(error instanceof Error ? error.message : "Unable to sync this document");
      }
    }
    const document: StudentDocument = {
      id: `DOC-${Date.now()}`,
      name: file.name,
      size: `${Math.ceil(file.size / 1024)} KB`,
      status: "Uploaded",
    };
    updateStudent(student.id, { documents: [...(student.documents ?? []), document] });
  }

  function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => updateStudent(student.id, { photoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <AppShell>
      <PageHeader
        title={fullName(student)}
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Students", to: "/people/students" },
          { label: fullName(student) },
        ]}
        actions={
          <>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Edit record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit student record</DialogTitle>
                  <DialogDescription>
                    Update the student name shown throughout the register and profile.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-first-name">First name</Label>
                    <Input
                      id="edit-first-name"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-last-name">Surname</Label>
                    <Input
                      id="edit-last-name"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveRecord} disabled={!firstName.trim() || !lastName.trim()}>
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button asChild size="sm">
              <Link to="/people/students/ids">Identity card</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-danger">
                  Withdraw
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw {fullName(student)}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This changes the student status to Withdrawn. Their history remains available.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-danger text-danger-foreground hover:bg-danger/90"
                    onClick={handleWithdrawal}
                  >
                    Confirm withdrawal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-5 rounded-lg border border-border bg-surface p-5 shadow-card">
        <span className="flex size-16 items-center justify-center rounded-full bg-navy text-lg font-semibold text-navy-foreground">
          {initials(fullName(student))}
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{fullName(student)}</h2>
            <StatusBadge tone="success">{student.status}</StatusBadge>
            <StatusBadge tone={attendanceTone(student.attendance)}>
              {student.attendance} today
            </StatusBadge>
          </div>
          <p className="tabular text-sm text-muted-foreground">
            {student.id} · {student.level}
            {student.arm} · {student.section} · {SCHOOL.session}
          </p>
          <p className="text-xs text-muted-foreground">
            Admitted {formatDate(student.admittedOn)} · {student.house} house
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="tabular text-2xl font-semibold">{student.average}%</p>
            <p className="text-xs text-muted-foreground">
              Term average · position {student.position}
            </p>
          </div>
          <div className="rounded-md border border-border p-2">
            <QRCodeSVG
              value={`${window.location.origin}/verify?studentId=${encodeURIComponent(student.id)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`}
              size={64}
              fgColor="#101a33"
              bgColor="transparent"
            />
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="data-[state=active]:bg-surface">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Overview" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Attendance rate" value={`${student.attendanceRate}%`} />
            <Detail label="Academic status" value={student.academicStatus} />
            <Detail
              label="Fee balance"
              value={student.feeBalance > 0 ? naira(student.feeBalance) : "Cleared"}
            />
            <Detail label="Identity card" value={student.idCard.status} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Curriculum coverage" description="First Term, all subjects">
              <div className="space-y-3">
                {[
                  ["Mathematics", 82],
                  ["English Language", 74],
                  ["Basic Science", 68],
                  ["Civic Education", 91],
                ].map(([s, v]) => (
                  <div key={s as string} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{s}</span>
                      <span className="tabular text-muted-foreground">{v}%</span>
                    </div>
                    <Progress value={v as number} className="h-1.5" />
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Primary guardian">
              {student.guardians[0] ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{student.guardians[0].name}</p>
                  <p className="text-muted-foreground">
                    {student.guardians[0].relationship} · {student.guardians[0].phone}
                  </p>
                  <p className="text-muted-foreground">{student.guardians[0].email}</p>
                  <div className="pt-2">
                    <StatusBadge tone="success">
                      <ShieldCheck className="size-3" /> {student.guardians[0].verified}
                    </StatusBadge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No guardian linked yet. Add one from the Guardians tab.
                </p>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="Personal" className="mt-4">
          <SectionCard title="Personal information">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Gender" value={student.gender} />
              <Detail label="Date of birth" value={formatDate(student.dob)} />
              <Detail label="State of origin" value={student.stateOfOrigin} />
              <Detail label="LGA" value={student.lga} />
              <Detail label="Religion" value={student.religion} />
              <Detail
                label="Blood group / genotype"
                value={`${student.bloodGroup} · ${student.genotype}`}
              />
              <Detail label="Address" value={student.address} />
              <Detail label="Admission number" value={student.admissionNo} />
              <Detail label="House" value={student.house} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="Guardians" className="mt-4">
          <SectionCard
            title="Parents & guardians"
            description="Linked relationships and the permissions each guardian holds"
            action={
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4" /> Add guardian
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Add guardian</SheetTitle>
                    <SheetDescription>
                      Search for an existing guardian or create a new one. The link becomes active
                      after verification and approval.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 overflow-y-auto px-4 pb-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Search existing guardians</Label>
                      <Input placeholder="Name, phone or email" />
                    </div>
                    <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                      No match? Create a new guardian record below.
                    </div>
                    <div className="grid gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Full name</Label>
                        <Input
                          placeholder="Mrs. Ngozi Obiora"
                          value={guardianName}
                          onChange={(event) => setGuardianName(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Relationship</Label>
                        <Input
                          placeholder="Mother"
                          value={guardianRelationship}
                          onChange={(event) => setGuardianRelationship(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone</Label>
                        <Input
                          placeholder="+234 ..."
                          value={guardianPhone}
                          onChange={(event) => setGuardianPhone(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox /> Primary guardian
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox /> Financially responsible
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox defaultChecked /> Authorized for pickup
                      </label>
                    </div>
                    <ol className="space-y-1 text-xs text-muted-foreground">
                      <li>
                        1. Send verification link → 2. Guardian confirms → 3. Administrator approves
                        → 4. Active
                      </li>
                    </ol>
                    <Button
                      className="w-full"
                      onClick={saveGuardian}
                      disabled={
                        !guardianName.trim() ||
                        !guardianRelationship.trim() ||
                        !guardianPhone.trim()
                      }
                    >
                      Add guardian and send verification
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            }
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-border">
              {student.guardians.map((gd) => (
                <li key={gd.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initials(gd.name.replace(/^(Mr\.|Mrs\.)\s/, ""))}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{gd.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {gd.relationship} · {gd.phone} · {gd.email}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    {gd.primary && <StatusBadge tone="teal">Primary</StatusBadge>}
                    {gd.financiallyResponsible && <StatusBadge tone="info">Fees</StatusBadge>}
                    {gd.pickupAuthorized && <StatusBadge>Pickup</StatusBadge>}
                    <StatusBadge tone={gd.verified === "Verified" ? "success" : "warning"}>
                      {gd.verified}
                    </StatusBadge>
                    {gd.verified !== "Verified" &&
                      (role === "administrator" || role === "principal") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (verifyGuardian(student.id, gd.id, role))
                              toast.success(`${gd.name} verified`);
                          }}
                        >
                          Verify
                        </Button>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="Results" className="mt-4">
          <SectionCard
            title="First Term results"
            description={`${session} · ${term} · Published grade books only`}
            action={
              <StatusBadge tone="info">
                <Lock className="size-3" /> Locked
              </StatusBadge>
            }
            bodyClassName="p-0"
          >
            {publishedResults.length === 0 ? (
              <EmptyState
                title="No published results yet"
                description="This student will see results here after the relevant grade books have been approved and published."
              />
            ) : (
              <>
                <div className="border-b border-border bg-muted/40 px-5 py-3 text-sm">
                  These results are locked because they were published by an administrator.
                  Corrections must return through the approval workflow.
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/60 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-5 py-2.5 text-left font-medium">Subject</th>
                        <th className="px-3 py-2.5 text-right font-medium">CA1 (20)</th>
                        <th className="px-3 py-2.5 text-right font-medium">CA2 (20)</th>
                        <th className="px-3 py-2.5 text-right font-medium">Assignment (10)</th>
                        <th className="px-3 py-2.5 text-right font-medium">Exam (50)</th>
                        <th className="px-3 py-2.5 text-right font-medium">Total</th>
                        <th className="px-5 py-2.5 text-right font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {publishedResults.map((result) => {
                        const score = total(result);
                        const grade = waecGrade(score);
                        return (
                          <tr key={result.student.id}>
                            <td className="px-5 py-2.5">{result.subjectName}</td>
                            <td className="tabular px-3 py-2.5 text-right">{result.ca1}</td>
                            <td className="tabular px-3 py-2.5 text-right">{result.ca2}</td>
                            <td className="tabular px-3 py-2.5 text-right">{result.assignment}</td>
                            <td className="tabular px-3 py-2.5 text-right">{result.exam}</td>
                            <td className="tabular px-3 py-2.5 text-right font-medium">{score}</td>
                            <td className="px-5 py-2.5 text-right">
                              <StatusBadge tone={grade.tone} dot={false}>
                                {grade.grade}
                              </StatusBadge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
                  <Button size="sm" variant="outline" onClick={() => setReportCardOpen(true)}>
                    Preview report card
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReportCardOpen(true)}>
                    Print / save PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const requested = requestCorrectionForStudent(student.id);
                      toast.success(
                        requested
                          ? "Correction request sent for review"
                          : "No published result found to correct",
                      );
                    }}
                  >
                    Request correction
                  </Button>
                </div>
              </>
            )}
          </SectionCard>
          <Dialog open={reportCardOpen} onOpenChange={setReportCardOpen}>
            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report card preview</DialogTitle>
                <DialogDescription>
                  Review the official report card before printing or downloading.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Report view</p>
                <Select
                  value={reportAudience}
                  onValueChange={(value) => setReportAudience(value as typeof reportAudience)}
                >
                  <SelectTrigger className="h-8 w-44 text-xs" aria-label="Report audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrator">Administrator view</SelectItem>
                    <SelectItem value="Parent / guardian">Parent / guardian view</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="report-signatory">Authorized signatory</Label>
                  <Input
                    id="report-signatory"
                    value={principalName}
                    onChange={(event) => setPrincipalName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-signature">Upload signature or stamp</Label>
                  <Input
                    id="report-signature"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readReportAsset(file, setPrincipalSignature);
                    }}
                  />
                  {principalSignature && (
                    <img
                      src={principalSignature}
                      alt="Authorized signature"
                      className="h-10 max-w-full object-contain object-left"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-stamp">School stamp</Label>
                  <Input
                    id="report-stamp"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) readReportAsset(file, setSchoolStamp);
                    }}
                  />
                  {schoolStamp && (
                    <img
                      src={schoolStamp}
                      alt="School stamp"
                      className="size-12 object-contain object-left"
                    />
                  )}
                </div>
                <Button
                  className="sm:col-span-3 sm:justify-self-end"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    saveReportCardSettings({
                      principalName,
                      principalSignature: principalSignature || undefined,
                      schoolStamp: schoolStamp || undefined,
                    });
                    toast.success("Report-card authorization saved");
                  }}
                >
                  Save authorization
                </Button>
              </div>
              <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                <span>Authorized by {principalName || "Principal"}</span>
                <span className="flex items-center gap-2">
                  {principalSignature ? (
                    <img
                      src={principalSignature}
                      alt="Authorized signature"
                      className="h-8 max-w-24 object-contain"
                    />
                  ) : (
                    "Signature pending"
                  )}
                  {schoolStamp ? (
                    <img src={schoolStamp} alt="School stamp" className="size-10 object-contain" />
                  ) : (
                    "Stamp pending"
                  )}
                </span>
              </div>
              <article
                className="border border-slate-300 bg-white text-slate-950 print:border-0"
                id="report-card"
              >
                <header className="border-b-4 border-slate-900 px-6 py-5 text-center">
                  <p className="text-xs font-semibold tracking-[0.25em] text-slate-500 uppercase">
                    {SCHOOL.motto}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{SCHOOL.name}</h2>
                  <p className="text-xs text-slate-600">{SCHOOL.address}</p>
                  <h3 className="mt-4 text-lg font-bold tracking-wide uppercase">
                    Student Report Card
                  </h3>
                  <p className="text-sm text-slate-600">
                    {session} · {term}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-4 border-t border-slate-200 pt-3 text-xs">
                    <span>Authorized by {principalName || "Principal"}</span>
                    {principalSignature ? (
                      <img
                        src={principalSignature}
                        alt="Authorized signature"
                        className="h-8 max-w-28 object-contain"
                      />
                    ) : (
                      <span>Signature pending</span>
                    )}
                    {schoolStamp ? (
                      <img
                        src={schoolStamp}
                        alt="School stamp"
                        className="size-12 object-contain"
                      />
                    ) : (
                      <span>Stamp pending</span>
                    )}
                  </div>
                </header>
                <div className="grid gap-3 border-b border-slate-200 px-6 py-4 text-sm sm:grid-cols-[88px_1fr_1fr_1fr]">
                  <div className="row-span-2 flex size-20 items-center justify-center overflow-hidden border border-slate-300 bg-slate-100">
                    <img
                      src={generatedPortrait(student)}
                      alt={`${fullName(student)} student portrait`}
                      className="size-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Student</p>
                    <p className="font-semibold">{fullName(student)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Admission number</p>
                    <p className="font-semibold">{student.admissionNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Class</p>
                    <p className="font-semibold">
                      {student.level}
                      {student.arm}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Audience</p>
                    <p className="font-semibold">{reportAudience}</p>
                  </div>
                </div>
                <div className="overflow-x-auto px-6 py-4">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-left">
                        <th className="py-2">Subject</th>
                        <th className="py-2 text-right">CA1 (20)</th>
                        <th className="py-2 text-right">CA2 (20)</th>
                        <th className="py-2 text-right">Assignment (10)</th>
                        <th className="py-2 text-right">Exam (50)</th>
                        <th className="py-2 text-right">Total</th>
                        <th className="py-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publishedResults.map((result) => {
                        const score = total(result);
                        const grade = waecGrade(score);
                        return (
                          <tr key={result.subjectName} className="border-b border-slate-200">
                            <td className="py-2">{result.subjectName}</td>
                            <td className="py-2 text-right">{result.ca1}</td>
                            <td className="py-2 text-right">{result.ca2}</td>
                            <td className="py-2 text-right">{result.assignment}</td>
                            <td className="py-2 text-right">{result.exam}</td>
                            <td className="py-2 text-right font-semibold">{score}</td>
                            <td className="py-2 text-right font-semibold">{grade.grade}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 border-t border-slate-200 px-6 py-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Attendance</p>
                    <p className="font-semibold">{student.attendanceRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Academic standing</p>
                    <p className="font-semibold">{student.academicStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Position</p>
                    <p className="font-semibold">{student.position}</p>
                  </div>
                </div>
                <footer className="grid gap-6 border-t border-slate-200 px-6 py-5 text-xs sm:grid-cols-3">
                  <div className="border-t border-slate-700 pt-2">Form teacher signature</div>
                  <div className="border-t border-slate-700 pt-2">Principal signature</div>
                  <div className="flex items-start gap-3">
                    <QRCodeSVG
                      value={`educore:verify:${student.id}:${session}:${term}`}
                      size={54}
                      fgColor="#0f172a"
                    />
                    <div>
                      <p className="font-semibold">Official verification</p>
                      <p className="mt-1 text-slate-600">Record: {student.id}</p>
                      <p className="text-slate-600">Issued: {new Date().toLocaleString()}</p>
                      <p className="text-slate-600">Location: {SCHOOL.address}</p>
                      <p className="mt-1 font-semibold text-emerald-700">Issued by EduCore</p>
                    </div>
                  </div>
                </footer>
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-[10px] text-slate-500">
                  <span>
                    Security reference: {student.id} · {session} · {term}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-full border-2 border-slate-400 text-center text-[7px] font-bold uppercase opacity-70">
                    {SCHOOL.shortName}
                    <br />
                    Secure
                  </span>
                </div>
              </article>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}>
                  Print report card
                </Button>
                <Button onClick={downloadReportCard}>Download report card</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="Fees" className="mt-4">
          <SectionCard title="Fees and payments">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Detail label="Expected this term" value={naira(student.feeExpected)} />
                <Detail label="Paid" value={naira(student.feeExpected - student.feeBalance)} />
                <Detail
                  label="Balance"
                  value={student.feeBalance > 0 ? naira(student.feeBalance) : "Cleared"}
                />
              </div>
              {canPostPayment && student.feeBalance > 0 && (
                <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                  <Button onClick={() => setPaymentOpen(true)}>
                    <Plus className="size-4" /> Record payment
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record payment for {fullName(student)}</DialogTitle>
                      <DialogDescription>
                        Outstanding balance: {naira(student.feeBalance)} · {session} · {term}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="profile-payment-amount">Amount</Label>
                        <Input
                          id="profile-payment-amount"
                          type="number"
                          min="0"
                          max={student.feeBalance}
                          step="1000"
                          value={paymentAmount}
                          onChange={(event) => setPaymentAmount(event.target.value)}
                          placeholder="e.g. 25000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={recordStudentPayment} disabled={!paymentAmount}>
                        Post payment
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="Audit" className="mt-4">
          <SectionCard title="Record history" bodyClassName="p-0">
            <ol className="divide-y divide-border">
              {audit.length === 0 ? (
                <li className="px-5 py-6 text-sm text-muted-foreground">
                  No recorded events for this student yet.
                </li>
              ) : (
                audit.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-1.5 size-1.5 rounded-full bg-teal" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.actor} · {formatDate(a.occurredAt)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </SectionCard>
        </TabsContent>

        {["Academic", "Attendance", "Behaviour", "Movement"].map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <SectionCard bodyClassName="p-0">
              {t === "Movement" && (role === "administrator" || role === "principal") ? (
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-sm font-semibold">Transfer or movement</h3>
                    <p className="text-sm text-muted-foreground">
                      Record a class or arm transfer with an effective date and reason. The action
                      is added to the student history.
                    </p>
                  </div>
                  <Button onClick={handleTransfer}>Record transfer</Button>
                </div>
              ) : (
                <EmptyState
                  title={`No ${t.toLowerCase()} records yet`}
                  description={`${t} information for this student will appear here once the module is in use for the current term.`}
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link to="/dashboard">Back to dashboard</Link>
                    </Button>
                  }
                />
              )}
            </SectionCard>
          </TabsContent>
        ))}
        <TabsContent value="Documents" className="mt-4">
          <SectionCard
            title="Student documents"
            description="Upload and track documents attached to this student record."
          >
            <div className="space-y-2">
              {documentError && (
                <p className="text-sm text-danger">
                  {documentError} Local draft storage remains available.
                </p>
              )}
              {displayedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">{document.name}</span>
                  <span className="text-xs text-success">
                    {document.status} · {document.size}
                  </span>
                </div>
              ))}
              {displayedDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              )}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Label htmlFor="student-photo" className="text-xs">
                Passport photograph
              </Label>
              <Input
                id="student-photo"
                type="file"
                accept="image/*"
                className="mt-1.5"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadPhoto(file);
                  event.target.value = "";
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This photograph appears on the official report card and identity card.
              </p>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Label htmlFor="student-document" className="text-xs">
                Upload document
              </Label>
              <Input
                id="student-document"
                type="file"
                className="mt-1.5"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadDocument(file);
                  event.target.value = "";
                }}
              />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
