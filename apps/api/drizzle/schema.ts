import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", ["active", "invited", "suspended", "disabled"]);
export const membershipStatus = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
  "revoked",
]);
export const schoolStatus = pgEnum("school_status", ["trial", "active", "suspended", "archived"]);
export const auditOutcome = pgEnum("audit_outcome", ["allowed", "denied"]);
export const studentStatus = pgEnum("student_status", [
  "pending",
  "approved",
  "rejected",
  "transferred",
  "withdrawn",
  "graduated",
]);
export const studentDocumentStatus = pgEnum("student_document_status", [
  "pending",
  "verified",
  "rejected",
]);

export const schoolSetup = pgTable("school_setup", {
  schoolId: uuid("school_id")
    .primaryKey()
    .references(() => schools.id, { onDelete: "cascade" }),
  shortCode: text("short_code"),
  schoolType: text("school_type"),
  state: text("state"),
  address: text("address"),
  officialPhone: text("official_phone"),
  officialEmail: text("official_email"),
  logoUrl: text("logo_url"),
  currentSession: text("current_session"),
  currentTerm: text("current_term"),
  setupStep: integer("setup_step").notNull().default(0),
  checklist: jsonb("checklist").notNull().default([]),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalSubject: text("external_subject"),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    platformRole: text("platform_role"),
    status: userStatus("status").notNull().default("invited"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_external_subject_unique").on(table.externalSubject),
    index("users_status_idx").on(table.status),
  ],
);

export const userCredentials = pgTable(
  "user_credentials",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_credentials_locked_until_idx").on(table.lockedUntil)],
);

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: schoolStatus("status").notNull().default("trial"),
    timezone: text("timezone").notNull().default("Africa/Lagos"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("schools_slug_unique").on(table.slug),
    index("schools_status_idx").on(table.status),
  ],
);

export const schoolMemberships = pgTable(
  "school_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: membershipStatus("status").notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("school_memberships_school_user_unique").on(table.schoolId, table.userId),
    index("school_memberships_user_idx").on(table.userId),
    index("school_memberships_school_status_idx").on(table.schoolId, table.status),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("roles_key_unique").on(table.key)],
);

export const capabilities = pgTable(
  "capabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    domain: text("domain").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("capabilities_key_unique").on(table.key),
    index("capabilities_domain_idx").on(table.domain),
  ],
);

export const membershipRoles = pgTable(
  "membership_roles",
  {
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => schoolMemberships.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.membershipId, table.roleId] }),
    index("membership_roles_role_idx").on(table.roleId),
  ],
);

export const roleCapabilities = pgTable(
  "role_capabilities",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    capabilityId: uuid("capability_id")
      .notNull()
      .references(() => capabilities.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.capabilityId] }),
    index("role_capabilities_capability_idx").on(table.capabilityId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeSchoolId: uuid("active_school_id").references(() => schools.id, { onDelete: "set null" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_active_idx").on(table.expiresAt, table.revokedAt),
  ],
);

export const academicSessions = pgTable("academic_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("academic_sessions_school_name_unique").on(table.schoolId, table.name)]);

export const academicTerms = pgTable("academic_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
  endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("academic_terms_session_name_unique").on(table.sessionId, table.name)]);

export const academicClasses = pgTable("academic_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  section: text("section"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("academic_classes_school_name_unique").on(table.schoolId, table.name)]);

export const academicArms = pgTable("academic_arms", {
  id: uuid("id").defaultRandom().primaryKey(),
  classId: uuid("class_id").notNull().references(() => academicClasses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("academic_arms_class_name_unique").on(table.classId, table.name)]);

export const academicSubjects = pgTable("academic_subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("academic_subjects_school_code_unique").on(table.schoolId, table.code)]);

export const teacherClassAssignments = pgTable("teacher_class_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherUserId: uuid("teacher_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => academicClasses.id, { onDelete: "cascade" }),
  armId: uuid("arm_id").notNull().references(() => academicArms.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
  termId: uuid("term_id").references(() => academicTerms.id, { onDelete: "cascade" }),
  effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true, mode: "date" }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("teacher_class_assignments_scope_idx").on(table.schoolId, table.teacherUserId, table.sessionId, table.termId)]);

export const teacherSubjectAssignments = pgTable("teacher_subject_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  teacherUserId: uuid("teacher_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => academicSubjects.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => academicClasses.id, { onDelete: "cascade" }),
  armId: uuid("arm_id").references(() => academicArms.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
  termId: uuid("term_id").references(() => academicTerms.id, { onDelete: "cascade" }),
  effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true, mode: "date" }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("teacher_subject_assignments_scope_idx").on(table.schoolId, table.teacherUserId, table.sessionId, table.termId)]);

