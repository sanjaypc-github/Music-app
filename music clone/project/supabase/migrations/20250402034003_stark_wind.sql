/*
  # Add playlists and liked songs functionality

  1. New Tables
    - `playlists`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp with time zone)
    
    - `playlist_songs`
      - `playlist_id` (uuid, references playlists)
      - `song_id` (uuid, references songs)
      - `added_at` (timestamp with time zone)
    
    - `liked_songs`
      - `user_id` (uuid, references profiles)
      - `song_id` (uuid, references songs)
      - `liked_at` (timestamp with time zone)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access
*/

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Create playlist_songs table
CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE,
    song_id uuid REFERENCES songs(id) ON DELETE CASCADE,
    added_at timestamptz DEFAULT now(),
    PRIMARY KEY (playlist_id, song_id)
);

-- Create liked_songs table
CREATE TABLE IF NOT EXISTS liked_songs (
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    song_id uuid REFERENCES songs(id) ON DELETE CASCADE,
    liked_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, song_id)
);

-- Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_songs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own playlists" ON playlists;
    DROP POLICY IF EXISTS "Users can create playlists" ON playlists;
    DROP POLICY IF EXISTS "Users can update their own playlists" ON playlists;
    DROP POLICY IF EXISTS "Users can delete their own playlists" ON playlists;
    DROP POLICY IF EXISTS "Users can view songs in their playlists" ON playlist_songs;
    DROP POLICY IF EXISTS "Users can add songs to their playlists" ON playlist_songs;
    DROP POLICY IF EXISTS "Users can remove songs from their playlists" ON playlist_songs;
    DROP POLICY IF EXISTS "Users can view their liked songs" ON liked_songs;
    DROP POLICY IF EXISTS "Users can like songs" ON liked_songs;
    DROP POLICY IF EXISTS "Users can unlike songs" ON liked_songs;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Playlists policies
CREATE POLICY "Users can view their own playlists"
    ON playlists
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create playlists"
    ON playlists
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
    ON playlists
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
    ON playlists
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Playlist songs policies
CREATE POLICY "Users can view songs in their playlists"
    ON playlist_songs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE id = playlist_songs.playlist_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add songs to their playlists"
    ON playlist_songs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE id = playlist_songs.playlist_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove songs from their playlists"
    ON playlist_songs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE id = playlist_songs.playlist_id
            AND user_id = auth.uid()
        )
    );

-- Liked songs policies
CREATE POLICY "Users can view their liked songs"
    ON liked_songs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can like songs"
    ON liked_songs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike songs"
    ON liked_songs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);