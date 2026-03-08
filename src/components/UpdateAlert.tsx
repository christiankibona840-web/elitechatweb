import { X, Sparkles } from 'lucide-react';

interface UpdateAlertProps {
  version: string;
  onDismiss: () => void;
}

const UpdateAlert = ({ version, onDismiss }: UpdateAlertProps) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-[msg-pop_0.3s_ease-out]">
      <div className="bg-primary text-primary-foreground rounded-xl px-5 py-3 shadow-2xl shadow-primary/30 flex items-center gap-3 max-w-md">
        <Sparkles size={20} className="flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold">App Updated to v{version}!</div>
          <div className="text-xs opacity-80">
            New features: voice notes, typing indicator, themes, status viewers & more. Your data is safe!
          </div>
        </div>
        <button onClick={onDismiss} className="text-primary-foreground/80 hover:text-primary-foreground flex-shrink-0">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default UpdateAlert;