export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => academicClasses.id, { onDelete: "cascade" }),
  armId: uuid("arm_id").notNull().references(() => academicArms.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
  termId: uuid("term_id").notNull().references(() => academicTerms.id, { onDelete: "cascade" }),
  attendanceDate: timestamp("attendance_date", { withTimezone: true, mode: "date" }).notNull(),
  entries: jsonb("entries").notNull().default([]),
  idempotencyKey: text("idempotency_key"),
  requestFingerprint: text("request_fingerprint"),
  status: text("status").notNull().default("draft"),
  submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  reviewReason: text("review_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("attendance_school_class_date_unique").on(table.schoolId, table.classId, table.armId, table.attendanceDate), index("attendance_school_status_idx").on(table.schoolId, table.status, table.attendanceDate)]);

export const attendanceSyncOperations = pgTable(
  "attendance_sync_operations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    operationId: text("operation_id").notNull(),
    payload: jsonb("payload").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    status: text("status").notNull().default("pending"),
    attendanceRecordId: uuid("attendance_record_id").references(() => attendanceRecords.id, { onDelete: "set null" }),
    conflictReason: text("conflict_reason"),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_sync_school_operation_unique").on(table.schoolId, table.operationId),
    index("attendance_sync_school_status_idx").on(table.schoolId, table.status, table.createdAt),
  ],
);

export const attendanceExceptions = pgTable("attendance_exceptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  attendanceRecordId: uuid("attendance_record_id").notNull().references(() => attendanceRecords.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("open"),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("attendance_exceptions_school_status_idx").on(table.schoolId, table.status, table.createdAt), index("attendance_exceptions_record_student_idx").on(table.attendanceRecordId, table.studentId)]);

export const questionBankItems = pgTable(
  "question_bank_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => academicSubjects.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    tags: jsonb("tags").notNull().default([]),
    status: text("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    retiredByUserId: uuid("retired_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_bank_school_code_unique").on(table.schoolId, table.code),
    index("question_bank_school_status_idx").on(table.schoolId, table.status),
  ],
);

export const questionBankVersions = pgTable(
  "question_bank_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id").notNull().references(() => questionBankItems.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    type: text("type").notNull(),
    prompt: text("prompt").notNull(),
    options: jsonb("options").notNull().default([]),
    correctAnswer: text("correct_answer").notNull(),
    explanation: text("explanation"),
    points: integer("points").notNull().default(1),
    status: text("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_bank_question_version_unique").on(table.questionId, table.version),
    index("question_bank_version_status_idx").on(table.questionId, table.status),
  ],
);

export const cbtPools = pgTable(
  "cbt_pools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    mode: text("mode").notNull(),
    resultPolicy: jsonb("result_policy").notNull().default({}),
    status: text("status").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_pools_school_code_unique").on(table.schoolId, table.code),
    index("cbt_pools_school_mode_status_idx").on(table.schoolId, table.mode, table.status),
  ],
);

export const cbtPoolQuestions = pgTable(
  "cbt_pool_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    poolId: uuid("pool_id").notNull().references(() => cbtPools.id, { onDelete: "cascade" }),
    questionVersionId: uuid("question_version_id").notNull().references(() => questionBankVersions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_pool_question_position_unique").on(table.poolId, table.position),
    uniqueIndex("cbt_pool_question_version_unique").on(table.poolId, table.questionVersionId),
  ],
);

export const examConfigurations = pgTable(
  "exam_configurations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    poolId: uuid("pool_id").notNull().references(() => cbtPools.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    questionsPerStudent: integer("questions_per_student").notNull().default(1),
    gradebookId: uuid("gradebook_id"),
    gradeComponentKey: text("grade_component_key"),
    status: text("status").notNull().default("draft"),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exam_configurations_school_code_unique").on(table.schoolId, table.code),
    index("exam_configurations_school_status_idx").on(table.schoolId, table.status, table.opensAt),
  ],
);

export const examCandidates = pgTable(
  "exam_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configurationId: uuid("configuration_id").notNull().references(() => examConfigurations.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exam_candidates_configuration_student_unique").on(table.configurationId, table.studentId),
    index("exam_candidates_configuration_idx").on(table.configurationId),
  ],
);

export const cbtAttempts = pgTable(
  "cbt_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configurationId: uuid("configuration_id").notNull().references(() => examConfigurations.id, { onDelete: "restrict" }),
    candidateId: uuid("candidate_id").notNull().references(() => examCandidates.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
    questionOrder: jsonb("question_order").notNull(),
    answers: jsonb("answers").notNull().default({}),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    lastAutosaveSequence: integer("last_autosave_sequence").notNull().default(0),
    lastEventSequence: integer("last_event_sequence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_attempts_configuration_student_unique").on(table.configurationId, table.studentId),
    index("cbt_attempts_student_status_idx").on(table.studentId, table.status),
  ],
);

