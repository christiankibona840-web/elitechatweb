import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/AuthScreen';
import ChatSidebar from '@/components/ChatSidebar';
import ChatArea from '@/components/ChatArea';
import UpdateAlert from '@/components/UpdateAlert';
import AdminPortal from '@/components/AdminPortal';
import ReelManagerPortal from '@/components/ReelManagerPortal';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import ReelsPanel from '@/components/ReelsPanel';
import TicTacToeBoard from '@/components/games/TicTacToeBoard';
import IncomingGameInvite from '@/components/games/IncomingGameInvite';
import { loadSavedTheme } from '@/components/SettingsPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const APP_VERSION = '2.25.0';

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReelManager, setIsReelManager] = useState(false);
  const [adminView, setAdminView] = useState<'chat' | 'admin' | null>(null);
  const [reelManagerView, setReelManagerView] = useState<'chat' | 'reels' | null>(null);
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

    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = (roleRows || []).map((r: any) => r.role);
    setIsAdmin(roles.includes('admin'));
    setIsReelManager(roles.includes('reel_manager'));

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
    setIsReelManager(false);
    setAdminView(null);
    setReelManagerView(null);
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6">
        {/* Particle background */}
        <div className="pointer-events-none absolute inset-0 z-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-accent/60"
              style={{
                left: `${(i * 53) % 100}%`,
                animation: `float-particle ${10 + (i % 6) * 2}s linear ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 text-center" style={{ animation: 'fadeInContent 0.8s ease-out' }}>
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-light shadow-gold ring-4 ring-accent/40"
            style={{ animation: 'scaleInBadge 0.8s ease-out, floatShake 4s ease-in-out 0.8s infinite' }}
          >
            <span className="text-5xl">💬</span>
          </div>

          <div className="space-y-2" style={{ animation: 'slideInDown 0.8s ease-out 0.3s backwards' }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-light tracking-tight">
              Welcome back, <span className="text-gradient-gold">{profile.display_name}</span>
            </h1>
            <p className="text-brand-light/80">Where would you like to go today?</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4" style={{ animation: 'bounceIn 0.8s ease-out 0.6s backwards' }}>
            <button
              onClick={() => setAdminView('chat')}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-brand-light/10 hover:bg-brand-light/20 border border-brand-light/30 backdrop-blur-md transition-all duration-300 min-w-[180px] hover:-translate-y-1 hover:shadow-elegant"
            >
              <span className="text-5xl transition-transform group-hover:scale-110">💬</span>
              <span className="font-display text-lg font-semibold text-brand-light">Chats</span>
              <span className="text-xs text-brand-light/70">Go to messages</span>
            </button>
            <button
              onClick={() => setAdminView('admin')}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-gold border border-accent/50 transition-all duration-300 min-w-[180px] hover:-translate-y-1 shadow-gold hover:shadow-gold-strong"
            >
              <span className="text-5xl transition-transform group-hover:scale-110">🛡️</span>
              <span className="font-display text-lg font-semibold text-accent-foreground">Admin Portal</span>
              <span className="text-xs text-accent-foreground/80">Manage users</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-brand-light/70 hover:text-brand-light transition-colors mt-2 underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin && adminView === 'admin') {
    return <AdminPortal onLogout={handleLogout} onBackToChoice={() => setAdminView(null)} />;
  }

  if (isReelManager && !isAdmin && reelManagerView === null) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6">
        <div className="pointer-events-none absolute inset-0 z-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-accent/60"
              style={{
                left: `${(i * 53) % 100}%`,
                animation: `float-particle ${10 + (i % 6) * 2}s linear ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 text-center" style={{ animation: 'fadeInContent 0.8s ease-out' }}>
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-light shadow-gold ring-4 ring-accent/40"
            style={{ animation: 'scaleInBadge 0.8s ease-out, floatShake 4s ease-in-out 0.8s infinite' }}
          >
            <span className="text-5xl">🎬</span>
          </div>

          <div className="space-y-2" style={{ animation: 'slideInDown 0.8s ease-out 0.3s backwards' }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-brand-light tracking-tight">
              Welcome back, <span className="text-gradient-gold">{profile.display_name}</span>
            </h1>
            <p className="text-brand-light/80">Where would you like to go today?</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4" style={{ animation: 'bounceIn 0.8s ease-out 0.6s backwards' }}>
            <button
              onClick={() => setReelManagerView('chat')}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-brand-light/10 hover:bg-brand-light/20 border border-brand-light/30 backdrop-blur-md transition-all duration-300 min-w-[180px] hover:-translate-y-1 hover:shadow-elegant"
            >
              <span className="text-5xl transition-transform group-hover:scale-110">💬</span>
              <span className="font-display text-lg font-semibold text-brand-light">Chats</span>
              <span className="text-xs text-brand-light/70">Go to messages</span>
            </button>
            <button
              onClick={() => setReelManagerView('reels')}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-gold border border-accent/50 transition-all duration-300 min-w-[180px] hover:-translate-y-1 shadow-gold hover:shadow-gold-strong"
            >
              <span className="text-5xl transition-transform group-hover:scale-110">🎬</span>
              <span className="font-display text-lg font-semibold text-accent-foreground">Reel Portal</span>
              <span className="text-xs text-accent-foreground/80">Manage Instagram reels</span>
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-brand-light/70 hover:text-brand-light transition-colors mt-2 underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (isReelManager && reelManagerView === 'reels') {
    return <ReelManagerPortal onLogout={handleLogout} onBackToChoice={() => setReelManagerView(null)} />;
  }

  const showChatArea = !isMobile || activeChat;
  const showSidebar = !isMobile || (!activeChat && !activeGameId);

  // Listen for rematch events from inside the board
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { gameId?: string } | undefined;
      if (detail?.gameId) setActiveGameId(detail.gameId);
    };
    window.addEventListener('open-game', handler);
    return () => window.removeEventListener('open-game', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <AnnouncementBanner />
      <IncomingGameInvite me={profile} onOpenGame={(id) => setActiveGameId(id)} />
      {showUpdateAlert && (
        <UpdateAlert
          version={APP_VERSION}
          onDismiss={() => setShowUpdateAlert(false)}
        />
      )}
      {showSidebar && !activeGameId && (
        <ChatSidebar
          me={profile}
          activeChat={activeChat}
          onSelectChat={setActiveChat}
          onLogout={handleLogout}
          refreshKey={refreshKey}
          onProfileUpdate={handleProfileUpdate}
          onOpenGame={(id) => setActiveGameId(id)}
        />
      )}
      {activeGameId ? (
        <div className="flex-1 min-w-0">
          <TicTacToeBoard
            gameId={activeGameId}
            me={profile}
            onClose={() => setActiveGameId(null)}
          />
        </div>
      ) : (
        showChatArea && (
          <ChatArea
            me={profile}
            activeChat={activeChat}
            onMessagesChanged={handleMessagesChanged}
            onBack={isMobile ? () => setActiveChat(null) : undefined}
            onChallengeOpponent={(userId) => {
              // Send invite immediately, opens via realtime when accepted
              import('@/components/games/GameInviteModal');
              setActiveChat({ type: 'dm', id: userId });
              window.dispatchEvent(new CustomEvent('challenge-bestie', { detail: { userId } }));
            }}
          />
        )
      )}
      {!isMobile && !activeGameId && <ReelsPanel />}
    </div>
  );
};

export default Index;
