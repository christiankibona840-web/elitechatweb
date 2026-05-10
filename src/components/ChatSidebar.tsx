import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fmtTime } from '@/lib/chatStore';
import Avatar from './Avatar';
import UserSearchModal from './UserSearchModal';
import CreateGroupModal from './CreateGroupModal';
import StatusPanel from './StatusPanel';
import StoryTray from './StoryTray';
import SettingsPanel from './SettingsPanel';
import PeoplePanel from './PeoplePanel';
import ProjectZone from './ProjectZone';
import GamesPanel from './games/GamesPanel';
import { LOVABLE_BOT_ID, LOVABLE_BOT_PROFILE } from '@/lib/lovableBot';
import { LogOut, Search, UserPlus, Users, MessageCircle, Camera, Settings, Globe, Rocket, Gamepad2, Code } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface ChatSidebarProps {
  me: Profile;
  activeChat: { type: 'dm'; id: string } | { type: 'group'; id: string } | null;
  onSelectChat: (chat: { type: 'dm'; id: string } | { type: 'group'; id: string }) => void;
  onLogout: () => void;
  refreshKey: number;
  onProfileUpdate: (profile: Profile) => void;
  onOpenGame?: (gameId: string, gameType?: 'ttt' | 'c4') => void;
}

interface ConversationItem {
  type: 'dm' | 'group';
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string | null;
  unread: number;
}

