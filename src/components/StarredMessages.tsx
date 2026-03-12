import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Star } from 'lucide-react';
import { fmtTime, fmtDate } from '@/lib/chatStore';

interface StarredMessagesProps {
  myId: string;
  chatId: string;
  chatType: 'dm' | 'group';
  onClose: () => void;
  onJumpToMessage: (msgId: string) => void;
}

const StarredMessages = ({ myId, chatId, chatType, onClose, onJumpToMessage }: StarredMessagesProps) => {
  const [starred, setStarred] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStarred();
  }, []);

  const loadStarred = async () => {
    const { data: stars } = await supabase
      .from('starred_messages')
      .select('*')
      .eq('user_id', myId)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false });

    if (!stars || stars.length === 0) { setLoading(false); return; }

    const msgIds = stars.map(s => s.message_id);
    const table = chatType === 'dm' ? 'messages' : 'group_messages';
    const { data: msgs } = await supabase
      .from(table)
      .select('*')
      .in('id', msgIds);

    setStarred(msgs || []);
    setLoading(false);
  };

  const unstar = async (msgId: string) => {
    await supabase.from('starred_messages').delete().eq('user_id', myId).eq('message_id', msgId);
    setStarred(prev => prev.filter(m => m.id !== msgId));
  };

  return (
    <div className="absolute inset-0 z-20 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-wa-header border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-wa-icon hover:text-foreground"><X size={20} /></button>
          <Star size={16} className="text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium text-foreground">Starred Messages</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : starred.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Star size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            No starred messages
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {starred.map(msg => (
              <div
                key={msg.id}
                className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors group"
                onClick={() => { onJumpToMessage(msg.id); onClose(); }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {msg.content && <div className="text-sm text-foreground">{msg.content}</div>}
                    {msg.file_name && <div className="text-xs text-muted-foreground">📎 {msg.file_name}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{fmtDate(msg.created_at)} · {fmtTime(msg.created_at)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); unstar(msg.id); }}
                    className="opacity-0 group-hover:opacity-100 text-yellow-400 hover:text-muted-foreground transition-all p-1"
                    title="Unstar"
                  >
                    <Star size={14} className="fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StarredMessages;
