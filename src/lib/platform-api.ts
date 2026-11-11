export type PlatformSchool = { id: string; slug: string; name: string; status: "trial" | "active" | "suspended" | "archived"; createdAt: string };
export type PlatformUser = { id: string; email: string; displayName: string; status: string; platformRole: string | null; createdAt: string };

export async function listPlatformSchools(): Promise<PlatformSchool[]> {
  const response = await fetch("/api/school/platform/schools", { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load schools for approval");
  return (await response.json()) as PlatformSchool[];
}

export async function approvePlatformSchool(schoolId: string): Promise<PlatformSchool> {
  const response = await fetch(`/api/school/platform/schools/${encodeURIComponent(schoolId)}/approve`, { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error("Unable to approve school");
  return (await response.json()) as PlatformSchool;
}

export async function listPlatformUsers(): Promise<PlatformUser[]> {
  const response = await fetch("/api/school/platform/users", { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load platform users");
  return (await response.json()) as PlatformUser[];
}

export async function createPlatformUser(input: { email: string; displayName: string; password: string; platformRole: "user" | "superadmin" }): Promise<PlatformUser> {
  const response = await fetch("/api/school/platform/users", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("Unable to create platform user");
  return (await response.json()) as PlatformUser;
}

export async function resetPlatformUserPassword(userId: string, password: string): Promise<void> {
  const response = await fetch(`/api/school/platform/users/${encodeURIComponent(userId)}/reset-password`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
  if (!response.ok) throw new Error("Unable to reset this user's password");
}