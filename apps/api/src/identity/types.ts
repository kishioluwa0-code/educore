export type PrincipalMembership = {
  membershipId: string;
  schoolId: string;
  status: "invited" | "active" | "suspended" | "revoked";
  roleKeys: string[];
  capabilityKeys: string[];
};

export type AuthenticatedPrincipal = {
  userId: string;
  email: string;
  displayName: string;
  activeSchoolId?: string;
  memberships: PrincipalMembership[];
  platformRole?: "superadmin";
  mustChangePassword?: boolean;
};

export type RequestContext = {
  requestId: string;
  principal?: AuthenticatedPrincipal;
  activeSchoolId?: string;
};
