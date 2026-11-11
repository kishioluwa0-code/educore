INSERT INTO "capabilities" ("key", "label", "domain") VALUES
  ('academic.assignment.read', 'Read academic assignments', 'academics'),
  ('academic.assignment.manage', 'Manage academic assignments', 'academics')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_capabilities" ("role_id", "capability_id")
SELECT r.id, c.id
FROM "roles" r
CROSS JOIN "capabilities" c
WHERE r.key IN ('administrator', 'principal')
  AND c.key IN ('academic.assignment.read', 'academic.assignment.manage')
ON CONFLICT DO NOTHING;
