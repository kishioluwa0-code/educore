import { useEffect, useState } from "react";
import { getPublishedRowsForStudent } from "@/data/gradebook-store";
import type { Student } from "@/data/school";

export type ReportCardSettings = { principalName: string; principalSignature?: string; schoolStamp?: string; updatedAt: string };
export type GeneratedReportCard = { id: string; studentId: string; session: string; term: string; generatedAt: string; signedBy: string; status: "Generated" };
const SETTINGS_KEY = "educore.report-card-settings";
const CARDS_KEY = "educore.generated-report-cards";
const CHANGE_EVENT = "educore:report-cards-changed";
const DEFAULT_SETTINGS: ReportCardSettings = { principalName: "Principal", updatedAt: new Date(0).toISOString() };
function read<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; } catch { return fallback; } }
function write<T>(key: string, value: T) { window.localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function getReportCardSettings() { return { ...DEFAULT_SETTINGS, ...read<ReportCardSettings>(SETTINGS_KEY, DEFAULT_SETTINGS) }; }
export function saveReportCardSettings(settings: Partial<ReportCardSettings>) { const next = { ...getReportCardSettings(), ...settings, updatedAt: new Date().toISOString() }; write(SETTINGS_KEY, next); return next; }
export function getGeneratedReportCards(session?: string, term?: string) { return read<GeneratedReportCard[]>(CARDS_KEY, []).filter((card) => (!session || card.session === session) && (!term || card.term === term)); }
export function hasGeneratedReportCard(studentId: string, session: string, term: string) { return getGeneratedReportCards(session, term).some((card) => card.studentId === studentId); }
export function generateReportCard(studentId: string, session: string, term: string) { if (!getPublishedRowsForStudent(studentId, session, term).length) return false; const settings = getReportCardSettings(); const cards = getGeneratedReportCards().filter((card) => !(card.studentId === studentId && card.session === session && card.term === term)); write(CARDS_KEY, [...cards, { id: `RPT-${Date.now()}-${studentId}`, studentId, session, term, generatedAt: new Date().toISOString(), signedBy: settings.principalName, status: "Generated" }]); return true; }
export function generateReportCards(studentIds: string[], session: string, term: string) { return studentIds.filter((studentId) => generateReportCard(studentId, session, term)).length; }
export function hasAllTermsReady(studentId: string, session: string) { return ["First Term", "Second Term", "Third Term"].every((term) => hasGeneratedReportCard(studentId, session, term)); }
export function generatedPortrait(student: Student) {
	if (student.photoUrl) return student.photoUrl;
	const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
	const hue = Array.from(student.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect width="320" height="400" fill="hsl(${hue} 42% 28%)"/><circle cx="160" cy="138" r="66" fill="hsl(${hue} 35% 72%)"/><path d="M60 360c10-82 53-122 100-122s90 40 100 122" fill="hsl(${hue} 35% 72%)"/><text x="160" y="380" fill="white" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700">${initials}</text></svg>`)}`;
}
export function useReportCardStore(session: string, term: string) { const [, refresh] = useState(0); useEffect(() => { const update = () => refresh((value) => value + 1); window.addEventListener(CHANGE_EVENT, update); window.addEventListener("storage", update); return () => { window.removeEventListener(CHANGE_EVENT, update); window.removeEventListener("storage", update); }; }, []); return { settings: getReportCardSettings(), cards: getGeneratedReportCards(session, term) }; }
