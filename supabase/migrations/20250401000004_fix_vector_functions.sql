-- First drop the existing function
DROP FUNCTION IF EXISTS resize_embedding(vector, integer);

-- Then create the new function with proper vector handling
CREATE FUNCTION resize_embedding(embedding vector, target_dimension integer)
RETURNS vector
LANGUAGE plpgsql
AS $$
DECLARE
    current_dimension integer;
    embedding_array float[];
    result_array float[];
BEGIN
    -- Get vector dimension using the proper function
    SELECT vector_dim(embedding) INTO current_dimension;
    
    -- If dimensions match, return as is
    IF current_dimension = target_dimension THEN
        RETURN embedding;
    END IF;
    
    -- Convert vector to array for manipulation
    embedding_array := embedding::float[];
    
    -- If we need to pad with zeros
    IF current_dimension < target_dimension THEN
        -- Initialize result array with zeros
        result_array := array_fill(0::float, ARRAY[target_dimension]);
        
        -- Copy existing values
        FOR i IN 1..current_dimension LOOP
            result_array[i] := embedding_array[i];
        END LOOP;
        
        -- Return padded vector
        RETURN vector(result_array);
    
    -- If we need to truncate
    ELSE
        -- Extract subset of the array up to target dimension
        SELECT array_agg(v) INTO result_array
        FROM (
            SELECT embedding_array[i] as v
            FROM generate_series(1, target_dimension) as i
        ) subquery;
        
        -- Return truncated vector
        RETURN vector(result_array);
    END IF;
END;
$$;

-- Make sure the function exists in the public schema
ALTER FUNCTION resize_embedding(vector, integer) OWNER TO postgres;