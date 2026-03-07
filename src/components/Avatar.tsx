import { avatarColor } from '@/lib/chatStore';

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
}

const Avatar = ({ name, size = 40, online }: AvatarProps) => {
  const fontSize = Math.round(size * 0.38);
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-bold text-foreground select-none"
        style={{ width: size, height: size, fontSize, background: avatarColor(name) }}
      >
        {(name || '?')[0].toUpperCase()}
      </div>
      {online && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-wa-online border-2 border-wa-panel rounded-full" />
      )}
    </div>
  );
};

export default Avatar;
