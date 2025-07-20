-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin users
CREATE POLICY "Admins can view admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Only admins can insert new admins
CREATE POLICY "Admins can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no user_id provided, check current user
  IF check_user_id IS NULL THEN
    check_user_id := auth.uid();
  END IF;
  
  -- Check if user exists in admin_users table
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = check_user_id
  );
END;
$$;

-- Create function to check current user admin status (for RPC)
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN is_admin(auth.uid());
END;
$$;

-- Add initial admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user_id for ilikerobot@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'ilikerobot@gmail.com'
  LIMIT 1;
  
  -- Insert as admin if user exists
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO admin_users (user_id, email)
    VALUES (admin_user_id, 'ilikerobot@gmail.com')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Added ilikerobot@gmail.com as admin';
  ELSE
    RAISE NOTICE 'User ilikerobot@gmail.com not found';
  END IF;
END $$;