import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { verifyPublishedResult } from "@/data/result-publication-store";

export const Route = createFileRoute("/verify")({
  head: () => ({ meta: [{ title: "Result verification — EduCore" }, { name: "robots", content: "noindex" }] }),
  component: VerifyResultPage,
});

function VerifyResultPage() {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const studentId = params.get("studentId") ?? "";
  const session = params.get("session") ?? "";
  const term = params.get("term") ?? "";
  const result = studentId && session && term ? verifyPublishedResult(studentId, session, term) : null;

  return <main className="mx-auto min-h-screen max-w-2xl bg-background px-5 py-10"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">EduCore verification</p><h1 className="mt-2 text-2xl font-semibold">Official result verification</h1><p className="mt-1 text-sm text-muted-foreground">Confirm whether a student result was published by the school.</p></div><SectionCard title={result ? "Published result confirmed" : "Result could not be verified"} description={result ? `${result.studentId} · ${result.session} · ${result.term}` : "Provide a valid student result verification link."}>{result ? <><div className="flex items-center gap-2 rounded-md border border-success/30 bg-success-soft/40 px-4 py-3 text-sm text-success"><CheckCircle2 className="size-4" /> This result is published in EduCore.</div><div className="mt-5 divide-y divide-border">{result.subjects.map((subject) => <div key={`${subject.classId}-${subject.subjectCode}`} className="flex items-center justify-between py-3 text-sm"><span>{subject.subject}</span><StatusBadge tone="success" dot={false}>{subject.score}%</StatusBadge></div>)}</div></> : <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft/40 px-4 py-3 text-sm text-danger"><XCircle className="size-4" /> No published result matched this verification request.</div>}</SectionCard></main>;
}
