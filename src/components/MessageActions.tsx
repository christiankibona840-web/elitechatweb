import { useState } from 'react';
import { Reply, Trash2, Forward, SmilePlus, Star } from 'lucide-react';

const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

interface MessageActionsProps {
  isMe: boolean;
  isStarred?: boolean;
  onReply: () => void;
  onDelete: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  onStar: () => void;
}

const MessageActions = ({ isMe, isStarred, onReply, onDelete, onForward, onReact, onStar }: MessageActionsProps) => {
  const [showEmojis, setShowEmojis] = useState(false);

  return (
    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
      <button onClick={() => setShowEmojis(!showEmojis)} className="text-muted-foreground hover:text-foreground p-1 rounded-full relative" title="React">
        <SmilePlus size={14} />
        {showEmojis && (
          <div className={`absolute bottom-7 ${isMe ? 'right-0' : 'left-0'} bg-popover border border-border rounded-xl shadow-lg px-1.5 py-1 flex gap-0.5 z-10`}>
            {QUICK_EMOJIS.map(e => (
              <button key={e} onClick={(ev) => { ev.stopPropagation(); onReact(e); setShowEmojis(false); }} className="hover:scale-125 transition-transform text-base px-0.5">
                {e}
              </button>
            ))}
          </div>
        )}
      </button>
      <button onClick={onStar} className={`p-1 rounded-full transition-colors ${isStarred ? 'text-yellow-400' : 'text-muted-foreground hover:text-foreground'}`} title={isStarred ? 'Unstar' : 'Star'}>
        <Star size={14} className={isStarred ? 'fill-current' : ''} />
      </button>
      <button onClick={onReply} className="text-muted-foreground hover:text-foreground p-1 rounded-full" title="Reply">
        <Reply size={14} />
      </button>
      <button onClick={onForward} className="text-muted-foreground hover:text-foreground p-1 rounded-full" title="Forward">
        <Forward size={14} />
      </button>
      {isMe && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1 rounded-full" title="Delete for everyone">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

export default MessageActions;
