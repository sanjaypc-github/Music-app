/*
  # Create songs table and policies

  1. New Tables
    - `songs`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `artist` (text, not null)
      - `duration` (text, not null)
      - `cover_url` (text, not null)
      - `created_at` (timestamp with time zone, default: now())

  2. Security
    - Enable RLS on `songs` table
    - Add policies for:
      - Anyone can read songs (select)
      - Only authenticated users can insert/update/delete songs
*/

CREATE TABLE IF NOT EXISTS songs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    artist text NOT NULL,
    duration text NOT NULL,
    cover_url text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read songs"
    ON songs
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated users can insert songs"
    ON songs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update their songs"
    ON songs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their songs"
    ON songs
    FOR DELETE
    TO authenticated
    USING (true);

-- Insert initial songs
INSERT INTO songs (title, artist, duration, cover_url) VALUES
    ('Midnight Dreams', 'Luna Eclipse', '3:45', 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop'),
    ('Neon Lights', 'Digital Wave', '4:20', 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=300&h=300&fit=crop'),
    ('Ocean Breeze', 'Coastal Vibes', '3:55', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&h=300&fit=crop');