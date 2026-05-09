import { useState } from 'react';
import { Contact, User, DB, fmtTime } from '@/lib/chatStore';
import Avatar from './Avatar';
import { Plus, LogOut, Search, UserPlus } from 'lucide-react';

interface ChatSidebarProps {
  me: User;
  contacts: Contact[];
  activeId: string | null;
  onSelectContact: (id: string) => void;
  onOpenAddContact: () => void;
  onLogout: () => void;
}

const ChatSidebar = ({ me, contacts, activeId, onSelectContact, onOpenAddContact, onLogout }: ChatSidebarProps) => {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const filtered = contacts.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const unread = DB.getUnread(me.id);

  const copyId = () => {
    navigator.clipboard.writeText(me.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 flex-shrink-0 border-r border-border bg-wa-panel flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-wa-header flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Avatar name={me.displayName} size={40} />
          <div>
            <div className="text-sm font-medium text-foreground">{me.displayName}</div>
            <div className="text-xs text-wa-online">● Mtandaoni</div>
          </div>
        </div>
        <div className="flex gap-0.5">
          <button onClick={onOpenAddContact} className="w-9 h-9 rounded-full flex items-center justify-center text-wa-icon hover:bg-muted/30 transition-colors" title="Ongeza mawasiliano">
            <Plus size={20} />
          </button>
          <button onClick={onLogout} className="w-9 h-9 rounded-full flex items-center justify-center text-wa-icon hover:bg-muted/30 transition-colors" title="Toka">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 bg-wa-input-bg rounded-3xl px-3.5 py-1.5">
          <Search size={15} className="text-muted-foreground" />
          <input
            className="bg-transparent text-foreground text-sm flex-1 outline-none placeholder:text-muted-foreground"
            placeholder="Tafuta mawasiliano"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-5 text-muted-foreground">
            <div className="text-4xl mb-3">{search ? '🔍' : '👥'}</div>
            <p className="text-sm leading-relaxed">
              {search ? 'Hakuna mawasiliano yanayolingana.' : <>Bado huna mawasiliano.<br />Bonyeza <strong>+</strong> ili kuongeza.</>}
            </p>
          </div>
        ) : (
          filtered.map(c => {
            const msgs = DB.getMsgs(me.id, c.id);
            const last = msgs[msgs.length - 1];
            const badge = unread[c.id] || 0;
            const isActive = activeId === c.id;

            return (
              <button
                key={c.id}
                onClick={() => onSelectContact(c.id)}
                className={`flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-wa-input-bg ${isActive ? 'bg-wa-input-bg' : ''}`}
              >
                <Avatar name={c.displayName} size={50} />
                <div className="flex-1 min-w-0 border-b border-border pb-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground truncate max-w-[160px]">{c.displayName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{last ? fmtTime(last.time) : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {last
                        ? (last.from === me.id ? <><span className="text-wa-icon">Wewe: </span>{last.text}</> : last.text)
                        : <span className="italic">Bonyeza kuanza mazungumzo</span>
                      }
                    </div>
                    {badge > 0 && (
                      <div className="bg-primary text-primary-foreground rounded-full min-w-[20px] h-5 text-xs font-semibold flex items-center justify-center ml-1 px-1">
                        {badge}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* My ID */}
      <div className="px-4 py-2.5 bg-accent/30 border-t border-border flex-shrink-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">ID yako — shiriki ili marafiki wakuongeze</div>
        <div className="text-xs text-primary font-mono break-all mt-0.5 cursor-pointer hover:underline" onClick={copyId}>
          {me.id}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{copied ? '✅ Imenakiliwa!' : 'Bonyeza kunakili'}</div>
      </div>

      {/* Add contact shortcut */}
      <button
        onClick={onOpenAddContact}
        className="px-4 py-3.5 flex items-center gap-2.5 text-primary text-sm font-medium border-t border-border flex-shrink-0 hover:bg-primary/10 transition-colors"
      >
        <UserPlus size={22} />
        Ongeza Mawasiliano Mapya
      </button>
    </div>
  );
};

export default ChatSidebar;