const ChatSidebar = ({ me, activeChat, onSelectChat, onLogout, refreshKey, onProfileUpdate, onOpenGame }: ChatSidebarProps) => {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [tab, setTab] = useState<'chats' | 'status' | 'people' | 'settings' | 'projects' | 'games'>('chats');

  useEffect(() => {
    loadConversations();
  }, [me.id, refreshKey]);

  const loadConversations = async () => {
    const { data: contacts } = await supabase
      .from('contacts')
      .select('contact_id, profiles!contacts_contact_id_fkey(id, display_name, readable_id, is_online)')
      .eq('user_id', me.id);

    const items: ConversationItem[] = [];

    if (contacts) {
      for (const c of contacts) {
        const profile = c.profiles as any;
        if (!profile) continue;

        const { data: msgs } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, file_name')
          .or(`and(sender_id.eq.${me.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${me.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        const last = msgs?.[0];
        const lastText = last?.file_name ? `📎 ${last.file_name}` : (last?.content || '');

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', profile.id)
          .eq('receiver_id', me.id)
          .eq('status', 'sent');

        items.push({
          type: 'dm',
          id: profile.id,
          name: profile.display_name,
          lastMessage: last ? (last.sender_id === me.id ? `You: ${lastText}` : lastText) : '',
          lastTime: last?.created_at || null,
          unread: count || 0,
        });
      }
    }

    const { data: groupMemberships } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name)')
      .eq('user_id', me.id);

    if (groupMemberships) {
      for (const gm of groupMemberships) {
        const group = gm.groups as any;
        if (!group) continue;

        const { data: gmsgs } = await supabase
          .from('group_messages')
          .select('content, created_at, sender_id, file_name, profiles!group_messages_sender_id_fkey(display_name)')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const last = gmsgs?.[0] as any;
        const senderName = last?.profiles?.display_name || '';
        const lastText = last?.file_name ? `📎 ${last.file_name}` : (last?.content || '');

        items.push({
          type: 'group',
          id: group.id,
          name: group.name,
          lastMessage: last ? `${senderName}: ${lastText}` : '',
          lastTime: last?.created_at || null,
          unread: 0,
        });
      }
    }

    items.sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
    });

    // Always add Lovable AI bot at the top
    const botConvo: ConversationItem = {
      type: 'dm',
      id: LOVABLE_BOT_ID,
      name: '💜 Lovable AI',
      lastMessage: 'Ask me anything!',
      lastTime: null,
      unread: 0,
    };
    setConversations([botConvo, ...items]);
  };

  const copyId = () => {
    navigator.clipboard.writeText(me.readable_id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = (item: ConversationItem) =>
    activeChat?.type === item.type && activeChat?.id === item.id;

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border bg-app-panel flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-app-header flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Avatar name={me.display_name} size={40} avatarUrl={me.avatar_url} />
          <div>
            <div className="text-sm font-medium text-foreground">{me.display_name}</div>
            <div className="text-xs text-app-online">● Online</div>
          </div>
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => setShowCreateGroup(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-app-icon hover:bg-muted/30 transition-colors" title="Create group">
            <Users size={20} />
          </button>
          <button onClick={() => setShowSearch(true)} className="w-9 h-9 rounded-full flex items-center justify-center text-app-icon hover:bg-muted/30 transition-colors" title="Find users">
            <UserPlus size={20} />
          </button>
          <button onClick={onLogout} className="w-9 h-9 rounded-full flex items-center justify-center text-app-icon hover:bg-muted/30 transition-colors" title="Sign out">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0 overflow-x-auto no-scrollbar">
        <TabButton active={tab === 'chats'} onClick={() => setTab('chats')} icon={<MessageCircle size={13} />} label="Chats" />
        <TabButton active={tab === 'people'} onClick={() => setTab('people')} icon={<Globe size={13} />} label="People" />
        <TabButton active={tab === 'games'} onClick={() => setTab('games')} icon={<Gamepad2 size={13} />} label="Games" />
        <TabButton active={tab === 'status'} onClick={() => setTab('status')} icon={<Camera size={13} />} label="Status" />
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings size={13} />} label="Settings" />
      </div>

      {tab === 'status' ? (
        <StatusPanel me={me} />
      ) : tab === 'settings' ? (
        <SettingsPanel me={me} onProfileUpdate={onProfileUpdate} />
      ) : tab === 'people' ? (
        <PeoplePanel me={me} onStartChat={(userId) => { setTab('chats'); onSelectChat({ type: 'dm', id: userId }); }} />
      ) : tab === 'projects' ? (
        <ProjectZone me={me} />
      ) : tab === 'games' ? (
        <GamesPanel me={me} onOpenGame={(id, type) => onOpenGame?.(id, type)} />
      ) : (
        <>
          {/* Stories tray (IG-style) */}
          <StoryTray me={me} />

          {/* Search */}
          <div className="px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-app-input-bg rounded-3xl px-3.5 py-1.5">
              <Search size={15} className="text-muted-foreground" />
              <input className="bg-transparent text-foreground text-sm flex-1 outline-none placeholder:text-muted-foreground" placeholder="Search conversations" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-10 px-5 text-muted-foreground">
                <div className="text-4xl mb-3">{search ? '🔍' : '👥'}</div>
                <p className="text-sm leading-relaxed">
                  {search ? 'No matches found.' : <>No conversations yet.<br />Click <UserPlus size={14} className="inline" /> to find users.</>}
                </p>
              </div>
            ) : (
              filtered.map(item => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => onSelectChat({ type: item.type, id: item.id })}
                  className={`flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors hover:bg-app-input-bg ${isActive(item) ? 'bg-app-input-bg' : ''}`}
                >
                  <Avatar name={item.name} size={50} avatarUrl={item.id === LOVABLE_BOT_ID ? LOVABLE_BOT_PROFILE.avatar_url : undefined} />
                  <div className="flex-1 min-w-0 border-b border-border pb-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground truncate max-w-[130px]">
                        {item.type === 'group' && '👥 '}{item.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {item.lastTime ? fmtTime(item.lastTime) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.lastMessage || <span className="italic">Tap to start chatting</span>}
                      </div>
                      {item.unread > 0 && (
                        <div className="bg-primary text-primary-foreground rounded-full min-w-[20px] h-5 text-xs font-semibold flex items-center justify-center ml-1 px-1">
                          {item.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Bottom bar: ID + Project Zone */}
          <div className="px-4 py-2.5 bg-accent/30 border-t border-border flex-shrink-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Your ID</div>
              <div className="text-xs text-primary font-mono break-all mt-0.5 cursor-pointer hover:underline" onClick={copyId}>
                {me.readable_id || 'Loading...'}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{copied ? '✅ Copied!' : 'Click to copy'}</div>
            </div>
            <button
              onClick={() => setTab('projects')}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              title="Project Zone"
            >
              <Rocket size={18} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Projects</span>
            </button>
            <a
              href="https://chris-p7a0.onrender.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              title="About Developer"
            >
              <Code size={18} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Developer</span>
            </a>
          </div>
        </>
      )}

      {showSearch && (
        <UserSearchModal me={me} onClose={() => setShowSearch(false)} onStartChat={(userId) => { setShowSearch(false); onSelectChat({ type: 'dm', id: userId }); }} />
      )}

      {showCreateGroup && (
        <CreateGroupModal me={me} onClose={() => setShowCreateGroup(false)} onCreated={(groupId) => { setShowCreateGroup(false); onSelectChat({ type: 'group', id: groupId }); }} />
      )}
    </div>
  );
};

const TabButton = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[60px] py-2.5 text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
      active ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
    }`}
  >
    {icon} {label}
  </button>
);

export default ChatSidebar;
