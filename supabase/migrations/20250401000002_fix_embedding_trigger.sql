-- Migration to fix embedding trigger

-- Create a function to properly handle embedding dimensions
CREATE OR REPLACE FUNCTION fix_embedding_dimensions() RETURNS TRIGGER AS $function$
BEGIN
    -- Ensure embedding is 1536 dimensions
    IF array_length(NEW.embedding, 1) <> 1536 THEN
        NEW.embedding = array_append(NEW.embedding, 0);
        WHILE array_length(NEW.embedding, 1) < 1536 LOOP
            NEW.embedding = array_append(NEW.embedding, 0);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Create trigger for fixing embedding dimensions
DROP TRIGGER IF EXISTS fix_embedding_dimensions_trigger ON video_frames;
CREATE TRIGGER fix_embedding_dimensions_trigger
BEFORE INSERT OR UPDATE OF embedding ON video_frames
FOR EACH ROW
EXECUTE FUNCTION fix_embedding_dimensions();
