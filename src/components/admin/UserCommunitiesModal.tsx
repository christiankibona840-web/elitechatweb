import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { X, UserMinus, Crown } from 'lucide-react';

interface Group { group_id: string; name: string; member_count: number; role: string; is_owner: boolean; }

interface Props {
  userId: string;
  username: string;
  onClose: () => void;
}

const UserCommunitiesModal = ({ userId, username, onClose }: Props) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Group | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_user_groups', { _target_user_id: userId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else setGroups((data as Group[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const handleRemove = async (g: Group) => {
    setRemoving(g.group_id);
    const { error } = await supabase.rpc('admin_remove_from_group', { _target_user_id: userId, _group_id: g.group_id });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: `@${username} removed from ${g.name}` });
      setGroups(prev => prev.filter(x => x.group_id !== g.group_id));
    }
    setRemoving(null);
    setConfirm(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Communities of @{username}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Not in any group</div>
          ) : groups.map(g => (
            <div key={g.group_id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/20">
              <div className="flex items-center gap-2 min-w-0">
                <div>
                  <div className="font-medium text-sm flex items-center gap-1.5">
                    {g.name}
                    {g.is_owner && <Crown size={12} className="text-accent" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{g.member_count} members · {g.role}</div>
                </div>
              </div>
              <button onClick={() => setConfirm(g)} disabled={removing === g.group_id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium disabled:opacity-50">
                <UserMinus size={12} /> Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-5">
            <h4 className="font-semibold mb-2">Remove from group?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Remove <span className="font-medium text-foreground">@{username}</span> from <span className="font-medium text-foreground">{confirm.name}</span>?
              {confirm.is_owner && <span className="block mt-2 text-xs text-accent">Ownership will transfer to the next-oldest member.</span>}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={() => handleRemove(confirm)} disabled={!!removing}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50">
                {removing ? 'Removing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCommunitiesModal;
