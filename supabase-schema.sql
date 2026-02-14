-- Create bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON public.bookmarks(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;

-- Policy: Users can only view their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
    ON public.bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own bookmarks
CREATE POLICY "Users can insert their own bookmarks"
    ON public.bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
    ON public.bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.bookmarks TO postgres, service_role;
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;

-- ============================================
-- REALTIME CONFIGURATION (Fix DELETE events)
-- ============================================

-- Add bookmarks table to realtime publication with all events (INSERT, UPDATE, DELETE)
-- This ensures DELETE events are broadcast across tabs
DO $$
BEGIN
    -- Try to drop the table from publication (ignore if it doesn't exist)
    ALTER PUBLICATION supabase_realtime DROP TABLE public.bookmarks;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Table wasn't in publication, that's fine
END $$;

-- Add bookmarks table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;

-- Verify the publication is set up correctly
-- This should show the bookmarks table in the publication
SELECT schemaname, tablename, pubinsert, pubupdate, pubdelete 
FROM pg_publication_tables 
WHERE tablename = 'bookmarks';
