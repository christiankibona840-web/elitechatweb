const COLORS = ['#00a884','#3fc1cb','#7b66ff','#ff6b6b','#ffa94d','#74c0fc','#f06595'];

export function avatarColor(name: string): string {
  return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
}

export function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export type Presence = 'active' | 'idle' | 'offline';

/**
 * Active   = is_online flag set AND heartbeat within 2 minutes (truly in the web)
 * Idle     = is_online flag set BUT no recent heartbeat (forgot to log out / tab hidden)
 * Offline  = signed out
 */
export function getPresence(isOnline?: boolean | null, lastSeen?: string | null): Presence {
  if (!isOnline) return 'offline';
  if (!lastSeen) return 'idle';
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  return ageMs < 2 * 60 * 1000 ? 'active' : 'idle';
}

export function fmtDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
