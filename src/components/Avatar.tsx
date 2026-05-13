import React from 'react';
import { avatarColor, getPresence, type Presence } from '@/lib/chatStore';

interface AvatarProps {
  name: string;
  size?: number;
  /** Legacy: simple online flag. Prefer `presence` or `isOnline`+`lastSeen`. */
  online?: boolean;
  /** Explicit presence override. */
  presence?: Presence;
  /** Raw is_online from profiles. Combined with lastSeen to compute presence. */
  isOnline?: boolean | null;
  /** Raw last_seen ISO from profiles. */
  lastSeen?: string | null;
  avatarUrl?: string | null;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, size = 40, online, presence, isOnline, lastSeen, avatarUrl }, ref) => {
    const fontSize = Math.round(size * 0.38);

    // Determine which dot to show
    let resolved: Presence | null = null;
    if (presence) resolved = presence;
    else if (isOnline !== undefined || lastSeen !== undefined) resolved = getPresence(isOnline, lastSeen);
    else if (online) resolved = 'active';

    const dotClass =
      resolved === 'active'
        ? 'bg-app-online'
        : resolved === 'idle'
        ? 'bg-yellow-400'
        : '';

    const dotTitle =
      resolved === 'active'
        ? 'Active now'
        : resolved === 'idle'
        ? 'Online but inactive (may have forgotten to sign out)'
        : '';

    return (
      <div ref={ref} className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="rounded-full object-cover"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center font-bold text-foreground select-none"
            style={{ width: size, height: size, fontSize, background: avatarColor(name) }}
          >
            {(name || '?')[0].toUpperCase()}
          </div>
        )}
        {resolved && resolved !== 'offline' && (
          <div
            title={dotTitle}
            className={`absolute bottom-0.5 right-0.5 w-3 h-3 ${dotClass} border-2 border-app-panel rounded-full`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
