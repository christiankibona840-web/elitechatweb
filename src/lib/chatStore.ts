// Local storage based chat data store

export interface User {
  id: string;
  username: string;
  displayName: string;
  passHash: string;
}

export interface Contact {
  id: string;
  displayName: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  time: number;
  status: 'sent' | 'delivered' | 'read';
}

function simpleHash(str: string): string {
  let h = 0;
  for (const c of str) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return h.toString(16);
}

export function generateId(): string {
  return 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function generateMsgId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DB = {
  getAccounts(): Record<string, User> {
    try { return JSON.parse(localStorage.getItem('wa_accounts') || '{}'); } catch { return {}; }
  },
  saveAccounts(a: Record<string, User>) { localStorage.setItem('wa_accounts', JSON.stringify(a)); },

  getSession(): User | null {
    try { return JSON.parse(localStorage.getItem('wa_session') || 'null'); } catch { return null; }
  },
  saveSession(u: User) { localStorage.setItem('wa_session', JSON.stringify(u)); },
  clearSession() { localStorage.removeItem('wa_session'); },

  getContacts(userId: string): Contact[] {
    try { return JSON.parse(localStorage.getItem(`wa_contacts_${userId}`) || '[]'); } catch { return []; }
  },
  saveContacts(userId: string, list: Contact[]) {
    localStorage.setItem(`wa_contacts_${userId}`, JSON.stringify(list));
  },

  getMsgs(myId: string, otherId: string): Message[] {
    const key = `wa_msgs_${[myId, otherId].sort().join('_')}`;
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  },
  saveMsgs(myId: string, otherId: string, msgs: Message[]) {
    const key = `wa_msgs_${[myId, otherId].sort().join('_')}`;
    localStorage.setItem(key, JSON.stringify(msgs));
  },
  addMsg(myId: string, otherId: string, msg: Message): Message[] {
    const msgs = DB.getMsgs(myId, otherId);
    msgs.push(msg);
    DB.saveMsgs(myId, otherId, msgs);
    return msgs;
  },
  deleteChat(myId: string, otherId: string) {
    const key = `wa_msgs_${[myId, otherId].sort().join('_')}`;
    localStorage.removeItem(key);
  },

  getUnread(userId: string): Record<string, number> {
    try { return JSON.parse(localStorage.getItem(`wa_unread_${userId}`) || '{}'); } catch { return {}; }
  },
  saveUnread(userId: string, obj: Record<string, number>) {
    localStorage.setItem(`wa_unread_${userId}`, JSON.stringify(obj));
  },
  incUnread(userId: string, fromId: string) {
    const u = DB.getUnread(userId);
    u[fromId] = (u[fromId] || 0) + 1;
    DB.saveUnread(userId, u);
  },
  clearUnread(userId: string, contactId: string) {
    const u = DB.getUnread(userId);
    u[contactId] = 0;
    DB.saveUnread(userId, u);
  },

  hashPassword: simpleHash,

  register(username: string, password: string, displayName: string): User | string {
    const accounts = DB.getAccounts();
    if (accounts[username]) return 'Jina hili tayari limetumika';
    const user: User = { id: generateId(), username, displayName, passHash: simpleHash(password) };
    accounts[username] = user;
    DB.saveAccounts(accounts);
    return user;
  },

  login(username: string, password: string): User | string {
    const accounts = DB.getAccounts();
    const acc = accounts[username];
    if (!acc || acc.passHash !== simpleHash(password)) return 'Jina au nywila si sahihi';
    return acc;
  }
};

const COLORS = ['#00a884','#3fc1cb','#7b66ff','#ff6b6b','#ffa94d','#74c0fc','#f06595'];
export function avatarColor(name: string): string {
  return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(ms: number): string {
  const now = new Date();
  const d = new Date(ms);
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Leo';
  if (diff === 1) return 'Jana';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
