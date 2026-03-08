import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Camera, Save, Key, User, Palette, Circle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

import wallpaperGeometric from '@/assets/wallpaper-geometric.jpg';
import wallpaperGalaxy from '@/assets/wallpaper-galaxy.jpg';
import wallpaperForest from '@/assets/wallpaper-forest.jpg';
import wallpaperOcean from '@/assets/wallpaper-ocean.jpg';
import wallpaperCity from '@/assets/wallpaper-city.jpg';

type Profile = Tables<'profiles'>;

interface SettingsPanelProps {
  me: Profile;
  onProfileUpdate: (profile: Profile) => void;
}

const THEMES = [
  { name: 'Default Dark', bg: '200 25% 5%', panel: '200 25% 10%', primary: '160 100% 33%', bubbleIn: '200 18% 17%', bubbleOut: '120 80% 90%', chatBg: '200 30% 5%' },
  { name: 'Ocean Blue', bg: '220 30% 8%', panel: '220 25% 12%', primary: '210 100% 50%', bubbleIn: '220 20% 18%', bubbleOut: '200 80% 88%', chatBg: '220 30% 6%' },
  { name: 'Purple Night', bg: '270 25% 8%', panel: '270 20% 12%', primary: '270 80% 60%', bubbleIn: '270 18% 18%', bubbleOut: '270 60% 90%', chatBg: '270 25% 6%' },
  { name: 'Rose', bg: '340 20% 8%', panel: '340 18% 12%', primary: '340 80% 55%', bubbleIn: '340 16% 18%', bubbleOut: '340 60% 90%', chatBg: '340 20% 6%' },
  { name: 'Emerald', bg: '160 25% 5%', panel: '160 20% 10%', primary: '160 80% 40%', bubbleIn: '160 18% 16%', bubbleOut: '160 60% 88%', chatBg: '160 25% 4%' },
];

const WALLPAPERS = [
  { name: 'None', src: '', thumb: '' },
  { name: 'Geometric', src: wallpaperGeometric, thumb: wallpaperGeometric },
  { name: 'Galaxy', src: wallpaperGalaxy, thumb: wallpaperGalaxy },
  { name: 'Forest', src: wallpaperForest, thumb: wallpaperForest },
  { name: 'Ocean', src: wallpaperOcean, thumb: wallpaperOcean },
  { name: 'City', src: wallpaperCity, thumb: wallpaperCity },
];

const RADIUS_OPTIONS = [
  { label: 'Square', value: 'none', css: '0px' },
  { label: 'Slight', value: 'sm', css: '4px' },
  { label: 'Rounded', value: 'lg', css: '12px' },
  { label: 'Pill', value: 'xl', css: '20px' },
];

const applyThemeVars = (theme: typeof THEMES[0]) => {
  const r = document.documentElement.style;
  r.setProperty('--background', theme.bg);
  r.setProperty('--wa-panel', theme.panel);
  r.setProperty('--primary', theme.primary);
  r.setProperty('--ring', theme.primary);
  r.setProperty('--wa-bubble-in', theme.bubbleIn);
  r.setProperty('--wa-green-light', theme.bubbleOut);
  r.setProperty('--wa-chat-bg', theme.chatBg);
  r.setProperty('--sidebar-background', theme.panel);
  r.setProperty('--wa-header', theme.bubbleIn);
  r.setProperty('--card', theme.panel);
};

export const applyBubbleRadius = (value: string) => {
  const opt = RADIUS_OPTIONS.find(o => o.value === value) || RADIUS_OPTIONS[2];
  document.documentElement.style.setProperty('--bubble-radius', opt.css);
};

export const applyWallpaper = (src: string) => {
  // Store globally for ChatArea to pick up
  (window as any).__chatWallpaper = src;
  // Dispatch event for live update
  window.dispatchEvent(new CustomEvent('wallpaper-change', { detail: src }));
};

export const loadSavedTheme = () => {
  const savedTheme = localStorage.getItem('chat-theme');
  if (savedTheme) {
    try {
      applyThemeVars(JSON.parse(savedTheme));
    } catch {}
  }
  const savedRadius = localStorage.getItem('bubble-radius') || 'lg';
  applyBubbleRadius(savedRadius);
  const savedWallpaper = localStorage.getItem('chat-wallpaper') || '';
  applyWallpaper(savedWallpaper);
};

