import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Camera, Save, Key, User, Palette } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface SettingsPanelProps {
  me: Profile;
  onProfileUpdate: (profile: Profile) => void;
}

const THEMES = [
  { name: 'Default Dark', bg: '200 25% 5%', panel: '200 25% 10%', primary: '160 100% 33%' },
  { name: 'Ocean Blue', bg: '220 30% 8%', panel: '220 25% 12%', primary: '210 100% 50%' },
  { name: 'Purple Night', bg: '270 25% 8%', panel: '270 20% 12%', primary: '270 80% 60%' },
  { name: 'Rose', bg: '340 20% 8%', panel: '340 18% 12%', primary: '340 80% 55%' },
  { name: 'Emerald', bg: '160 25% 5%', panel: '160 20% 10%', primary: '160 80% 40%' },
];

const SettingsPanel = ({ me, onProfileUpdate }: SettingsPanelProps) => {
  const [displayName, setDisplayName] = useState(me.display_name);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio || '');
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const applyTheme = (theme: typeof THEMES[0]) => {
    document.documentElement.style.setProperty('--background', theme.bg);
    document.documentElement.style.setProperty('--wa-panel', theme.panel);
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--ring', theme.primary);
    localStorage.setItem('chat-theme', JSON.stringify(theme));
    toast.success(`Theme "${theme.name}" applied!`);
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
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Chat Theme</h3>
        </div>
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
    </div>
  );
};

export default SettingsPanel;
