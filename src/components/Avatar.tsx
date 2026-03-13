import React from 'react';
import { avatarColor } from '@/lib/chatStore';

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
  avatarUrl?: string | null;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({ name, size = 40, online, avatarUrl }, ref) => {
  const fontSize = Math.round(size * 0.38);
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
      {online && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-app-online border-2 border-app-panel rounded-full" />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