const SettingsPanel = ({ me, onProfileUpdate }: SettingsPanelProps) => {
  const [displayName, setDisplayName] = useState(me.display_name);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio || '');
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveOnline, setSaveOnline] = useState(true);
  const [bubbleRadius, setBubbleRadius] = useState(() => localStorage.getItem('bubble-radius') || 'lg');
  const [activeWallpaper, setActiveWallpaper] = useState(() => localStorage.getItem('chat-wallpaper') || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const updateProfile = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), username: username.trim().toLowerCase(), bio: bio.trim() })
      .eq('id', me.id)
      .select()
      .single();

    if (error) { toast.error('Failed to update profile'); setSaving(false); return; }
    toast.success('Profile updated!');
    if (data) onProfileUpdate(data);
    setSaving(false);
  };

  const uploadAvatar = async (file: File) => {
    const path = `avatars/${me.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('chat-files').upload(path, file);
    if (error) { toast.error('Upload failed'); return; }
    const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
    
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', me.id)
      .select()
      .single();

    if (updateError) { toast.error('Failed to update avatar'); return; }
    toast.success('Profile picture updated!');
    if (data) onProfileUpdate(data);
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); return; }
    toast.success('Password changed!');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordChange(false);
  };

  const applyTheme = async (theme: typeof THEMES[0]) => {
    applyThemeVars(theme);
    localStorage.setItem('chat-theme', JSON.stringify(theme));

    if (saveOnline) {
      await supabase.from('profiles').update({ chat_theme: theme as any }).eq('id', me.id);
    }
    toast.success(`Theme "${theme.name}" applied${saveOnline ? ' & synced' : ' locally'}!`);
  };

  const handleRadiusChange = async (value: string) => {
    setBubbleRadius(value);
    applyBubbleRadius(value);
    localStorage.setItem('bubble-radius', value);

    if (saveOnline) {
      await supabase.from('profiles').update({ bubble_radius: value } as any).eq('id', me.id);
    }
    toast.success('Chat bubble style updated!');
  };

  const handleWallpaperChange = (src: string) => {
    setActiveWallpaper(src);
    localStorage.setItem('chat-wallpaper', src);
    applyWallpaper(src);
    toast.success(src ? 'Wallpaper applied!' : 'Wallpaper removed!');
  };

  const inputClass = "bg-wa-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full";

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Profile Picture */}
      <div className="flex flex-col items-center py-6 border-b border-border">
        <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
          <Avatar name={me.display_name} size={80} avatarUrl={me.avatar_url} />
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={24} className="text-white" />
          </div>
        </div>
        <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) uploadAvatar(e.target.files[0]); }} />
        <p className="text-xs text-muted-foreground mt-2">Tap to change photo</p>
      </div>

      {/* Profile Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Profile</h3>
        </div>
        <div className="flex flex-col gap-2.5">
          <input className={inputClass} placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <input className={inputClass} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <textarea className={`${inputClass} resize-none`} placeholder="Bio" rows={2} value={bio} onChange={e => setBio(e.target.value)} />
          <button onClick={updateProfile} disabled={saving} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-wa-green-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setShowPasswordChange(!showPasswordChange)} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
          <Key size={16} className="text-primary" /> Change Password
        </button>
        {showPasswordChange && (
          <div className="flex flex-col gap-2.5 mt-3">
            <input className={inputClass} type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <input className={inputClass} type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <button onClick={changePassword} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-wa-green-dark transition-colors">
              Update Password
            </button>
          </div>
        )}
      </div>

      {/* Theme */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Chat Theme</h3>
          </div>
          <button
            onClick={() => setSaveOnline(!saveOnline)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${saveOnline ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground'}`}
          >
            {saveOnline ? '☁️ Online' : '💾 Local'}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">
          {saveOnline ? 'Theme syncs across all your devices' : 'Theme saved on this device only'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map(theme => (
            <button
              key={theme.name}
              onClick={() => applyTheme(theme)}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full border border-border" style={{ background: `hsl(${theme.primary})` }} />
              <span className="text-xs text-foreground">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallpaper */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Chat Wallpaper</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {WALLPAPERS.map(wp => (
            <button
              key={wp.name}
              onClick={() => handleWallpaperChange(wp.src)}
              className={`relative rounded-lg overflow-hidden border-2 transition-colors aspect-square ${
                activeWallpaper === wp.src ? 'border-primary' : 'border-border hover:border-muted-foreground'
              }`}
            >
              {wp.src ? (
                <img src={wp.thumb} alt={wp.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-wa-chat-bg flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">None</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-white text-center py-0.5">
                {wp.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bubble Radius */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Circle size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Chat Bubble Style</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleRadiusChange(opt.value)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors ${
                bubbleRadius === opt.value ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div
                className="w-10 h-6 bg-primary/60"
                style={{ borderRadius: opt.css }}
              />
              <span className="text-[10px] text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
