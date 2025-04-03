/*
  # Add audio URL to songs table and update sample data

  1. Schema Changes
    - Add `audio_url` column to songs table for storing song file URLs
    
  2. Data Updates
    - Update sample data with real, playable audio files
    - Using royalty-free music from Pixabay (valid, working URLs)
*/

-- Add audio_url column
ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_url text NOT NULL DEFAULT '';

-- Update existing songs with real audio URLs
UPDATE songs SET audio_url = 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3' WHERE title = 'Midnight Dreams';
UPDATE songs SET audio_url = 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_f52a5968b1.mp3' WHERE title = 'Neon Lights';
UPDATE songs SET audio_url = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' WHERE title = 'Ocean Breeze';

-- Insert additional songs with audio
INSERT INTO songs (title, artist, duration, cover_url, audio_url) VALUES
    ('Electronic Dreams', 'Synthwave Master', '3:12', 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&h=300&fit=crop', 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c9a4a11957.mp3'),
    ('Chill Vibes', 'Lofi Beats', '2:45', 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=300&h=300&fit=crop', 'https://cdn.pixabay.com/download/audio/2023/03/06/audio_b86b3d2c36.mp3');