export type ServerSchoolSetup = {
  id: string;
  slug: string;
  name: string;
  status: string;
  setup: {
    shortCode: string | null;
    schoolType: string | null;
    state: string | null;
    address: string | null;
    officialPhone: string | null;
    officialEmail: string | null;
    logoUrl: string | null;
    currentSession: string | null;
    currentTerm: string | null;
    setupStep: number;
    checklist: unknown;
  } | null;
};

export async function getServerSchoolSetup(signal?: AbortSignal): Promise<ServerSchoolSetup> {
  const response = await fetch("/api/school/setup", { credentials: "include", signal });
  if (!response.ok) throw new Error("Unable to load server school setup");
  return (await response.json()) as ServerSchoolSetup;
}

export async function saveServerSchoolSetup(input: {
  setupStep?: number;
  checklist?: string[];
  shortCode?: string;
  schoolType?: string;
  state?: string;
  address?: string;
  officialPhone?: string;
  officialEmail?: string;
  logoUrl?: string;
  currentSession?: string;
  currentTerm?: string;
}) {
  const response = await fetch("/api/school/setup", {
    method: "PATCH",
    credentials: "include",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Unable to save server school setup");
  return (await response.json()) as ServerSchoolSetup;
}