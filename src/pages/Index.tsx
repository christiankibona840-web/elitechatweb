import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/AuthScreen';
import ChatSidebar from '@/components/ChatSidebar';
import ChatArea from '@/components/ChatArea';
import UpdateAlert from '@/components/UpdateAlert';
import AdminPortal from '@/components/AdminPortal';
import { loadSavedTheme } from '@/components/SettingsPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const APP_VERSION = '2.0.0';

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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

  // When profile loads and there's a pending target, look up the user and open chat
  useEffect(() => {
    if (!profile || !pendingTargetId) return;

    const openTargetChat = async () => {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('readable_id', pendingTargetId)
        .single();

      if (targetProfile) {
        // Add as contact if not already
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
  }, [profile?.id]);

  const loadProfile = async (userId: string) => {
    await new Promise(r => setTimeout(r, 500));
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);

    // Check admin role
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

  if (isAdmin) {
    return <AdminPortal onLogout={handleLogout} />;
  }

  const showChatArea = !isMobile || activeChat;
  const showSidebar = !isMobile || !activeChat;

  return (
    <div className="flex h-screen overflow-hidden">
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
