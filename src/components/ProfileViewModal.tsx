import { X } from 'lucide-react';
import Avatar from './Avatar';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface ProfileViewModalProps {
  profile: Profile;
  onClose: () => void;
}

const ProfileViewModal = ({ profile, onClose }: ProfileViewModalProps) => {
  const formatLastSeen = (d: string | null) => {
    if (!d) return 'Unknown';
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden animate-[msg-pop_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        {/* Header banner */}
        <div className="h-24 bg-gradient-to-br from-primary/40 to-primary/10 relative">
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 -mt-10">
          <div className="relative inline-block">
            <Avatar name={profile.display_name} size={80} avatarUrl={profile.avatar_url} />
            {profile.is_online && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-app-online rounded-full border-3 border-card" />
            )}
          </div>

          <h2 className="text-lg font-bold text-foreground mt-3">{profile.display_name}</h2>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>

          {profile.bio && (
            <div className="mt-3 p-3 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bio</p>
              <p className="text-sm text-foreground">{profile.bio}</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="p-3 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <p className={`text-sm font-medium ${profile.is_online ? 'text-app-online' : 'text-muted-foreground'}`}>
                {profile.is_online ? '🟢 Online' : '⚫ Offline'}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Seen</p>
              <p className="text-sm text-foreground">{profile.is_online ? 'Now' : formatLastSeen(profile.last_seen)}</p>
            </div>
          </div>

          {profile.gender && (
            <div className="mt-2 p-3 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Gender</p>
              <p className="text-sm text-foreground capitalize">{profile.gender}</p>
            </div>
          )}

          {profile.readable_id && (
            <div className="mt-2 p-3 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">YST ID</p>
              <p className="text-sm text-foreground font-mono">{profile.readable_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileViewModal;
