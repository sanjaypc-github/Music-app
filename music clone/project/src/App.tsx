import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Shuffle, Repeat, Heart, Music2, UserCircle, LogOut, Home, Library, PlusCircle, Search, FileHeart as HeartFilled, Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import toast, { Toaster } from 'react-hot-toast';
import type { User } from '@supabase/supabase-js';
import type { Profile } from './lib/supabase';

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover_url: string;
  audio_url: string;
}

interface Playlist {
  id: string;
  name: string;
  user_id: string;
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [volume, setVolume] = useState(1);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'liked' | 'playlist'>('home');
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchSongs();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchPlaylists(session.user.id);
        fetchLikedSongs(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  async function fetchPlaylists(userId: string) {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setPlaylists(data);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  }

  async function fetchLikedSongs(userId: string) {
    try {
      const { data, error } = await supabase
        .from('liked_songs')
        .select('song_id')
        .eq('user_id', userId);

      if (error) throw error;
      setLikedSongs(data.map(item => item.song_id));
    } catch (error) {
      console.error('Error fetching liked songs:', error);
    }
  }

  async function fetchPlaylistSongs(playlistId: string) {
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('songs(*)')
        .eq('playlist_id', playlistId);

      if (error) throw error;
      setPlaylistSongs(data.map(item => item.songs));
    } catch (error) {
      console.error('Error fetching playlist songs:', error);
    }
  }

