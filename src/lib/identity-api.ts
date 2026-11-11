export type ServerMembership = {
  membershipId: string;
  schoolId: string;
  status: "invited" | "active" | "suspended" | "revoked";
  roleKeys: string[];
  capabilityKeys: string[];
};

export type ServerPrincipal = {
  userId: string;
  email: string;
  displayName: string;
  activeSchoolId?: string;
  memberships: ServerMembership[];
  platformRole?: "superadmin";
  mustChangePassword?: boolean;
};

export type SignInRequest = {
  email: string;
  password: string;
  activeSchoolId?: string;
};

export class IdentityApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IdentityApiError";
  }
}

async function parseError(response: Response, fallback: string): Promise<never> {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(payload.message) ? payload.message.join(", ") : payload.message;
    throw new IdentityApiError(message || fallback, response.status);
  } catch (error) {
    if (error instanceof IdentityApiError) throw error;
    throw new IdentityApiError(fallback, response.status);
  }
}

export async function signInToServer(request: SignInRequest): Promise<{
  expiresAt: string;
  principal: ServerPrincipal;
}> {
  const response = await fetch("/api/auth/sign-in", {
    method: "POST",
    credentials: "include",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) return parseError(response, "Unable to sign in");
  return (await response.json()) as { expiresAt: string; principal: ServerPrincipal };
}

export async function signOutFromServer(): Promise<void> {
  const response = await fetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  if (!response.ok && response.status !== 401) return parseError(response, "Unable to sign out");
}

export async function getCurrentServerPrincipal(
  signal?: AbortSignal,
): Promise<ServerPrincipal | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  });

  if (response.status === 401) return null;
  if (!response.ok) return parseError(response, "Unable to load the signed-in account");
  return (await response.json()) as ServerPrincipal;
}
