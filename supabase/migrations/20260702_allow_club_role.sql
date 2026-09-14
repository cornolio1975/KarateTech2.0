-- Migration to add the 'Club' role to the system_users table constraint.
-- Because PostgreSQL does not allow modifying a CHECK constraint directly,
-- we must drop the existing constraint and add a new one.

ALTER TABLE system_users 
DROP CONSTRAINT IF EXISTS system_users_role_check;

ALTER TABLE system_users
ADD CONSTRAINT system_users_role_check 
CHECK (role IN ('Admin', 'Co-Admin', 'Viewer', 'Club'));
