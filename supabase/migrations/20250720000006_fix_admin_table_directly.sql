-- Temporarily disable RLS to fix the admin issue
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Ensure the user is an admin
INSERT INTO admin_users (user_id, email, created_by)
SELECT 
  id,
  email,
  id
FROM auth.users
WHERE email = 'ilikerobot@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Note: The specific user ID will only work if that user exists in auth.users

-- Re-enable RLS with better policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own admin record" ON admin_users;
DROP POLICY IF EXISTS "Existing admins can read all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Existing admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "First admin can self-insert" ON admin_users;

-- Create a simple policy that allows authenticated users to read the table
CREATE POLICY "Anyone can check admin status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete
-- This prevents the recursion issue entirely

-- Show current admins
DO $$
DECLARE
  admin_count INTEGER;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_users;
  RAISE NOTICE 'Total admins in system: %', admin_count;
  
  -- List all admins
  FOR r IN SELECT user_id, email FROM admin_users
  LOOP
    RAISE NOTICE 'Admin: % (%)', r.email, r.user_id;
  END LOOP;
END $$;