import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import type { AuthenticatedPrincipal, PrincipalMembership } from "../identity/types.js";

@Injectable()
export class TenantContextService {
  resolveActiveMembership(
    principal: AuthenticatedPrincipal,
    requestedSchoolId?: string,
  ): PrincipalMembership {
    if (!principal.memberships.length) {
      throw new ForbiddenException("The user has no school memberships");
    }

    if (requestedSchoolId) {
      const membership = principal.memberships.find(
        (item) => item.schoolId === requestedSchoolId && item.status === "active",
      );
      if (!membership) throw new ForbiddenException("The requested school is not available");
      return membership;
    }

    const activeMemberships = principal.memberships.filter((item) => item.status === "active");
    if (activeMemberships.length !== 1) {
      throw new BadRequestException("An active school must be selected");
    }
    return activeMemberships[0]!;
  }
}
