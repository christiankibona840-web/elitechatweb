import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/AuthScreen';
import ChatSidebar from '@/components/ChatSidebar';
import ChatArea from '@/components/ChatArea';
import UpdateAlert from '@/components/UpdateAlert';
import AdminPortal from '@/components/AdminPortal';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { loadSavedTheme } from '@/components/SettingsPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const APP_VERSION = '3.0.0';

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminView, setAdminView] = useState<'chat' | 'admin' | null>(null);
  const [activeChat, setActiveChat] = useState<{ type: 'dm'; id: string } | { type: 'group'; id: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadSavedTheme();
    const seenVersion = localStorage.getItem('app-version-seen');
    if (seenVersion && seenVersion !== APP_VERSION) {
      setShowUpdateAlert(true);
    }
    localStorage.setItem('app-version-seen', APP_VERSION);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [session]);

  useEffect(() => {
    if (!profile || !pendingTargetId) return;

    const openTargetChat = async () => {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('readable_id', pendingTargetId)
        .single();

      if (targetProfile) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', profile.id)
          .eq('contact_id', targetProfile.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from('contacts').insert({ user_id: profile.id, contact_id: targetProfile.id });
        }

        setActiveChat({ type: 'dm', id: targetProfile.id });
        setRefreshKey(k => k + 1);
      }
      setPendingTargetId(null);
    };

    openTargetChat();
  }, [profile, pendingTargetId]);

  // Notification sound helper
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.wav');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('push-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${profile.id}`,
      }, async (payload) => {
        const msg = payload.new as any;
        // Play double beep sound
        playNotificationSound();

        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          const { data: sender } = await supabase.from('profiles').select('display_name').eq('id', msg.sender_id).single();
          new Notification(sender?.display_name || 'New Message', {
            body: msg.content || '📎 File',
            icon: '/favicon.ico',
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, playNotificationSound]);

  const loadProfile = async (userId: string) => {
    await new Promise(r => setTimeout(r, 500));
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!roleData);

    setLoading(false);

    if (data) {
      await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', userId);

      if ((data as any)?.chat_theme) {
        const theme = (data as any).chat_theme;
        localStorage.setItem('chat-theme', JSON.stringify(theme));
        loadSavedTheme();
      }
      if ((data as any)?.bubble_radius) {
        localStorage.setItem('bubble-radius', (data as any).bubble_radius);
        loadSavedTheme();
      }
    }
  };

  const handleLogout = async () => {
    if (profile) {
      await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', profile.id);
    }
    await supabase.auth.signOut();
    setProfile(null);
    setActiveChat(null);
    setIsAdmin(false);
    setAdminView(null);
  };

  const handleMessagesChanged = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleProfileUpdate = useCallback((updatedProfile: Profile) => {
    setProfile(updatedProfile);
  }, []);

  const handleLogin = useCallback((targetReadableId?: string) => {
    if (targetReadableId) {
      setPendingTargetId(targetReadableId);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (isAdmin && adminView === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <div className="text-5xl mb-2">💬</div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {profile.display_name}</h1>
          <p className="text-muted-foreground">Where would you like to go?</p>
          <div className="flex gap-4">
            <button
              onClick={() => setAdminView('chat')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all duration-200 min-w-[160px]"
            >
              <span className="text-4xl">💬</span>
              <span className="font-semibold text-foreground">Chats</span>
              <span className="text-xs text-muted-foreground">Go to messages</span>
            </button>
            <button
              onClick={() => setAdminView('admin')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all duration-200 min-w-[160px]"
            >
              <span className="text-4xl">🛡️</span>
              <span className="font-semibold text-foreground">Admin Portal</span>
              <span className="text-xs text-muted-foreground">Manage users</span>
            </button>
          </div>
          <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-4">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin && adminView === 'admin') {
    return <AdminPortal onLogout={handleLogout} onBackToChoice={() => setAdminView(null)} />;
  }

  const showChatArea = !isMobile || activeChat;
  const showSidebar = !isMobile || !activeChat;

  return (
    <div className="flex h-screen overflow-hidden">
      <AnnouncementBanner />
      {showUpdateAlert && (
        <UpdateAlert
          version={APP_VERSION}
          onDismiss={() => setShowUpdateAlert(false)}
        />
      )}
      {showSidebar && (
        <ChatSidebar
          me={profile}
          activeChat={activeChat}
          onSelectChat={setActiveChat}
          onLogout={handleLogout}
          refreshKey={refreshKey}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
      {showChatArea && (
        <ChatArea
          me={profile}
          activeChat={activeChat}
          onMessagesChanged={handleMessagesChanged}
          onBack={isMobile ? () => setActiveChat(null) : undefined}
        />
      )}
    </div>
  );
};

export default Index;
