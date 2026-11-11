import { Injectable, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedPrincipal, PrincipalMembership } from "../identity/types.js";

export type ResourceScope = {
  schoolId?: string;
  userId?: string;
};

@Injectable()
export class AuthorizationService {
  requirePrincipal(principal?: AuthenticatedPrincipal): AuthenticatedPrincipal {
    if (!principal) throw new UnauthorizedException("Authentication is required");
    return principal;
  }

  requireMembership(principal: AuthenticatedPrincipal, schoolId: string): PrincipalMembership {
    const membership = principal.memberships.find(
      (item) => item.schoolId === schoolId && item.status === "active",
    );
    if (!membership)
      throw new ForbiddenException("The user is not an active member of this school");
    return membership;
  }

  requireCapability(
    principal: AuthenticatedPrincipal,
    schoolId: string,
    capability: string,
  ): PrincipalMembership {
    if (principal.platformRole === "superadmin" && ["school.read", "school.approve", "audit.read"].includes(capability)) {
      return { membershipId: "platform", schoolId, status: "active", roleKeys: ["superadmin"], capabilityKeys: [capability] };
    }
    const membership = this.requireMembership(principal, schoolId);
    if (!membership.capabilityKeys.includes(capability)) {
      throw new ForbiddenException(`Missing capability: ${capability}`);
    }
    return membership;
  }

  requireScope(principal: AuthenticatedPrincipal, scope: ResourceScope): void {
    if (scope.userId && scope.userId !== principal.userId) {
      throw new ForbiddenException("The requested user scope is not available");
    }
    if (scope.schoolId) this.requireMembership(principal, scope.schoolId);
  }
}