export const cbtAutosaves = pgTable(
  "cbt_autosaves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => cbtAttempts.id, { onDelete: "cascade" }),
    operationId: text("operation_id").notNull(),
    sequence: integer("sequence").notNull(),
    answers: jsonb("answers").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_autosaves_attempt_operation_unique").on(table.attemptId, table.operationId),
    uniqueIndex("cbt_autosaves_attempt_sequence_unique").on(table.attemptId, table.sequence),
  ],
);

export const cbtQuestionAllocations = pgTable(
  "cbt_question_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    configurationId: uuid("configuration_id").notNull().references(() => examConfigurations.id, { onDelete: "restrict" }),
    candidateId: uuid("candidate_id").notNull().references(() => examCandidates.id, { onDelete: "restrict" }),
    questionVersionId: uuid("question_version_id").notNull().references(() => questionBankVersions.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_question_allocations_candidate_position_unique").on(table.candidateId, table.position),
    uniqueIndex("cbt_question_allocations_configuration_question_unique").on(table.configurationId, table.questionVersionId),
    index("cbt_question_allocations_configuration_candidate_idx").on(table.configurationId, table.candidateId),
  ],
);

export const cbtAttemptEvents = pgTable(
  "cbt_attempt_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => cbtAttempts.id, { onDelete: "cascade" }),
    operationId: text("operation_id").notNull(),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_attempt_events_attempt_operation_unique").on(table.attemptId, table.operationId),
    uniqueIndex("cbt_attempt_events_attempt_sequence_unique").on(table.attemptId, table.sequence),
    index("cbt_attempt_events_attempt_created_idx").on(table.attemptId, table.createdAt),
  ],
);

export const cbtResults = pgTable(
  "cbt_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id").notNull().references(() => cbtAttempts.id, { onDelete: "restrict" }),
    configurationId: uuid("configuration_id").notNull().references(() => examConfigurations.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    pendingManualCount: integer("pending_manual_count").notNull().default(0),
    breakdown: jsonb("breakdown").notNull().default([]),
    status: text("status").notNull().default("marked"),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
    markedByUserId: uuid("marked_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cbt_results_attempt_unique").on(table.attemptId),
    index("cbt_results_configuration_status_idx").on(table.configurationId, table.status),
    index("cbt_results_student_status_idx").on(table.studentId, table.status),
  ],
);

