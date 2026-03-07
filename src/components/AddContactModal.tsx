import { useState } from 'react';

interface AddContactModalProps {
  open: boolean;
  myId: string;
  onClose: () => void;
  onAdd: (name: string, id: string) => string | null;
}

const AddContactModal = ({ open, onClose, onAdd }: AddContactModalProps) => {
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleAdd = () => {
    setError('');
    if (!name.trim()) { setError('Weka jina'); return; }
    if (!contactId.trim()) { setError('Weka ID ya mtu'); return; }
    const err = onAdd(name.trim(), contactId.trim());
    if (err) { setError(err); return; }
    setName(''); setContactId(''); setError('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-popover border border-border rounded-2xl w-[360px] max-w-[90vw] shadow-2xl">
        <div className="flex items-center justify-between p-5 pb-3.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">➕ Ongeza Mawasiliano</h3>
          <button onClick={onClose} className="text-wa-icon hover:text-foreground transition-colors">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Jina la kuonyesha</label>
            <input
              className="bg-wa-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full"
              placeholder="mfano: Hamid"
              maxLength={30}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">ID ya mtu (wanakupa wao)</label>
            <input
              className="bg-wa-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none w-full"
              placeholder="mfano: user_abc123xyz"
              value={contactId}
              onChange={e => setContactId(e.target.value)}
            />
          </div>
          <div className="bg-accent border border-border rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
            💡 <span className="text-primary font-semibold">Jinsi ya kupata ID ya mtu:</span><br />
            Mwambie akuangalie chini ya sidebar yake — ataona ID yake mwenyewe. Akakupe hiyo ID, uiweke hapa.
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <div className="flex gap-2.5 justify-end p-5 pt-3.5 border-t border-border">
          <button onClick={onClose} className="bg-wa-input-bg text-foreground rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors">Ghairi</button>
          <button onClick={handleAdd} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-wa-green-dark transition-colors">Ongeza</button>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