  async function addSongToPlaylist(playlistId: string, songId: string) {
    if (!user) {
      toast.error('Please sign in to add songs to playlists');
      return;
    }

    try {
      const { error } = await supabase
        .from('playlist_songs')
        .insert({ playlist_id: playlistId, song_id: songId });

      if (error) throw error;
      toast.success('Song added to playlist');
      
      if (currentPlaylist?.id === playlistId) {
        fetchPlaylistSongs(playlistId);
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      toast.error('Failed to add song to playlist');
    }
  }

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.audio_url;
      audioRef.current.load(); // Add this line to force reload the audio
      audioRef.current.volume = volume;
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          toast.error('Error playing audio');
        });
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          toast.error('Error playing audio');
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(progress);
      setCurrentTime(formatTime(audioRef.current.currentTime));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  async function fetchSongs() {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setSongs(data);
      if (data.length > 0 && !currentSong) {
        setCurrentSong(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch songs');
    } finally {
      setIsLoading(false);
    }
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (currentSong && songs.length > 0) {
      const currentIndex = songs.findIndex(song => song.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % songs.length;
      setCurrentSong(songs[nextIndex]);
    }
  };

  const handlePrevious = () => {
    if (currentSong && songs.length > 0) {
      const currentIndex = songs.findIndex(song => song.id === currentSong.id);
      const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
      setCurrentSong(songs[prevIndex]);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
      setUser(null);
      setProfile(null);
      setPlaylists([]);
      setLikedSongs([]);
    }
  };

  const handleLikeSong = async (songId: string) => {
    if (!user) {
      toast.error('Please sign in to like songs');
      return;
    }

    try {
      if (likedSongs.includes(songId)) {
        const { error } = await supabase
          .from('liked_songs')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', songId);

        if (error) throw error;
        setLikedSongs(likedSongs.filter(id => id !== songId));
        toast.success('Song removed from liked songs');
      } else {
        const { error } = await supabase
          .from('liked_songs')
          .insert({ user_id: user.id, song_id: songId });

        if (error) throw error;
        setLikedSongs([...likedSongs, songId]);
        toast.success('Song added to liked songs');
      }
    } catch (error) {
      console.error('Error updating liked songs:', error);
      toast.error('Error updating liked songs');
    }
  };

  const renderSongOptions = (song: Song) => {
    if (!user) return null;

    return (
      <div className="relative group">
        <button
          className="text-violet-300 hover:text-violet-500 transition-colors p-2"
          onClick={(e) => {
            e.stopPropagation();
            const menu = document.getElementById(`song-menu-${song.id}`);
            if (menu) {
              menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            }
          }}
        >
          <Plus className="h-5 w-5" />
        </button>
        <div
          id={`song-menu-${song.id}`}
          className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-lg rounded-lg shadow-lg z-50 hidden"
          style={{ top: '100%' }}
        >
          <div className="py-1">
            {playlists.map(playlist => (
              <button
                key={playlist.id}
                className="block w-full text-left px-4 py-2 text-sm text-violet-300 hover:bg-white/5 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  addSongToPlaylist(playlist.id, song.id);
                  const menu = document.getElementById(`song-menu-${song.id}`);
                  if (menu) {
                    menu.style.display = 'none';
                  }
                }}
              >
                Add to {playlist.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'search':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Search</h2>
            <p className="text-violet-300">Search functionality coming soon...</p>
          </div>
        );
      case 'library':
        return (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Your Library</h2>
              <button
                onClick={() => setIsCreatePlaylistModalOpen(true)}
                className="flex items-center gap-2 text-violet-300 hover:text-white transition-colors"
              >
                <PlusCircle className="h-5 w-5" />
                Create Playlist
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map(playlist => (
                <div
                  key={playlist.id}
                  onClick={() => {
                    setCurrentPlaylist(playlist);
                    setCurrentView('playlist');
                    fetchPlaylistSongs(playlist.id);
                  }}
                  className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <h3 className="text-white font-medium">{playlist.name}</h3>
                  <p className="text-violet-300 text-sm">Playlist</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'liked':
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Liked Songs</h2>
            <div className="space-y-4">
              {songs
                .filter(song => likedSongs.includes(song.id))
                .map(song => (
                  <div
                    key={song.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleSongSelect(song)}
                  >
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{song.title}</h4>
                      <p className="text-violet-300 text-sm">{song.artist}</p>
                    </div>
                    <span className="text-violet-300 text-sm">{song.duration}</span>
                    {renderSongOptions(song)}
                    <button
                      className="text-violet-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeSong(song.id);
                      }}
                    >
                      <HeartFilled className="h-5 w-5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        );
      case 'playlist':
        return currentPlaylist ? (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">{currentPlaylist.name}</h2>
            <div className="space-y-4">
              {playlistSongs.map(song => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => handleSongSelect(song)}
                >
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{song.title}</h4>
                    <p className="text-violet-300 text-sm">{song.artist}</p>
                  </div>
                  <span className="text-violet-300 text-sm">{song.duration}</span>
                  {renderSongOptions(song)}
                  <button
                    className={`text-violet-300 hover:text-violet-500 transition-colors`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikeSong(song.id);
                    }}
                  >
                    {likedSongs.includes(song.id) ? (
                      <HeartFilled className="h-5 w-5" />
                    ) : (
                      <Heart className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      default:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6">All Songs</h2>
            <div className="space-y-4">
              {songs.map(song => (
                <div
                  key={song.id}
                  className={`flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer ${
                    currentSong?.id === song.id ? 'bg-white/5' : ''
                  }`}
                  onClick={() => handleSongSelect(song)}
                >
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{song.title}</h4>
                    <p className="text-violet-300 text-sm">{song.artist}</p>
                  </div>
                  <span className="text-violet-300 text-sm">{song.duration}</span>
                  {renderSongOptions(song)}
                  <button
                    className={`text-violet-300 hover:text-violet-500 transition-colors`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikeSong(song.id);
                    }}
                  >
                    {likedSongs.includes(song.id) ? (
                      <HeartFilled className="h-5 w-5" />
                    ) : (
                      <Heart className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 flex">
      <Toaster position="top-center" />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        userId={user?.id}
        onPlaylistCreated={(playlist) => {
          setPlaylists([...playlists, playlist]);
          toast.success('Playlist created successfully');
        }}
      />
      
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => handleNext()}
      />
      
      {/* Sidebar */}
      <div className="w-64 bg-black/20 backdrop-blur-xl p-6">
        <div className="flex items-center gap-2 mb-8">
          <Music2 className="h-8 w-8 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Wavelength</h1>
        </div>

        <nav className="space-y-4">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
              currentView === 'home' ? 'bg-white/10 text-white' : 'text-violet-300 hover:text-white'
            }`}
          >
            <Home className="h-5 w-5" />
            Home
          </button>
          <button
            onClick={() => setCurrentView('search')}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
              currentView === 'search' ? 'bg-white/10 text-white' : 'text-violet-300 hover:text-white'
            }`}
          >
            <Search className="h-5 w-5" />
            Search
          </button>
          <button
            onClick={() => setCurrentView('library')}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
              currentView === 'library' ? 'bg-white/10 text-white' : 'text-violet-300 hover:text-white'
            }`}
          >
            <Library className="h-5 w-5" />
            Your Library
          </button>
          <button
            onClick={() => setCurrentView('liked')}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
              currentView === 'liked' ? 'bg-white/10 text-white' : 'text-violet-300 hover:text-white'
            }`}
          >
            <Heart className="h-5 w-5" />
            Liked Songs
          </button>
        </nav>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Playlists</h2>
            <button
              onClick={() => setIsCreatePlaylistModalOpen(true)}
              className="text-violet-300 hover:text-white transition-colors"
            >
              <PlusCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-2">
            {playlists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => {
                  setCurrentPlaylist(playlist);
                  setCurrentView('playlist');
                  fetchPlaylistSongs(playlist.id);
                }}
                className="text-violet-300 hover:text-white transition-colors text-sm w-full text-left truncate"
              >
                {playlist.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => window.history.back()}
              className="bg-black/20 rounded-full p-2 text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => window.history.forward()}
              className="bg-black/20 rounded-full p-2 text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-white">{profile?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-violet-300 hover:text-white transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 text-violet-300 hover:text-white transition-colors"
              >
                <UserCircle className="h-5 w-5" />
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>

        {/* Player */}
        {currentSong && (
          <div className="bg-black/30 backdrop-blur-lg border-t border-white/10 p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <img
                  src={currentSong.cover_url}
                  alt="Now Playing"
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div>
                  <h4 className="text-white font-medium">{currentSong.title}</h4>
                  <p className="text-violet-300 text-sm">{currentSong.artist}</p>
                </div>
                <button
                  onClick={() => handleLikeSong(currentSong.id)}
                  className={`text-violet-300 hover:text-violet-500 transition-colors ml-4`}
                >
                  {likedSongs.includes(currentSong.id) ? (
                    <HeartFilled className="h-5 w-5" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-center gap-6">
                  <button className="text-violet-300 hover:text-white transition-colors">
                    <Shuffle className="h-5 w-5" />
                  </button>
                  <button
                    className="text-violet-300 hover:text-white transition-colors"
                    onClick={handlePrevious}
                  >
                    <SkipBack className="h-6 w-6" />
                  </button>
                  <button
                    className="bg-white rounded-full p-2 text-violet-900 hover:text-violet-700 transition-colors"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>
                  <button
                    className="text-violet-300 hover:text-white transition-colors"
                    onClick={handleNext}
                  >
                    <SkipForward className="h-6 w-6" />
                  </button>
                  <button className="text-violet-300 hover:text-white transition-colors">
                    <Repeat className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-violet-300">{currentTime}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-violet-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                  <span className="text-xs text-violet-300">{currentSong.duration}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 justify-end">
                <Volume2 className="text-violet-300 h-5 w-5" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-violet-800 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;