import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onPlaylistCreated: (playlist: any) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, userId, onPlaylistCreated }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Please sign in to create a playlist');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: name.trim(),
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;
      
      onPlaylistCreated(data);
      onClose();
      setName('');
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">
          Create New Playlist
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Playlist"
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-500 hover:bg-violet-600 text-white py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Playlist'}
          </button>
        </form>
      </div>
    </div>
  );
}