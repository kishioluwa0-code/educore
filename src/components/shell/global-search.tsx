import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { STAFF, fullName } from "@/data/school";
import { useStudents } from "@/data/student-store";
import { initials } from "@/lib/format";
import { StatusBadge } from "@/components/kit/status-badge";
import { FileText } from "lucide-react";

const DOCUMENTS = [
  { id: "DOC-1102", name: "Admission letter — Adaeze Okonkwo", owner: "Student record" },
  { id: "DOC-1188", name: "First Term fee schedule 2026/2027", owner: "Finance" },
  { id: "DOC-1203", name: "BECE candidate nominal roll", owner: "Examinations" },
];

function Row({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm">{label}</span>
      <span className="truncate text-xs text-muted-foreground">{meta}</span>
    </div>
  );
}

function Avatar({ text }: { text: string }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-navy-foreground">
      {text}
    </span>
  );
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const students = useStudents();
  const guardians = students.flatMap((s) =>
    s.guardians.slice(0, 1).map((gd) => ({ ...gd, child: fullName(s) })),
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search students, staff, guardians, invoices, results…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          <div className="py-6 text-center text-sm">
            <p className="font-medium">No matching records</p>
            <p className="text-muted-foreground">Results are limited to records you're permitted to view.</p>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Students">
          {students.map((s) => (
            <CommandItem
              key={s.id}
              value={`${fullName(s)} ${s.id} ${s.level} ${s.arm}`}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: "/people/students/$studentId", params: { studentId: s.id } });
              }}
              className="gap-3"
            >
              <Avatar text={initials(fullName(s))} />
              <Row label={fullName(s)} meta={`${s.id} · ${s.level}${s.arm}`} />
              <StatusBadge tone="success" className="ml-auto">
                {s.status}
              </StatusBadge>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Staff">
          {STAFF.map((s) => (
            <CommandItem key={s.id} value={`${s.name} ${s.role}`} className="gap-3">
              <Avatar text={initials(s.name)} />
              <Row label={s.name} meta={`${s.id} · ${s.role}`} />
              <StatusBadge tone={s.status === "Active" ? "success" : "warning"} className="ml-auto">
                {s.status}
              </StatusBadge>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Parents & Guardians">
          {guardians.map((gd) => (
            <CommandItem key={gd.id} value={`${gd.name} ${gd.child}`} className="gap-3">
              <Avatar text={initials(gd.name.replace(/^(Mr\.|Mrs\.)\s/, ""))} />
              <Row label={gd.name} meta={`${gd.relationship} of ${gd.child} · ${gd.phone}`} />
              <StatusBadge tone={gd.verified === "Verified" ? "success" : "warning"} className="ml-auto">
                {gd.verified}
              </StatusBadge>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Documents">
          {DOCUMENTS.map((d) => (
            <CommandItem key={d.id} value={d.name} className="gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <FileText className="size-3.5" aria-hidden />
              </span>
              <Row label={d.name} meta={`${d.id} · ${d.owner}`} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
