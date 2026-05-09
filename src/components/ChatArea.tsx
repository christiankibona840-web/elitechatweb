import { useState, useEffect, useRef } from 'react';
import { Contact, User, Message, DB, fmtTime, fmtDate, generateMsgId } from '@/lib/chatStore';
import Avatar from './Avatar';
import { Trash2, Send } from 'lucide-react';

interface ChatAreaProps {
  me: User;
  contact: Contact | null;
  onMessagesChanged: () => void;
}

const ChatArea = ({ me, contact, onMessagesChanged }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contact) {
      setMessages(DB.getMsgs(me.id, contact.id));
    }
  }, [contact, me.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center wa-pattern-bg text-center">
        <div className="text-7xl mb-5">💬</div>
        <h2 className="text-2xl font-light text-foreground mb-3">Web Chaty</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-[300px]">
          Chagua mtu kwenye orodha ya kushoto kuanza mazungumzo.
        </p>
      </div>
    );
  }

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const msg: Message = {
      id: generateMsgId(),
      from: me.id,
      to: contact.id,
      text,
      time: Date.now(),
      status: 'sent',
    };

    DB.addMsg(me.id, contact.id, msg);
    setMessages(prev => [...prev, msg]);
    setInput('');
    onMessagesChanged();
  };

  const deleteChat = () => {
    if (!confirm('Una uhakika unataka kufuta mazungumzo haya yote?')) return;
    DB.deleteChat(me.id, contact.id);
    setMessages([]);
    onMessagesChanged();
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-wa-header border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={contact.displayName} size={42} />
          <div>
            <div className="text-sm font-medium text-foreground">{contact.displayName}</div>
            <div className="text-xs text-muted-foreground">mwisho kuonekana hivi karibuni</div>
          </div>
        </div>
        <button onClick={deleteChat} className="w-9 h-9 rounded-full flex items-center justify-center text-wa-icon hover:bg-muted/30 transition-colors" title="Futa mazungumzo">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-[10%] py-3 wa-pattern-bg">
        {messages.length === 0 && (
          <div className="text-center mt-10 text-muted-foreground text-sm">
            Bado hakuna ujumbe — mwamkie! 👋
          </div>
        )}
        {messages.map((msg) => {
          const dateStr = fmtDate(msg.time);
          let showDate = false;
          if (dateStr !== lastDate) {
            showDate = true;
            lastDate = dateStr;
          }
          const isMe = msg.from === me.id;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="bg-accent border border-border text-muted-foreground text-xs px-3 py-1 rounded-lg">{dateStr}</span>
                </div>
              )}
              <div className={`flex mb-1 animate-[msg-pop_0.15s_ease-out] ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[65%] px-3 py-1.5 text-sm leading-relaxed break-words shadow-sm relative ${
                    isMe
                      ? 'bg-wa-green-light text-[hsl(var(--wa-bubble-out-text))] rounded-lg rounded-tr-none'
                      : 'bg-wa-bubble-in text-foreground rounded-lg rounded-tl-none'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={`text-[10px] ${isMe ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>{fmtTime(msg.time)}</span>
                    {isMe && <span className="text-xs text-muted-foreground ml-0.5">✓</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-wa-header flex-shrink-0">
        <div className="flex-1 bg-wa-input-bg rounded-3xl px-4 py-2">
          <input
            className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Andika ujumbe…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30 hover:bg-wa-green-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </div>
    </div>
  );
};

export default ChatArea;
