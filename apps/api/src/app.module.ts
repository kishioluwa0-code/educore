import { Module } from "@nestjs/common";
import { AuthorizationService } from "./authorization/authorization.service.js";
import { HealthController } from "./common/health.controller.js";
import { TenantContextService } from "./tenancy/tenant-context.service.js";
import { SessionService } from "./identity/session.service.js";
import { DatabaseModule } from "./database/database.module.js";
import { IdentityRepository } from "./identity/identity.repository.js";
import { AuthService } from "./identity/auth.service.js";
import { AuthGuard } from "./identity/auth.guard.js";
import { AuthController } from "./identity/auth.controller.js";
import { PasswordService } from "./identity/password.service.js";
import { AuditService } from "./audit/audit.service.js";
import { StudentController } from "./students/student.controller.js";
import { StudentRepository } from "./students/student.repository.js";
import { StudentService } from "./students/student.service.js";
import { StudentDocumentController } from "./students/student-document.controller.js";
import { StudentDocumentRepository } from "./students/student-document.repository.js";
import { StudentDocumentService } from "./students/student-document.service.js";
import { DocumentStorageService } from "./students/document-storage.service.js";
import { SchoolController } from "./school/school.controller.js";
import { SchoolRepository } from "./school/school.repository.js";
import { SchoolService } from "./school/school.service.js";
import { AcademicController } from "./academics/academic.controller.js";
import { AcademicRepository } from "./academics/academic.repository.js";
import { AcademicService } from "./academics/academic.service.js";
import { AssignmentController } from "./academics/assignment.controller.js";
import { AssignmentRepository } from "./academics/assignment.repository.js";
import { AssignmentService } from "./academics/assignment.service.js";
import { AttendanceController } from "./attendance/attendance.controller.js";
import { AttendanceRepository } from "./attendance/attendance.repository.js";
import { AttendanceService } from "./attendance/attendance.service.js";
import { TeacherDashboardController } from "./teacher-dashboard/teacher-dashboard.controller.js";
import { TeacherDashboardRepository } from "./teacher-dashboard/teacher-dashboard.repository.js";
import { TeacherDashboardService } from "./teacher-dashboard/teacher-dashboard.service.js";
import { GradebookController } from "./gradebook/gradebook.controller.js";
import { GradebookRepository } from "./gradebook/gradebook.repository.js";
import { GradebookService } from "./gradebook/gradebook.service.js";
import { PublicationController } from "./gradebook/publication.controller.js";
import { PublicationRepository } from "./gradebook/publication.repository.js";
import { PublicationService } from "./gradebook/publication.service.js";
import { ResultsController } from "./gradebook/results.controller.js";
import { ResultsRepository } from "./gradebook/results.repository.js";
import { ResultsService } from "./gradebook/results.service.js";
import { MovementController } from "./students/movement.controller.js";
import { MovementRepository } from "./students/movement.repository.js";
import { MovementService } from "./students/movement.service.js";
import { StudentTransferService } from "./students/student-transfer.service.js";
import { QuestionBankController } from "./question-bank/question-bank.controller.js";
import { QuestionBankRepository } from "./question-bank/question-bank.repository.js";
import { QuestionBankService } from "./question-bank/question-bank.service.js";
import { CbtPoolController } from "./cbt-pools/cbt-pool.controller.js";
import { CbtPoolRepository } from "./cbt-pools/cbt-pool.repository.js";
import { CbtPoolService } from "./cbt-pools/cbt-pool.service.js";
import { ExamController } from "./exams/exam.controller.js";
import { ExamRepository } from "./exams/exam.repository.js";
import { ExamService } from "./exams/exam.service.js";
import { AttemptController } from "./exams/attempt.controller.js";
import { AttemptRepository } from "./exams/attempt.repository.js";
import { AttemptService } from "./exams/attempt.service.js";
import { ResultController } from "./exams/result.controller.js";
import { ResultRepository } from "./exams/result.repository.js";
import { ResultService } from "./exams/result.service.js";
import { CbtResultJobRepository } from "./exams/cbt-result-job.repository.js";
import { CbtResultJobService } from "./exams/cbt-result-job.service.js";
import { CbtResultWorkerService } from "./exams/cbt-result-worker.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, AuthController, StudentController, StudentDocumentController, MovementController, SchoolController, AcademicController, AssignmentController, AttendanceController, TeacherDashboardController, GradebookController, PublicationController, ResultsController, QuestionBankController, CbtPoolController, ExamController, AttemptController, ResultController],
  providers: [
    AuthorizationService,
    TenantContextService,
    SessionService,
    IdentityRepository,
    AuthService,
    AuthGuard,
    PasswordService,
    AuditService,
    StudentRepository,
    StudentService,
    MovementRepository,
    MovementService,
    StudentTransferService,
    QuestionBankRepository,
    QuestionBankService,
    CbtPoolRepository,
    CbtPoolService,
    ExamRepository,
    ExamService,
    AttemptRepository,
    AttemptService,
    ResultRepository,
    ResultService,
    CbtResultJobRepository,
    CbtResultJobService,
    CbtResultWorkerService,
    StudentDocumentRepository,
    StudentDocumentService,
    DocumentStorageService,
    SchoolRepository,
    SchoolService,
    AcademicRepository,
    AcademicService,
    AssignmentRepository,
    AssignmentService,
    AttendanceRepository,
    AttendanceService,
    TeacherDashboardRepository,
    TeacherDashboardService,
    GradebookRepository,
    GradebookService,
    PublicationRepository,
    PublicationService,
    ResultsRepository,
    ResultsService,
  ],
  exports: [AuthorizationService, TenantContextService, SessionService, AuthService, AuditService],
})
export class AppModule {}
