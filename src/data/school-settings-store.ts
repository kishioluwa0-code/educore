import { SCHOOL } from "@/data/school";

export type SchoolSettings = { name: string; shortName: string; motto: string; address: string; phone: string; email: string; session: string; term: string; notifications: boolean; updatedAt: string; updatedBy: string };
const KEY = "educore.school-settings";
const DEFAULTS: SchoolSettings = { name: SCHOOL.name, shortName: SCHOOL.shortName, motto: SCHOOL.motto, address: SCHOOL.address, phone: "", email: "", session: SCHOOL.session, term: SCHOOL.term, notifications: true, updatedAt: new Date(0).toISOString(), updatedBy: "System" };
export function getSchoolSettings(): SchoolSettings { if (typeof window === "undefined") return DEFAULTS; try { return { ...DEFAULTS, ...(JSON.parse(window.localStorage.getItem(KEY) ?? "null") ?? {}) }; } catch { return DEFAULTS; } }
export function saveSchoolSettings(settings: Partial<SchoolSettings>, updatedBy: string) { const next = { ...getSchoolSettings(), ...settings, updatedAt: new Date().toISOString(), updatedBy }; window.localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event("educore:school-settings-changed")); return next; }
