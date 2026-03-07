import { useState, useEffect, useCallback } from 'react';
import { DB, User, Contact } from '@/lib/chatStore';
import AuthScreen from '@/components/AuthScreen';
import ChatSidebar from '@/components/ChatSidebar';
import ChatArea from '@/components/ChatArea';
import AddContactModal from '@/components/AddContactModal';
import { toast } from 'sonner';

const Index = () => {
  const [me, setMe] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-login
  useEffect(() => {
    const session = DB.getSession();
    if (session) {
      const accounts = DB.getAccounts();
      const acc = Object.values(accounts).find(a => a.id === session.id);
      if (acc) {
        setMe(acc);
        setContacts(DB.getContacts(acc.id));
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setMe(user);
    setContacts(DB.getContacts(user.id));
  };

  const handleLogout = () => {
    DB.clearSession();
    setMe(null);
    setContacts([]);
    setActiveId(null);
  };

  const handleSelectContact = (id: string) => {
    if (me) {
      DB.clearUnread(me.id, id);
      setActiveId(id);
      setRefreshKey(k => k + 1);
    }
  };

  const handleAddContact = (name: string, id: string): string | null => {
    if (!me) return 'Hujaingia';
    if (id === me.id) return 'Huwezi kujiongeza mwenyewe';
    if (contacts.find(c => c.id === id)) return 'Mtu huyu tayari yuko kwenye orodha yako';
    const newContact: Contact = { id, displayName: name };
    const updated = [...contacts, newContact];
    setContacts(updated);
    DB.saveContacts(me.id, updated);
    setModalOpen(false);
    toast.success(`✅ ${name} ameongezwa kwenye mawasiliano`);
    return null;
  };

  const handleMessagesChanged = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (!me) return <AuthScreen onLogin={handleLogin} />;

  const activeContact = contacts.find(c => c.id === activeId) || null;

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar
        key={refreshKey}
        me={me}
        contacts={contacts}
        activeId={activeId}
        onSelectContact={handleSelectContact}
        onOpenAddContact={() => setModalOpen(true)}
        onLogout={handleLogout}
      />
      <ChatArea
        me={me}
        contact={activeContact}
        onMessagesChanged={handleMessagesChanged}
      />
      <AddContactModal
        open={modalOpen}
        myId={me.id}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddContact}
      />
    </div>
  );
};

export default Index;
