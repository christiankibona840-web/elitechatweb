import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Avatar from './Avatar';
import { Plus, Send, Trash2, Image, FileAudio, FileVideo, FileText, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface ProjectZoneProps {
  me: Profile;
}

interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  media_type: string | null;
  file_name: string | null;
  created_at: string | null;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles?: { display_name: string; avatar_url: string | null } | null;
}

const ProjectZone = ({ me }: ProjectZoneProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*, profiles!projects_user_id_fkey(display_name, avatar_url)')
      .order('created_at', { ascending: false });
    setProjects((data as any) || []);
    setLoading(false);
  };

  const loadComments = async (projectId: string) => {
    const { data } = await supabase
      .from('project_comments')
      .select('*, profiles!project_comments_user_id_fkey(display_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    setComments(prev => ({ ...prev, [projectId]: (data as any) || [] }));
  };

  const toggleComments = (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
    } else {
      setExpandedProject(projectId);
      loadComments(projectId);
    }
  };

  const getMediaType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'text';
  };

  const createProject = async () => {
    if (!title.trim()) { toast.error('Enter a project title'); return; }
    setCreating(true);
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    let fileName: string | null = null;
    if (file) {
      mediaType = getMediaType(file);
      fileName = file.name;
      const path = `projects/${me.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(path, file);
      if (uploadError) { toast.error('Failed to upload file'); setCreating(false); return; }
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }
    const { error } = await supabase.from('projects').insert({
      user_id: me.id, title: title.trim(), description: description.trim() || null,
      media_url: mediaUrl, media_type: mediaType, file_name: fileName,
    });
    if (error) { toast.error('Failed to create project'); } else {
      toast.success('Project posted!');
      setTitle(''); setDescription(''); setFile(null); setShowCreate(false);
      loadProjects();
    }
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    toast.success('Project deleted');
    loadProjects();
  };

  const sendComment = async (projectId: string) => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    const { error } = await supabase.from('project_comments').insert({
      project_id: projectId, user_id: me.id, content: commentText.trim(),
    });
    if (error) { toast.error('Failed to send comment'); } else {
      setCommentText('');
      loadComments(projectId);
    }
    setSendingComment(false);
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">🚀 Project Zone</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors">
          {showCreate ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border-b border-border bg-accent/20">
          <input
            className="bg-app-input-bg text-foreground border border-transparent rounded-lg px-3 py-2 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full mb-2"
            placeholder="Project title" value={title} onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="bg-app-input-bg text-foreground border border-transparent rounded-lg px-3 py-2 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full mb-2 resize-none"
            placeholder="Description (optional)" rows={2} value={description} onChange={e => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <input type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" onChange={e => setFile(e.target.files?.[0] || null)} />
              <Plus size={14} /> {file ? file.name : 'Attach file'}
            </label>
            {file && <button onClick={() => setFile(null)} className="text-destructive text-xs">Remove</button>}
          </div>
          <button onClick={createProject} disabled={creating} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/80 transition-colors disabled:opacity-50 w-full">
            {creating ? 'Posting...' : 'Post Project'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-10">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-10 px-5 text-muted-foreground">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-sm">No projects yet. Be the first to share!</p>
        </div>
      ) : (
        projects.map(p => (
          <div key={p.id} className="border-b border-border">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={p.profiles?.display_name || '?'} size={32} avatarUrl={p.profiles?.avatar_url} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{p.profiles?.display_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{fmtDate(p.created_at)}</span>
                </div>
                {p.user_id === me.id && (
                  <button onClick={() => deleteProject(p.id)} className="text-destructive/60 hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                )}
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">{p.title}</h4>
              {p.description && <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{p.description}</p>}
              {p.media_url && p.media_type === 'image' && <img src={p.media_url} alt={p.title} className="rounded-lg max-h-48 object-cover w-full mb-2" />}
              {p.media_url && p.media_type === 'video' && <video src={p.media_url} controls className="rounded-lg max-h-48 w-full mb-2" />}
              {p.media_url && p.media_type === 'audio' && <audio src={p.media_url} controls className="w-full mb-2" />}
              {p.media_url && p.media_type !== 'image' && p.media_type !== 'video' && p.media_type !== 'audio' && (
                <a href={p.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mb-2 block">📎 {p.file_name || 'Download file'}</a>
              )}
              <button onClick={() => toggleComments(p.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
                <MessageSquare size={13} />
                {expandedProject === p.id ? 'Hide comments' : 'Comments'}
                {comments[p.id] && comments[p.id].length > 0 && ` (${comments[p.id].length})`}
              </button>
            </div>
            {expandedProject === p.id && (
              <div className="bg-accent/10 px-4 py-2 border-t border-border/50">
                {(comments[p.id] || []).map(c => (
                  <div key={c.id} className="flex items-start gap-2 py-1.5">
                    <Avatar name={c.profiles?.display_name || '?'} size={24} avatarUrl={c.profiles?.avatar_url} />
                    <div>
                      <span className="text-xs font-medium text-foreground">{c.profiles?.display_name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">{fmtDate(c.created_at)}</span>
                      <p className="text-xs text-foreground/80">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-2 mb-1">
                  <input
                    className="flex-1 bg-app-input-bg text-foreground border border-transparent rounded-full px-3 py-1.5 text-xs focus:border-primary outline-none placeholder:text-muted-foreground"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendComment(p.id); }}
                  />
                  <button onClick={() => sendComment(p.id)} disabled={sendingComment} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ProjectZone;
