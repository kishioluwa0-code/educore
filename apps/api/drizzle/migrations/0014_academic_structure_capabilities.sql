INSERT INTO "capabilities" ("key", "label", "domain") VALUES
  ('academic.structure.read', 'Read academic structure', 'academics'),
  ('academic.structure.manage', 'Manage academic structure', 'academics')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_capabilities" ("role_id", "capability_id")
SELECT r.id, c.id
FROM "roles" r
CROSS JOIN "capabilities" c
WHERE r.key IN ('administrator', 'principal')
  AND c.key IN ('academic.structure.read', 'academic.structure.manage')
ON CONFLICT DO NOTHING;
