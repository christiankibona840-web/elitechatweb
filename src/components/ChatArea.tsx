import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fmtTime, fmtDate } from '@/lib/chatStore';
import Avatar from './Avatar';
import VoiceRecorder from './VoiceRecorder';
import MessageActions from './MessageActions';
import ForwardModal from './ForwardModal';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Mic, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface ChatAreaProps {
  me: Profile;
  activeChat: { type: 'dm'; id: string } | { type: 'group'; id: string } | null;
  onMessagesChanged: () => void;
  onBack?: () => void;
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 bg-muted-foreground rounded-full" style={{ animation: `bounce-dot 1.2s infinite ${i * 0.15}s` }} />
      ))}
    </div>
    <span className="text-xs text-muted-foreground ml-1">typing...</span>
  </div>
);

const ChatArea = ({ me, activeChat, onMessagesChanged, onBack }: ChatAreaProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [contactProfile, setContactProfile] = useState<Profile | null>(null);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; sender_name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>(() => (window as any).__chatWallpaper || '');
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for wallpaper changes
  useEffect(() => {
    const handler = (e: Event) => setWallpaper((e as CustomEvent).detail || '');
    window.addEventListener('wallpaper-change', handler);
    return () => window.removeEventListener('wallpaper-change', handler);
  }, []);

  useEffect(() => {
    if (!activeChat) return;

    if (activeChat.type === 'dm') {
      loadDmMessages(activeChat.id);
      loadContactProfile(activeChat.id);
      markAsRead(activeChat.id);

      const msgChannel = supabase
        .channel(`dm-${activeChat.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${activeChat.id}`,
        }, (payload) => {
          if ((payload.new as any).receiver_id === me.id) {
            setMessages(prev => [...prev, payload.new]);
            markAsRead(activeChat.id);
            onMessagesChanged();
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? { ...m, ...payload.new } : m));
        })
        .subscribe();

      const presenceChannel = supabase.channel(`typing-${[me.id, activeChat.id].sort().join('-')}`, {
        config: { presence: { key: me.id } }
      });
      
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const otherTyping = Object.entries(state).some(([key, val]) => 
            key !== me.id && (val as any[])?.[0]?.typing
          );
          setIsTyping(otherTyping);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(presenceChannel);
      };
    } else {
      loadGroupMessages(activeChat.id);
      loadGroupInfo(activeChat.id);

      const channel = supabase
        .channel(`group-${activeChat.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${activeChat.id}`,
        }, (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== me.id) {
            supabase.from('profiles').select('display_name').eq('id', newMsg.sender_id).single().then(({ data }) => {
              setMessages(prev => [...prev, { ...newMsg, profiles: data }]);
              onMessagesChanged();
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
        }, (payload) => {
          setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? { ...m, ...payload.new } : m));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeChat?.type, activeChat?.id]);

  // Load reactions for visible messages
  useEffect(() => {
    if (messages.length === 0) return;
    const msgIds = messages.map(m => m.id);
    supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', msgIds)
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, { emoji: string; user_id: string }[]> = {};
        data.forEach((r: any) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = [];
          grouped[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
        });
        setReactions(grouped);
      });
  }, [messages]);

  // Realtime reactions
  useEffect(() => {
    const ch = supabase
      .channel('reactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        // Reload reactions
        if (messages.length > 0) {
          const msgIds = messages.map(m => m.id);
          supabase.from('message_reactions').select('*').in('message_id', msgIds).then(({ data }) => {
            if (!data) return;
            const grouped: Record<string, { emoji: string; user_id: string }[]> = {};
            data.forEach((r: any) => {
              if (!grouped[r.message_id]) grouped[r.message_id] = [];
              grouped[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
            });
            setReactions(grouped);
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const broadcastTyping = useCallback(() => {
    if (!activeChat || activeChat.type !== 'dm') return;
    const channelName = `typing-${[me.id, activeChat.id].sort().join('-')}`;
    const ch = supabase.channel(channelName, { config: { presence: { key: me.id } } });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ typing: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(async () => {
          await ch.track({ typing: false });
        }, 2000);
      }
    });
  }, [activeChat, me.id]);

  const loadContactProfile = async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (data) setContactProfile(data);
  };

  const loadGroupInfo = async (id: string) => {
    const { data } = await supabase.from('groups').select('*').eq('id', id).single();
    if (data) setGroupInfo(data);
  };

  const loadDmMessages = async (contactId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${me.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${me.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const loadGroupMessages = async (groupId: string) => {
    const { data } = await supabase
      .from('group_messages')
      .select('*, profiles!group_messages_sender_id_fkey(display_name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const markAsRead = async (senderId: string) => {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('sender_id', senderId)
      .eq('receiver_id', me.id)
      .eq('status', 'sent');
  };

  const uploadFile = async (f: File): Promise<{ url: string; name: string; type: string } | null> => {
    const ext = f.name.split('.').pop();
    const path = `${me.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-files').upload(path, f);
    if (error) { toast.error('File upload error'); return null; }
    const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
    return { url: publicUrl, name: f.name, type: f.type };
  };

  const sendMessage = async (voiceBlob?: Blob) => {
    const text = input.trim();
    const fileToSend = voiceBlob || file;
    if (!text && !fileToSend) return;
    if (!activeChat) return;

    setUploading(true);
    let fileData: { url: string; name: string; type: string } | null = null;
    if (fileToSend) {
      const f = fileToSend instanceof Blob && !(fileToSend instanceof File) 
        ? new File([fileToSend], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
        : fileToSend as File;
      fileData = await uploadFile(f);
      if (!voiceBlob) setFile(null);
    }

    if (activeChat.type === 'dm') {
      const msg = {
        sender_id: me.id,
        receiver_id: activeChat.id,
        content: text || null,
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
        reply_to: replyTo ? { id: replyTo.id, content: replyTo.content, sender_name: replyTo.sender_name } : null,
      };
      const { data, error } = await supabase.from('messages').insert(msg).select().single();
      if (error) { toast.error('Failed to send message'); setUploading(false); return; }
      setMessages(prev => [...prev, data]);
    } else {
      const msg = {
        group_id: activeChat.id,
        sender_id: me.id,
        content: text || null,
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_type: fileData?.type || null,
        reply_to: replyTo ? { id: replyTo.id, content: replyTo.content, sender_name: replyTo.sender_name } : null,
      };
      const { data, error } = await supabase.from('group_messages').insert(msg).select('*, profiles!group_messages_sender_id_fkey(display_name)').single();
      if (error) { toast.error('Failed to send message'); setUploading(false); return; }
      setMessages(prev => [...prev, data]);
    }

    setInput('');
    setReplyTo(null);
    setUploading(false);
    setShowRecorder(false);
    onMessagesChanged();
  };

  const deleteForEveryone = async (msg: any) => {
    if (!confirm('Delete this message for everyone?')) return;
    const table = activeChat?.type === 'dm' ? 'messages' : 'group_messages';
    await supabase.from(table).update({ 
      content: null, 
      file_url: null, 
      file_name: null, 
      file_type: null, 
      deleted_for_everyone: true 
    }).eq('id', msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: null, file_url: null, deleted_for_everyone: true } : m));
    toast.success('Message deleted');
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    const msgType = activeChat?.type === 'dm' ? 'dm' : 'group';
    const existing = reactions[msgId]?.find(r => r.emoji === emoji && r.user_id === me.id);
    if (existing) {
      await supabase.from('message_reactions').delete()
        .eq('message_id', msgId).eq('user_id', me.id).eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: msgId, user_id: me.id, emoji, message_type: msgType,
      });
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center wa-pattern-bg text-center">
        <div className="text-7xl mb-5">💬</div>
        <h2 className="text-2xl font-light text-foreground mb-3">Web Chaty YST</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-[300px]">
          Select a conversation or search for users to start chatting.
        </p>
      </div>
    );
  }

  const chatName = activeChat.type === 'dm' ? contactProfile?.display_name || '...' : groupInfo?.name || '...';
  const subtitle = activeChat.type === 'dm'
    ? (contactProfile?.is_online ? 'online' : 'offline')
    : 'Group';

  let lastDate = '';

  const renderFilePreview = (msg: any) => {
    if (!msg.file_url) return null;
    const isImage = msg.file_type?.startsWith('image/');
    const isAudio = msg.file_type?.startsWith('audio/');
    if (isImage) {
      return (
        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
          <img src={msg.file_url} alt={msg.file_name} className="max-w-[200px] rounded-lg" />
        </a>
      );
    }
    if (isAudio) {
      return (
        <div className="mb-1">
          <audio controls src={msg.file_url} className="max-w-[220px]" />
        </div>
      );
    }
    return (
      <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 bg-black/20 rounded-lg p-2 mb-1 hover:bg-black/30 transition-colors">
        <FileText size={20} />
        <span className="text-xs truncate">{msg.file_name || 'File'}</span>
      </a>
    );
  };

  const renderReactions = (msgId: string) => {
    const msgReactions = reactions[msgId];
    if (!msgReactions || msgReactions.length === 0) return null;
    
    // Group by emoji
    const grouped: Record<string, number> = {};
    msgReactions.forEach(r => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
    
    return (
      <div className="flex gap-0.5 mt-0.5 flex-wrap">
        {Object.entries(grouped).map(([emoji, count]) => {
          const myReaction = msgReactions.some(r => r.emoji === emoji && r.user_id === me.id);
          return (
            <button key={emoji} onClick={() => toggleReaction(msgId, emoji)}
              className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${myReaction ? 'bg-primary/20 border-primary/40' : 'bg-accent/50 border-border'}`}>
              {emoji} {count > 1 ? count : ''}
            </button>
          );
        })}
      </div>
    );
  };

  const chatBgStyle: React.CSSProperties = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : {};

  // Read receipt rendering
  const renderTicks = (msg: any) => {
    if (!msg.sender_id || msg.sender_id !== me.id || activeChat.type !== 'dm') return null;
    if (msg.status === 'read') {
      return <span className="text-xs text-blue-500 ml-0.5">✓✓</span>;
    }
    return <span className="text-xs text-muted-foreground ml-0.5">✓✓</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-wa-header border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center text-wa-icon hover:bg-muted/30 transition-colors mr-1">
              <ArrowLeft size={20} />
            </button>
          )}
          <Avatar name={chatName} size={42} avatarUrl={activeChat.type === 'dm' ? contactProfile?.avatar_url : groupInfo?.avatar_url} />
          <div>
            <div className="text-sm font-medium text-foreground">{chatName}</div>
            <div className={`text-xs ${contactProfile?.is_online ? 'text-wa-online' : 'text-muted-foreground'}`}>
              {isTyping ? 'typing...' : subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto px-[10%] py-3 ${!wallpaper ? 'wa-pattern-bg' : ''}`}
        style={chatBgStyle}
      >
        {wallpaper && <div className="fixed inset-0 pointer-events-none" style={{ ...chatBgStyle, zIndex: -1 }} />}
        {messages.length === 0 && (
          <div className="text-center mt-10 text-muted-foreground text-sm">
            No messages yet — say hello! 👋
          </div>
        )}
        {messages.map((msg) => {
          const dateStr = fmtDate(msg.created_at);
          let showDate = false;
          if (dateStr !== lastDate) { showDate = true; lastDate = dateStr; }
          const isMe = msg.sender_id === me.id;
          const senderName = activeChat.type === 'group' && !isMe ? (msg.profiles?.display_name || '') : '';
          const replyData = msg.reply_to as { id: string; content: string; sender_name: string } | null;
          const isDeleted = msg.deleted_for_everyone;

          const handleReply = () => {
            const name = isMe ? 'You' : (senderName || contactProfile?.display_name || 'Unknown');
            setReplyTo({ id: msg.id, content: msg.content || (msg.file_name ? `📎 ${msg.file_name}` : ''), sender_name: name });
          };

          return (
            <div key={msg.id} id={`msg-${msg.id}`}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="bg-accent border border-border text-muted-foreground text-xs px-3 py-1 rounded-lg">{dateStr}</span>
                </div>
              )}
              <div className={`flex mb-1 animate-[msg-pop_0.15s_ease-out] group items-end gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && !isDeleted && (
                  <MessageActions
                    isMe={false}
                    onReply={handleReply}
                    onDelete={() => {}}
                    onForward={() => setForwardMsg(msg)}
                    onReact={(emoji) => toggleReaction(msg.id, emoji)}
                  />
                )}
                <div className={`max-w-[65%] px-3 py-1.5 text-sm leading-relaxed break-words shadow-sm relative ${
                  isMe
                    ? 'bg-wa-green-light text-[hsl(var(--wa-bubble-out-text))]'
                    : 'bg-wa-bubble-in text-foreground'
                }`} style={{
                  borderRadius: `var(--bubble-radius)`,
                  ...(isMe ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }),
                }}>
                  {isDeleted ? (
                    <div className="italic text-muted-foreground text-xs">🚫 This message was deleted</div>
                  ) : (
                    <>
                      {replyData && (
                        <div className="border-l-2 border-primary bg-primary/10 rounded px-2 py-1 mb-1 cursor-pointer" onClick={() => {
                          document.getElementById(`msg-${replyData.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}>
                          <div className="text-[11px] font-semibold text-primary">{replyData.sender_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{replyData.content || '📎 Attachment'}</div>
                        </div>
                      )}
                      {senderName && <div className="text-xs font-semibold text-primary mb-0.5">{senderName}</div>}
                      {renderFilePreview(msg)}
                      {msg.content && <div>{msg.content}</div>}
                    </>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={`text-[10px] ${isMe ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      {fmtTime(msg.created_at)}
                    </span>
                    {renderTicks(msg)}
                  </div>
                  {!isDeleted && renderReactions(msg.id)}
                </div>
                {isMe && !isDeleted && (
                  <MessageActions
                    isMe={true}
                    onReply={handleReply}
                    onDelete={() => deleteForEveryone(msg)}
                    onForward={() => setForwardMsg(msg)}
                    onReact={(emoji) => toggleReaction(msg.id, emoji)}
                  />
                )}
              </div>
            </div>
          );
        })}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 px-4 py-2 bg-wa-header border-t border-border">
          <div className="flex items-center gap-2 bg-wa-input-bg rounded-lg px-3 py-2 flex-1">
            {file.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
            <span className="text-xs text-foreground truncate">{file.name}</span>
          </div>
          <button onClick={() => setFile(null)} className="text-wa-icon hover:text-destructive">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-wa-header border-t border-border">
          <div className="flex-1 border-l-2 border-primary bg-primary/10 rounded px-3 py-2">
            <div className="text-xs font-semibold text-primary">{replyTo.sender_name}</div>
            <div className="text-xs text-muted-foreground truncate">{replyTo.content || '📎 Attachment'}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-wa-icon hover:text-destructive">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Voice recorder */}
      {showRecorder && (
        <VoiceRecorder
          onSend={(blob) => sendMessage(blob)}
          onCancel={() => setShowRecorder(false)}
        />
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-wa-header flex-shrink-0">
        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full flex items-center justify-center text-wa-icon hover:bg-muted/30 transition-colors flex-shrink-0" title="Attach file">
          <Paperclip size={20} />
        </button>
        <div className="flex-1 bg-wa-input-bg rounded-3xl px-4 py-2">
          <input
            className="w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Type a message…"
            value={input}
            onChange={e => { setInput(e.target.value); broadcastTyping(); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
        </div>
        {!input.trim() && !file ? (
          <button
            onClick={() => setShowRecorder(true)}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30 hover:bg-wa-green-dark transition-colors"
            title="Voice note"
          >
            <Mic size={18} />
          </button>
        ) : (
          <button
            onClick={() => sendMessage()}
            disabled={uploading}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30 hover:bg-wa-green-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        )}
      </div>

      {/* Forward modal */}
      {forwardMsg && (
        <ForwardModal
          me={me}
          message={forwardMsg}
          onClose={() => setForwardMsg(null)}
          onForwarded={onMessagesChanged}
        />
      )}
    </div>
  );
};

export default ChatArea;
