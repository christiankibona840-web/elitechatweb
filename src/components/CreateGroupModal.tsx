import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { X, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface CreateGroupModalProps {
  me: Profile;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

const CreateGroupModal = ({ me, onClose, onCreated }: CreateGroupModalProps) => {
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      // First get contact IDs
      const { data: contactRows, error: contactError } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', me.id);

      if (contactError || !contactRows || contactRows.length === 0) {
        setContacts([]);
        setLoadingContacts(false);
        return;
      }

      const contactIds = contactRows.map(c => c.contact_id);

      // Then fetch profiles for those IDs
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', contactIds);

      if (profileError) {
        console.error('Error loading profiles:', profileError);
        setContacts([]);
      } else {
        setContacts(profiles || []);
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
      setContacts([]);
    }
    setLoadingContacts(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const createGroup = async () => {
    if (!name.trim()) { toast.error('Enter a group name'); return; }
    if (selected.length === 0) { toast.error('Select at least one person'); return; }

    setLoading(true);
    try {
      // Step 1: Create group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: name.trim(), created_by: me.id })
        .select()
        .single();

      if (groupError || !group) {
        toast.error('Failed to create group: ' + (groupError?.message || 'Unknown error'));
        setLoading(false);
        return;
      }

      // Step 2: Add creator as admin first
      const { error: creatorError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: me.id, role: 'admin' });

      if (creatorError) {
        toast.error('Failed to add you to group: ' + creatorError.message);
        setLoading(false);
        return;
      }

      // Step 3: Determine roles for selected members
      const selectedProfiles = contacts.filter(c => selected.includes(c.id));
      const maleAdmin = selectedProfiles.find(p => p.gender === 'male');
      const femaleAdmin = selectedProfiles.find(p => p.gender === 'female');

      // Step 4: Add members one by one to avoid batch RLS issues
      for (const uid of selected) {
        const isSecondAdmin = (maleAdmin && uid === maleAdmin.id) || (femaleAdmin && uid === femaleAdmin.id);
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            user_id: uid,
            role: isSecondAdmin ? 'admin' : 'member',
          });

        if (memberError) {
          console.error(`Failed to add member ${uid}:`, memberError.message);
        }
      }

      const adminCount = 1 + (maleAdmin ? 1 : 0) + (femaleAdmin && femaleAdmin.id !== maleAdmin?.id ? 1 : 0);
      toast.success(`✅ Group "${name}" created with ${adminCount} admin(s)`);
      onCreated(group.id);
    } catch (err) {
      toast.error('Something went wrong creating the group');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-popover border border-border rounded-2xl w-[400px] max-w-[90vw] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Create New Group</h3>
          </div>
          <button onClick={onClose} className="text-wa-icon hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 pb-3">
          <input className="bg-wa-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full" placeholder="Group name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <p className="text-xs text-muted-foreground mt-2">Select members (a male & female admin will be auto-assigned):</p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loadingContacts ? (
            <div className="text-center text-muted-foreground text-sm py-6">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-6">
              No contacts yet. Go to the People tab to add users first.
            </div>
          ) : (
            contacts.map(c => (
              <button key={c.id} onClick={() => toggleSelect(c.id)} className={`flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg transition-colors ${selected.includes(c.id) ? 'bg-primary/10' : 'hover:bg-wa-input-bg'}`}>
                <Avatar name={c.display_name} size={40} avatarUrl={c.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{c.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{c.username} {c.gender ? `· ${c.gender === 'male' ? '♂' : c.gender === 'female' ? '♀' : ''}` : ''}</div>
                </div>
                {selected.includes(c.id) && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check size={14} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2.5 justify-end p-5 pt-3.5 border-t border-border">
          <button onClick={onClose} className="bg-wa-input-bg text-foreground rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={createGroup} disabled={loading || loadingContacts} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-wa-green-dark transition-colors disabled:opacity-50">
            {loading ? 'Creating...' : `Create (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
