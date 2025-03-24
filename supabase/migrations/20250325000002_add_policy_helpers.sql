/*
  # Add helper functions for policy management
  
  1. Changes
    - Create helper functions to safely create/drop policies
    
  2. Notes
    - Makes future migrations more robust against policy conflicts
    - Provides reusable functions for policy management
*/

-- Helper function to safely create a policy if it doesn't exist
CREATE OR REPLACE FUNCTION safe_create_policy(
  p_table text,
  p_name text,
  p_operation text,
  p_role text,
  p_using text DEFAULT NULL,
  p_check text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  policy_exists boolean;
  sql_statement text;
BEGIN
  -- Check if policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = p_table AND policyname = p_name
  ) INTO policy_exists;
  
  -- Skip if policy already exists
  IF policy_exists THEN
    RAISE NOTICE 'Policy "%" on table "%" already exists, skipping', p_name, p_table;
    RETURN;
  END IF;
  
  -- Build SQL statement dynamically
  sql_statement := format('CREATE POLICY "%s" ON %s FOR %s TO %s', 
                          p_name, p_table, p_operation, p_role);
  
  IF p_using IS NOT NULL THEN
    sql_statement := sql_statement || format(' USING (%s)', p_using);
  END IF;
  
  IF p_check IS NOT NULL THEN
    sql_statement := sql_statement || format(' WITH CHECK (%s)', p_check);
  END IF;
  
  -- Execute the statement
  EXECUTE sql_statement;
  
  RAISE NOTICE 'Created policy "%" on table "%"', p_name, p_table;
END;
$$ LANGUAGE plpgsql;

-- Helper function to drop a policy if it exists
CREATE OR REPLACE FUNCTION safe_drop_policy(
  p_table text,
  p_name text
) RETURNS void AS $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Check if policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = p_table AND policyname = p_name
  ) INTO policy_exists;
  
  -- Only drop if exists
  IF policy_exists THEN
    EXECUTE format('DROP POLICY "%s" ON %s', p_name, p_table);
    RAISE NOTICE 'Dropped policy "%" on table "%"', p_name, p_table;
  ELSE
    RAISE NOTICE 'Policy "%" on table "%" does not exist, skipping', p_name, p_table;
  END IF;
END;
$$ LANGUAGE plpgsql;
