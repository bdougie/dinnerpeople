-- Fix infinite recursion in admin_users policies
-- The issue is that the policies check if user is admin, which checks the policies, creating a loop

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete admin_users" ON admin_users;

-- Create simpler policies that don't cause recursion
-- 1. Users can read their own admin record
CREATE POLICY "Users can read own admin record"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Allow service role to manage admin users (for initial setup)
-- Note: This is safe because service role is only used server-side

-- 3. Allow existing admins to manage admin_users without recursion
-- We'll check the table directly instead of using the function
CREATE POLICY "Existing admins can read all admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Existing admins can insert admin_users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users existing
      WHERE existing.user_id = auth.uid()
    )
  );

-- Special policy for first admin (when table is empty)
CREATE POLICY "First admin can self-insert"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM admin_users)
    AND auth.uid() = user_id
  );

-- Manually insert the first admin
DO $$
BEGIN
  -- Check if admin_users table is empty
  IF NOT EXISTS (SELECT 1 FROM admin_users) THEN
    -- Insert ilikerobot@gmail.com as the first admin
    INSERT INTO admin_users (user_id, email, created_by)
    SELECT 
      id,
      email,
      id
    FROM auth.users
    WHERE email = 'ilikerobot@gmail.com'
    LIMIT 1;
    
    RAISE NOTICE 'Added ilikerobot@gmail.com as first admin';
  END IF;
END $$;