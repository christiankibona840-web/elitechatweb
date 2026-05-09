import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';

interface MediaGalleryProps {
  chatId: string;
  chatType: 'dm' | 'group';
  myId: string;
  onClose: () => void;
}

type MediaItem = {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at: string;
};

const MediaGallery = ({ chatId, chatType, myId, onClose }: MediaGalleryProps) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [tab, setTab] = useState<'media' | 'docs'>('media');

  useEffect(() => { loadMedia(); }, [chatId, chatType]);

  const loadMedia = async () => {
    let data: any[] = [];
    if (chatType === 'dm') {
      const { data: msgs } = await supabase
        .from('messages').select('id, file_url, file_name, file_type, created_at')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${myId})`)
        .not('file_url', 'is', null).order('created_at', { ascending: false });
      data = msgs || [];
    } else {
      const { data: msgs } = await supabase
        .from('group_messages').select('id, file_url, file_name, file_type, created_at')
        .eq('group_id', chatId).not('file_url', 'is', null).order('created_at', { ascending: false });
      data = msgs || [];
    }
    setItems(data);
  };

  const mediaItems = items.filter(i => i.file_type?.startsWith('image/') || i.file_type?.startsWith('video/') || i.file_type?.startsWith('audio/'));
  const docItems = items.filter(i => !i.file_type?.startsWith('image/') && !i.file_type?.startsWith('video/') && !i.file_type?.startsWith('audio/'));
  const shown = tab === 'media' ? mediaItems : docItems;

  const getIcon = (type: string) => {
    if (type?.startsWith('image/')) return <ImageIcon size={16} className="text-primary" />;
    if (type?.startsWith('video/')) return <Film size={16} className="text-primary" />;
    if (type?.startsWith('audio/')) return <Music size={16} className="text-primary" />;
    return <FileText size={16} className="text-muted-foreground" />;
  };

  return (
    <div className="absolute inset-0 z-20 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-app-header border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-app-icon hover:text-foreground"><X size={20} /></button>
          <span className="text-sm font-medium text-foreground">Media, Links & Docs</span>
        </div>
      </div>
      <div className="flex border-b border-border">
        <button onClick={() => setTab('media')} className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${tab === 'media' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          Media ({mediaItems.length})
        </button>
        <button onClick={() => setTab('docs')} className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${tab === 'docs' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          Docs ({docItems.length})
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {shown.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No {tab} shared yet</div>
        ) : tab === 'media' ? (
          <div className="grid grid-cols-3 gap-1">
            {shown.map(item => (
              <a key={item.id} href={item.file_url} target="_blank" rel="noopener noreferrer" className="aspect-square bg-muted rounded overflow-hidden">
                {item.file_type?.startsWith('image/') ? (
                  <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                ) : item.file_type?.startsWith('video/') ? (
                  <video src={item.file_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music size={28} className="text-muted-foreground" /></div>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {shown.map(item => (
              <a key={item.id} href={item.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                {getIcon(item.file_type)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{item.file_name || 'File'}</div>
                  <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaGallery;
