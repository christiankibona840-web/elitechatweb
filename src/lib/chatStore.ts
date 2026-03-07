// Utility functions for chat UI
const COLORS = ['#00a884','#3fc1cb','#7b66ff','#ff6b6b','#ffa94d','#74c0fc','#f06595'];

export function avatarColor(name: string): string {
  return COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
}

export function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Leo';
  if (diff === 1) return 'Jana';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
