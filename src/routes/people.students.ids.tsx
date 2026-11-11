import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, RefreshCw, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SCHOOL, fullName } from "@/data/school";
import { deactivateIdentityCard, issueIdentityCard, useStudents } from "@/data/student-store";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/people/students/ids")({
  head: () => ({
    meta: [
      { title: "Identity cards — EduCore" },
      { name: "description", content: "Generate, preview, print and revoke student identity cards with QR identity." },
      { property: "og:title", content: "Identity cards — EduCore" },
      { property: "og:description", content: "Student ID and QR identity management with bulk generation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IdCards,
});

function IdCards() {
  const students = useStudents();
  const [selected, setSelected] = useState<string[]>([]);
  const previewStudent = students.find((student) => student.id === selected[0]) ?? students[0]!;

  function downloadCard(student = previewStudent) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${fullName(student)} identity card</title></head><body><h1>${SCHOOL.name}</h1><h2>${fullName(student)}</h2><p>Student ID: ${student.id}</p><p>Class: ${student.level}${student.arm}</p><p>Session: ${SCHOOL.session}</p><p>QR reference: educore:student:${student.id}</p></body></html>`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    link.download = `${student.admissionNo}-identity-card.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function generateSelected() {
    selected.forEach((studentId) => issueIdentityCard(studentId));
    setSelected([]);
  }

  return (
    <AppShell>
      <PageHeader
        title="Identity cards"
        description="Issue and manage identity cards for students. QR codes encode a record reference only."
        breadcrumbs={[
          { label: "EduCore", to: "/dashboard" },
          { label: "Students", to: "/people/students" },
          { label: "Identity cards" },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={selected.length === 0}>
              <Printer className="size-4" /> Print selected
            </Button>
            <Button size="sm" disabled={selected.length === 0} onClick={generateSelected}>
              Generate {selected.length || ""} card{selected.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SectionCard title="Card register" description="Select students to generate cards in bulk" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/70 text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2.5" />
                  <th className="px-3 py-2.5 text-left font-medium">Student</th>
                  <th className="px-3 py-2.5 text-left font-medium">Class</th>
                  <th className="px-3 py-2.5 text-left font-medium">Card status</th>
                  <th className="px-3 py-2.5 text-left font-medium">Serial</th>
                  <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={selected.includes(s.id)}
                        aria-label={`Select ${fullName(s)}`}
                        onCheckedChange={(v) =>
                          setSelected(v ? [...selected, s.id] : selected.filter((x) => x !== s.id))
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{fullName(s)}</span>
                      <span className="tabular block text-xs text-muted-foreground">{s.id}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {s.level}
                      {s.arm}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={s.idCard.status === "Active" ? "success" : "warning"}>
                        {s.idCard.status}
                      </StatusBadge>
                    </td>
                    <td className="tabular px-3 py-2.5 text-muted-foreground">{s.idCard.serial ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Regenerate card for ${fullName(s)}`} onClick={() => issueIdentityCard(s.id)}>
                          <RefreshCw className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`Download card for ${fullName(s)}`} onClick={() => downloadCard(s)}>
                          <Download className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Deactivate card for ${fullName(s)}`} onClick={() => deactivateIdentityCard(s.id)}>
                          <ShieldOff className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Card preview">
          <div className="overflow-hidden rounded-lg border border-border bg-navy text-navy-foreground">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="flex size-6 items-center justify-center rounded bg-teal text-[10px] font-bold text-teal-foreground">
                EC
              </span>
              <span className="text-[11px] leading-tight font-semibold">{SCHOOL.name}</span>
            </div>
            <div className="flex gap-3 p-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-white/10 text-lg font-semibold">
                {initials(fullName(previewStudent))}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-semibold">{fullName(previewStudent)}</p>
                <p className="tabular text-[11px] text-navy-foreground/70">{previewStudent.id}</p>
                <p className="text-[11px] text-navy-foreground/70">
                  Student · {previewStudent.level}
                  {previewStudent.arm}
                </p>
                <p className="text-[11px] text-navy-foreground/70">Session {SCHOOL.session}</p>
              </div>
              <div className="rounded bg-white p-1.5">
                <QRCodeSVG value={`educore:student:${previewStudent.id}`} size={56} fgColor="#101a33" />
              </div>
            </div>
            <div className="border-t border-white/10 px-4 py-2 text-[10px] text-navy-foreground/60">
              If found, return to {SCHOOL.address}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadCard()}>
              <Download className="size-4" /> Download
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cards are valid for the current session only. Replacing a card revokes the previous serial and
            records an audit entry.
          </p>
        </SectionCard>
      </div>
    </AppShell>
  );
}
