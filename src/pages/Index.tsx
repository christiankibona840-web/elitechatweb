import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from '@/components/AuthScreen';
import ChatSidebar from '@/components/ChatSidebar';
import ChatArea from '@/components/ChatArea';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ type: 'dm'; id: string } | { type: 'group'; id: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const loadProfile = async (userId: string) => {
    // Small delay for trigger to create profile
    await new Promise(r => setTimeout(r, 500));
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
    setLoading(false);

    // Update online status
    if (data) {
      await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', userId);
    }
  };

  const handleLogout = async () => {
    if (profile) {
      await supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', profile.id);
    }
    await supabase.auth.signOut();
    setProfile(null);
    setActiveChat(null);
  };

  const handleMessagesChanged = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        me={profile}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onLogout={handleLogout}
        refreshKey={refreshKey}
      />
      <ChatArea
        me={profile}
        activeChat={activeChat}
        onMessagesChanged={handleMessagesChanged}
      />
    </div>
  );
};

export default Index;
