-- Create a function to make a user admin
-- This bypasses RLS policies to avoid recursion issues

CREATE OR REPLACE FUNCTION make_user_admin(
  target_user_id UUID,
  target_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner (postgres)
AS $$
BEGIN
  -- Insert the user as admin
  INSERT INTO admin_users (user_id, email, created_by)
  VALUES (target_user_id, target_email, target_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'Error making user admin: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION make_user_admin TO authenticated;

-- Immediately make ilikerobot@gmail.com an admin
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'ilikerobot@gmail.com';
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_user_id IS NOT NULL THEN
    -- Make them admin
    INSERT INTO admin_users (user_id, email, created_by)
    VALUES (v_user_id, v_email, v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Made % an admin with ID %', v_email, v_user_id;
  ELSE
    RAISE NOTICE 'User % not found in auth.users', v_email;
  END IF;
END $$;