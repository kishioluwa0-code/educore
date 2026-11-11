import { Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TeacherDashboardRepository } from "./teacher-dashboard.repository.js";

@Injectable()
export class TeacherDashboardService {
  constructor(
    @Inject(TeacherDashboardRepository) private readonly repository: TeacherDashboardRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
  ) {}

  async listTasks(principal: AuthenticatedPrincipal) {
    const membership = this.tenancy.resolveActiveMembership(principal);

    // Teachers and above can view their own task queue
    this.authorization.requireCapability(principal, membership.schoolId, CAPABILITIES.teacherScopeRead);

    const pendingAttendance = await this.repository.findPendingAttendance(membership.schoolId, principal.userId);

    return {
      attendance: pendingAttendance.map((record) => ({
        id: record.id,
        type: "attendance",
        title: `${record.className} ${record.armName}`,
        description: `Attendance for ${record.attendanceDate?.toISOString().split("T")[0]}`,
        date: record.attendanceDate,
        status: record.status,
        action: record.status === "draft" ? "submit" : "resubmit",
        metadata: {
          classId: record.classId,
          armId: record.armId,
          sessionId: record.sessionId,
          termId: record.termId,
          sessionName: record.sessionName,
          termName: record.termName,
        },
      })),
    };
  }
}
