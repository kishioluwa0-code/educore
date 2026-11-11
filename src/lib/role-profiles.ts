import { STAFF, STUDENTS, fullName } from "@/data/school";
import type { UserRole } from "@/lib/role-context";

export type RoleProfile = { id: string; label: string; detail: string; childIds: string[] };

const staffParentLinks: Record<string, string> = {
  "STF-0102": "GRD-100",
  "STF-0233": "GRD-200",
};

export function getRoleProfiles(role: UserRole): RoleProfile[] {
  if (role === "student") return STUDENTS.map((student) => ({ id: student.id, label: fullName(student), detail: `${student.admissionNo} · ${student.level} ${student.arm}`, childIds: [student.id] }));
  if (role !== "parent") return [];
  const profiles = new Map<string, RoleProfile>();
  STUDENTS.forEach((student) => student.guardians.forEach((guardian) => {
    const linked = profiles.get(guardian.id);
    profiles.set(guardian.id, { id: guardian.id, label: guardian.name, detail: `${guardian.relationship} · ${guardian.phone}`, childIds: [...(linked?.childIds ?? []), student.id] });
  }));
  Object.entries(staffParentLinks).forEach(([staffId, guardianId]) => {
    const staff = STAFF.find((member) => member.id === staffId);
    const profile = profiles.get(guardianId);
    if (staff && profile) profiles.set(guardianId, { ...profile, label: `${staff.name} (staff and guardian)`, detail: `${staff.role} · linked family account` });
  });
  return [...profiles.values()];
}

export function getProfile(role: UserRole, profileId?: string) {
  const profiles = getRoleProfiles(role);
  return profiles.find((profile) => profile.id === profileId) ?? profiles[0];
}