INSERT INTO "capabilities" ("key", "label", "domain") VALUES
  ('attendance.read', 'Read attendance', 'attendance'),
  ('attendance.write', 'Record attendance', 'attendance'),
  ('attendance.approve', 'Approve attendance', 'attendance')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_capabilities" ("role_id", "capability_id")
SELECT r.id, c.id
FROM "roles" r
CROSS JOIN "capabilities" c
WHERE r.key IN ('administrator', 'principal', 'teacher', 'examinations')
  AND c.key IN ('attendance.read', 'attendance.write', 'attendance.approve')
ON CONFLICT DO NOTHING;
