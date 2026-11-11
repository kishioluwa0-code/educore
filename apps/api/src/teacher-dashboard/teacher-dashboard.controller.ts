import { Controller, Get, UseGuards, Req, Inject } from "@nestjs/common";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { TeacherDashboardService } from "./teacher-dashboard.service.js";

@Controller("teacher/dashboard")
@UseGuards(AuthGuard)
export class TeacherDashboardController {
  constructor(@Inject(TeacherDashboardService) private readonly service: TeacherDashboardService) {}

  @Get("tasks")
  async tasks(@Req() request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");
    return this.service.listTasks(principal);
  }
}
