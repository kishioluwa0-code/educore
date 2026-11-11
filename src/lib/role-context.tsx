import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile } from "@/lib/role-profiles";
import {
  getCurrentServerPrincipal,
  signOutFromServer,
  type ServerPrincipal,
} from "@/lib/identity-api";

export type UserRole =
  | "superadmin"
  | "administrator"
  | "principal"
  | "teacher"
  | "bursar"
  | "examinations"
  | "hr"
  | "security"
  | "parent"
  | "student";

export const USER_ROLES: UserRole[] = [
  "superadmin",
  "administrator",
  "principal",
  "teacher",
  "bursar",
  "examinations",
  "hr",
  "security",
  "parent",
  "student",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "EduCore Super Administrator",
  administrator: "School Administrator",
  principal: "Principal",
  teacher: "Teacher",
  bursar: "Bursar / Finance",
  examinations: "Examination Officer",
  hr: "HR",
  security: "Security Officer",
  parent: "Parent / Guardian",
  student: "Student",
};

const ROLE_KEY = "educore.active-role";
const PROFILE_KEY = "educore.active-profile";
const ROLE_ALIASES: Record<string, UserRole> = {
  school_administrator: "administrator",
  finance: "bursar",
  exam_officer: "examinations",
  parent_guardian: "parent",
};

type RoleContextValue = {
  role: UserRole;
  profileId?: string;
  principal?: ServerPrincipal;
  authenticated: boolean;
  hydrated: boolean;
  setRole: (role: UserRole, profileId?: string) => void;
  setPrincipal: (principal: ServerPrincipal) => void;
  signOut: () => void;
};

const RoleContext = createContext<RoleContextValue>({
  role: "administrator",
  authenticated: false,
  hydrated: false,
  setRole: () => undefined,
  setPrincipal: () => undefined,
  signOut: () => undefined,
});

function roleFromPrincipal(principal: ServerPrincipal): UserRole {
  if (principal.platformRole === "superadmin") return "superadmin";
  const membership =
    principal.memberships.find(
      (item) => item.schoolId === principal.activeSchoolId && item.status === "active",
    ) ?? principal.memberships.find((item) => item.status === "active");
  const serverRole = membership?.roleKeys[0];
  return (
    ROLE_ALIASES[serverRole ?? ""] ??
    (USER_ROLES.includes(serverRole as UserRole) ? (serverRole as UserRole) : "administrator")
  );
}

function profileForRole(role: UserRole, storedProfileId?: string) {
  return getProfile(role, storedProfileId)?.id ?? getProfile(role)?.id;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("administrator");
  const [profileId, setProfileId] = useState<string>();
  const [principal, setPrincipalState] = useState<ServerPrincipal>();
  const [authenticated, setAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (!window.localStorage.getItem("educore.clean-data-v1")) {
      window.localStorage.clear();
      window.localStorage.setItem("educore.clean-data-v1", "1");
    }
    const storedRole = window.localStorage.getItem(ROLE_KEY) as UserRole | null;
    const storedProfile = window.localStorage.getItem(PROFILE_KEY) ?? undefined;
    if (storedRole && USER_ROLES.includes(storedRole)) {
      setRoleState(storedRole);
      setProfileId(profileForRole(storedRole, storedProfile));
    }

    getCurrentServerPrincipal(controller.signal)
      .then((nextPrincipal) => {
        if (!nextPrincipal) return;
        const nextRole = roleFromPrincipal(nextPrincipal);
        setPrincipalState(nextPrincipal);
        setAuthenticated(true);
        setRoleState(nextRole);
        setProfileId(profileForRole(nextRole, storedProfile));
        window.localStorage.setItem(ROLE_KEY, nextRole);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setHydrated(true);
      });

    return () => controller.abort();
  }, []);

  const updateRole = (next: UserRole, nextProfileId?: string) => {
    const nextProfile = profileForRole(next, nextProfileId);
    setRoleState(next);
    setProfileId(nextProfile);
    window.localStorage.setItem(ROLE_KEY, next);
    if (nextProfile) window.localStorage.setItem(PROFILE_KEY, nextProfile);
    else window.localStorage.removeItem(PROFILE_KEY);
  };

  const setPrincipal = (nextPrincipal: ServerPrincipal) => {
    const nextRole = roleFromPrincipal(nextPrincipal);
    setPrincipalState(nextPrincipal);
    setAuthenticated(true);
    setRoleState(nextRole);
    setProfileId(profileForRole(nextRole));
    window.localStorage.setItem(ROLE_KEY, nextRole);
  };

  const signOut = () => {
    void signOutFromServer()
      .catch(() => undefined)
      .finally(() => {
        setPrincipalState(undefined);
        setAuthenticated(false);
        window.localStorage.removeItem("educore.authenticated");
      });
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        profileId,
        principal,
        authenticated: hydrated && authenticated,
        hydrated,
        setRole: updateRole,
        setPrincipal,
        signOut,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
