import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SmartReplyProps {
  messages: any[];
  myId: string;
  onSelect: (text: string) => void;
}

const SmartReply = ({ messages, myId, onSelect }: SmartReplyProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastMsgId, setLastMsgId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (messages.length === 0) return;

    // Only suggest when the last message is NOT from me
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender_id === myId) {
      setSuggestions([]);
      return;
    }

    // Don't re-fetch for the same message
    if (lastMsg.id === lastMsgId) return;

    setLoading(true);
    setDismissed(false);
    setLastMsgId(lastMsg.id);

    try {
      const mapped = messages.slice(-10).map((m: any) => ({
        isMe: m.sender_id === myId,
        content: m.content || '',
      }));

      const { data, error } = await supabase.functions.invoke('smart-reply', {
        body: { messages: mapped },
      });

      if (error) {
        console.error('Smart reply error:', error);
        setSuggestions([]);
      } else {
        setSuggestions(data?.suggestions || []);
      }
    } catch (err) {
      console.error('Smart reply fetch failed:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [messages, myId, lastMsgId]);

  useEffect(() => {
    const debounce = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounce);
  }, [fetchSuggestions]);

  if (dismissed || (suggestions.length === 0 && !loading)) return null;

  return (
    <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-app-header border-t border-border overflow-x-auto">
      <Sparkles size={14} className="text-primary flex-shrink-0" />
      {loading ? (
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-7 w-20 rounded-full bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { onSelect(s); setDismissed(true); }}
              className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 whitespace-nowrap transition-colors"
            >
              {s}
            </button>
          ))}
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
};

export default SmartReply;