export const cbtResultJobStatus = pgEnum("cbt_result_job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

export const cbtResultJobs = pgTable(
  "cbt_result_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    jobType: text("job_type").notNull(),
    workKey: text("work_key").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: cbtResultJobStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("cbt_result_jobs_work_key_unique").on(table.workKey),
    index("cbt_result_jobs_claim_idx").on(table.status, table.nextRunAt),
    index("cbt_result_jobs_lease_idx").on(table.status, table.leaseExpiresAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id"),
    outcome: auditOutcome("outcome").notNull(),
    reason: text("reason"),
    before: jsonb("before"),
    after: jsonb("after"),
    requestId: text("request_id").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_school_created_idx").on(table.schoolId, table.createdAt),
    index("audit_events_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("audit_events_object_idx").on(table.objectType, table.objectId),
    index("audit_events_request_idx").on(table.requestId),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    admissionNo: text("admission_no").notNull(),
    firstName: text("first_name").notNull(),
    middleName: text("middle_name"),
    lastName: text("last_name").notNull(),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    gender: text("gender"),
    nationality: text("nationality"),
    classId: text("class_id"),
    armId: text("arm_id"),
    session: text("session"),
    status: studentStatus("status").notNull().default("pending"),
    admittedAt: timestamp("admitted_at", { withTimezone: true }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("students_school_admission_unique").on(table.schoolId, table.admissionNo),
    uniqueIndex("students_school_user_unique").on(table.schoolId, table.userId),
    index("students_school_status_idx").on(table.schoolId, table.status),
    index("students_school_name_idx").on(table.schoolId, table.lastName, table.firstName),
  ],
);

export const studentGuardians = pgTable(
  "student_guardians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    guardianUserId: uuid("guardian_user_id").references(() => users.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    relationship: text("relationship").notNull(),
    phone: text("phone"),
    email: text("email"),
    isPrimary: boolean("is_primary").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("student_guardians_student_idx").on(table.studentId),
    index("student_guardians_school_idx").on(table.schoolId),
    index("student_guardians_user_idx").on(table.guardianUserId),
  ],
);

export const studentMovements = pgTable(
  "student_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    fromClassId: text("from_class_id"),
    fromArmId: text("from_arm_id"),
    toClassId: text("to_class_id"),
    toArmId: text("to_arm_id"),
    effectiveDate: timestamp("effective_date", { withTimezone: true, mode: "date" }).notNull(),
    reason: text("reason").notNull(),
    decidedByUserId: uuid("decided_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("student_movements_student_session_unique").on(table.studentId, table.sessionId),
    index("student_movements_school_session_idx").on(table.schoolId, table.sessionId),
  ],
);

export const studentDocuments = pgTable(
  "student_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    requirementKey: text("requirement_key").notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: studentDocumentStatus("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    verifiedByUserId: uuid("verified_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("student_documents_storage_key_unique").on(table.storageKey),
    index("student_documents_student_idx").on(table.studentId, table.createdAt),
    index("student_documents_school_requirement_idx").on(
      table.schoolId,
      table.requirementKey,
      table.status,
    ),
  ],
);

export const gradebooks = pgTable(
  "gradebooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => academicClasses.id, { onDelete: "cascade" }),
    armId: uuid("arm_id").notNull().references(() => academicArms.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
    termId: uuid("term_id").references(() => academicTerms.id, { onDelete: "set null" }),
    subjectId: uuid("subject_id").references(() => academicSubjects.id, { onDelete: "set null" }),
    componentPolicy: jsonb("component_policy").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("gradebooks_school_idx").on(table.schoolId),
    uniqueIndex("gradebooks_unique_scope").on(table.schoolId, table.classId, table.armId, table.sessionId, table.termId, table.subjectId),
  ],
);

export const gradeRows = pgTable(
  "grade_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gradebookId: uuid("gradebook_id").notNull().references(() => gradebooks.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    scores: jsonb("scores").notNull().default({}),
    scoreSources: jsonb("score_sources").notNull().default({}),
    version: integer("version").notNull().default(1),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("grade_rows_gradebook_idx").on(table.gradebookId),
    uniqueIndex("grade_rows_unique_student").on(table.gradebookId, table.studentId),
    index("grade_rows_student_idx").on(table.studentId),
  ],
);

export const gradebookSubmissions = pgTable(
  "gradebook_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gradebookId: uuid("gradebook_id").notNull().references(() => gradebooks.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedByUserId: uuid("submitted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewFeedback: jsonb("review_feedback"),
    manualCorrectionUsed: boolean("manual_correction_used").notNull().default(false),
    manualCorrectedAt: timestamp("manual_corrected_at", { withTimezone: true }),
    manualCorrectedByUserId: uuid("manual_corrected_by_user_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("gradebook_submissions_gradebook_idx").on(table.gradebookId),
    index("gradebook_submissions_status_idx").on(table.status),
  ],
);

export const gradeSnapshots = pgTable(
  "grade_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gradebookSubmissionId: uuid("gradebook_submission_id").notNull().references(() => gradebookSubmissions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    scores: jsonb("scores").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("grade_snapshots_unique_submission_student").on(table.gradebookSubmissionId, table.studentId),
    index("grade_snapshots_submission_idx").on(table.gradebookSubmissionId),
  ],
);

export const assessmentScoreSources = pgTable(
  "assessment_score_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    gradebookId: uuid("gradebook_id").notNull().references(() => gradebooks.id, { onDelete: "restrict" }),
    gradeRowId: uuid("grade_row_id").notNull().references(() => gradeRows.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "restrict" }),
    componentKey: text("component_key").notNull(),
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("assessment_score_sources_source_unique").on(table.sourceType, table.sourceId),
    index("assessment_score_sources_gradebook_student_idx").on(table.gradebookId, table.studentId),
  ],
);

export type User = typeof users.$inferSelect;
export type UserCredential = typeof userCredentials.$inferSelect;
export type School = typeof schools.$inferSelect;
export type SchoolMembership = typeof schoolMemberships.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Capability = typeof capabilities.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type Student = typeof students.$inferSelect;
export type StudentGuardian = typeof studentGuardians.$inferSelect;
export type StudentDocument = typeof studentDocuments.$inferSelect;
export type SchoolSetup = typeof schoolSetup.$inferSelect;
export type AcademicSession = typeof academicSessions.$inferSelect;
export type AcademicTerm = typeof academicTerms.$inferSelect;
export type AcademicClass = typeof academicClasses.$inferSelect;
export type AcademicArm = typeof academicArms.$inferSelect;
export type AcademicSubject = typeof academicSubjects.$inferSelect;
export type Gradebook = typeof gradebooks.$inferSelect;
export type GradeRow = typeof gradeRows.$inferSelect;
export type GradebookSubmission = typeof gradebookSubmissions.$inferSelect;
export type GradeSnapshot = typeof gradeSnapshots.$inferSelect;
