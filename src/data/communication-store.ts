import { useEffect, useState } from "react";
import type { Student } from "@/data/school";

export type NotificationKind = "Attendance" | "Fees" | "Results";
export type EventNotification = { id: string; kind: NotificationKind; subject: string; body: string; audience: "All guardians" | "Students"; studentId?: string; status: "Queued" | "Delivered" | "Failed"; createdAt: string };
export type MessageTemplate = { id: string; name: string; kind: NotificationKind; audience: EventNotification["audience"]; subject: string; body: string };
const NOTIFICATION_KEY = "educore.event-notifications";
const TEMPLATE_KEY = "educore.message-templates";
const CHANGE_EVENT = "educore:communications-changed";
function read<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; } catch { return fallback; } }
function write<T>(key: string, value: T) { window.localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function getEventNotifications() { return read<EventNotification[]>(NOTIFICATION_KEY, []); }
export function getMessageTemplates() { return read<MessageTemplate[]>(TEMPLATE_KEY, [{ id: "TPL-001", name: "Attendance absence alert", kind: "Attendance", audience: "All guardians", subject: "Attendance alert for {{student}}", body: "{{student}} was marked absent today. Please contact the school if this is unexpected." }, { id: "TPL-002", name: "Fee reminder", kind: "Fees", audience: "All guardians", subject: "Fee reminder for {{student}}", body: "Your current school fee balance is {{balance}}." }, { id: "TPL-003", name: "Result published", kind: "Results", audience: "All guardians", subject: "Result published for {{student}}", body: "The latest result is now available in EduCore." }]); }
export function queueNotification(input: Omit<EventNotification, "id" | "createdAt" | "status">) { const notification = { ...input, id: `NTF-${Date.now()}`, status: "Queued" as const, createdAt: new Date().toISOString() }; write(NOTIFICATION_KEY, [...getEventNotifications(), notification]); return notification; }
export function markNotificationDelivered(id: string) { write(NOTIFICATION_KEY, getEventNotifications().map((item) => item.id === id ? { ...item, status: "Delivered" as const } : item)); }
export function parentSummary(student: Student) { return { student: `${student.firstName} ${student.lastName}`, attendance: student.attendance, attendanceRate: student.attendanceRate, balance: student.feeBalance, academicStatus: student.academicStatus }; }
export function useCommunicationStore() { const [, refresh] = useState(0); useEffect(() => { const update = () => refresh((value) => value + 1); window.addEventListener(CHANGE_EVENT, update); window.addEventListener("storage", update); return () => { window.removeEventListener(CHANGE_EVENT, update); window.removeEventListener("storage", update); }; }, []); return { notifications: getEventNotifications(), templates: getMessageTemplates() }; }
