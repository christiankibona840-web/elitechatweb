import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface ForwardModalProps {
  me: Profile;
  message: { content: string | null; file_url: string | null; file_name: string | null; file_type: string | null };
  onClose: () => void;
  onForwarded: () => void;
}

interface Target {
  type: 'dm' | 'group';
  id: string;
  name: string;
}

const ForwardModal = ({ me, message, onClose, onForwarded }: ForwardModalProps) => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { loadTargets(); }, []);

  const loadTargets = async () => {
    const items: Target[] = [];
    const { data: contacts } = await supabase
      .from('contacts')
      .select('contact_id, profiles!contacts_contact_id_fkey(id, display_name)')
      .eq('user_id', me.id);
    if (contacts) {
      for (const c of contacts) {
        const p = c.profiles as any;
        if (p) items.push({ type: 'dm', id: p.id, name: p.display_name });
      }
    }
    const { data: groups } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name)')
      .eq('user_id', me.id);
    if (groups) {
      for (const g of groups) {
        const grp = g.groups as any;
        if (grp) items.push({ type: 'group', id: grp.id, name: grp.name });
      }
    }
    setTargets(items);
  };

  const forward = async () => {
    if (!selected) return;
    setSending(true);
    const target = targets.find(t => `${t.type}-${t.id}` === selected);
    if (!target) return;
    const fwdContent = message.content ? `↗️ Forwarded: ${message.content}` : '↗️ Forwarded';
    if (target.type === 'dm') {
      await supabase.from('messages').insert({
        sender_id: me.id, receiver_id: target.id, content: fwdContent,
        file_url: message.file_url, file_name: message.file_name, file_type: message.file_type,
      });
    } else {
      await supabase.from('group_messages').insert({
        group_id: target.id, sender_id: me.id, content: fwdContent,
        file_url: message.file_url, file_name: message.file_name, file_type: message.file_type,
      });
    }
    toast.success(`Forwarded to ${target.name}`);
    setSending(false);
    onForwarded();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-popover border border-border rounded-2xl w-[360px] max-w-[90vw] shadow-2xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Forward to...</h3>
          <button onClick={onClose} className="text-app-icon hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {targets.map(t => {
            const key = `${t.type}-${t.id}`;
            return (
              <button key={key} onClick={() => setSelected(key)}
                className={`flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors ${selected === key ? 'bg-primary/10' : 'hover:bg-app-input-bg'}`}>
                <Avatar name={t.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{t.type === 'group' ? '👥 ' : ''}{t.name}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-border flex justify-end">
          <button onClick={forward} disabled={!selected || sending}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50 hover:bg-app-primary-dark transition-colors">
            <Send size={14} /> {sending ? 'Sending...' : 'Forward'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
