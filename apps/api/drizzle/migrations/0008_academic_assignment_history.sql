ALTER TABLE "teacher_class_assignments" ADD COLUMN "effective_from" date;
ALTER TABLE "teacher_class_assignments" ADD COLUMN "effective_to" date;
ALTER TABLE "teacher_class_assignments" ALTER COLUMN "effective_from" SET NOT NULL;
ALTER TABLE "teacher_subject_assignments" ADD COLUMN "effective_from" date;
ALTER TABLE "teacher_subject_assignments" ADD COLUMN "effective_to" date;
ALTER TABLE "teacher_subject_assignments" ALTER COLUMN "effective_from" SET NOT NULL;
CREATE INDEX "teacher_class_assignments_effective_idx" ON "teacher_class_assignments" ("school_id", "class_id", "arm_id", "session_id", "term_id", "effective_from", "effective_to");
CREATE INDEX "teacher_subject_assignments_effective_idx" ON "teacher_subject_assignments" ("school_id", "subject_id", "class_id", "arm_id", "session_id", "term_id", "effective_from", "effective_to");
