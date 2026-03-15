import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, CodeXml } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (targetReadableId?: string) => void;
}

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredContact, setHoveredContact] = useState<'designer' | 'developer' | null>(null);
  const [targetContact, setTargetContact] = useState<{ readableId: string; name: string } | null>(null);

  const submit = async (overrideTarget?: { readableId: string; name: string }) => {
    setError('');
    setLoading(true);
    const target = overrideTarget || targetContact;
    try {
      if (mode === 'register') {
        if (!username.trim() || username.trim().length < 3) { setError('Username must be at least 3 characters'); setLoading(false); return; }
        if (!email.trim()) { setError('Enter your email'); setLoading(false); return; }
        if (!gender) { setError('Please select your gender'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        if (password !== confirm) { setError('Passwords do not match'); setLoading(false); return; }

        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              display_name: displayName.trim() || username.trim(),
              gender,
            }
          }
        });
        if (signUpError) { setError(signUpError.message); setLoading(false); return; }
        onLogin(target?.readableId);
      } else {
        if (!email.trim() || !password) { setError('Enter email and password'); setLoading(false); return; }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) { setError(signInError.message); setLoading(false); return; }
        onLogin(target?.readableId);
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleContactClick = (contact: { readableId: string; name: string }) => {
    setTargetContact(contact);
    setHoveredContact(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const inputClass = "bg-app-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-3 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-60 bg-gradient-to-br from-primary to-primary/60 z-0" />

      <div className="relative z-10 bg-app-panel rounded-2xl p-8 w-[360px] shadow-2xl" onKeyDown={handleKeyDown}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-primary/40">
            💬
          </div>
          <h1 className="text-xl font-semibold text-foreground">YST Web Chat</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {targetContact
              ? `Sign in to chat with ${targetContact.name}`
              : mode === 'register' ? 'Create a new account' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

        {targetContact && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
            <span className="text-xs text-primary font-medium">Chat with {targetContact.name} after login</span>
            <button onClick={() => setTargetContact(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>
        )}

        <div className="flex border border-border rounded-lg overflow-hidden mb-5">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 text-sm transition-all ${mode === 'login' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2 text-sm transition-all ${mode === 'register' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            Register
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {mode === 'register' && (
            <>
              <input className={inputClass} placeholder="Username (e.g. john)" maxLength={20} value={username} onChange={e => setUsername(e.target.value)} />
              <input className={inputClass} placeholder="Display name (e.g. John)" maxLength={30} value={displayName} onChange={e => setDisplayName(e.target.value)} />
              <select
                className={`${inputClass} ${!gender ? 'text-muted-foreground' : ''}`}
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="male">♂ Male</option>
                <option value="female">♀ Female</option>
                <option value="other">Other</option>
              </select>
            </>
          )}
          <input className={inputClass} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          {mode === 'register' && (
            <input className={inputClass} type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          )}
          {error && <p className="text-destructive text-xs text-center">{error}</p>}
          <button
            onClick={() => submit()}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold mt-1 hover:bg-app-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        <div className="text-center text-muted-foreground text-xs mt-5 flex items-center justify-center gap-1">
          🔒 End-to-end encrypted messaging
        </div>

        {/* Contact buttons */}
        <div className="flex justify-between mt-6 px-2">
          <div className="relative"
            onMouseEnter={() => setHoveredContact('designer')}
            onMouseLeave={() => setHoveredContact(null)}
          >
            <button
              onClick={() => handleContactClick({ readableId: '0005', name: 'Json' })}
              className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/25 transition-all hover:scale-110"
            >
              <Wrench size={20} />
            </button>
            {hoveredContact === 'designer' && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-xl p-3 shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">JS</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Json</div>
                    <div className="text-[10px] text-muted-foreground font-mono">ID: 0005</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chat with the portal structural designer for structure you want to be modified in the portal
                </p>
                <p className="text-[10px] text-primary mt-2 font-medium">Click to sign in & chat →</p>
              </div>
            )}
          </div>

          <div className="relative"
            onMouseEnter={() => setHoveredContact('developer')}
            onMouseLeave={() => setHoveredContact(null)}
          >
            <button
              onClick={() => handleContactClick({ readableId: '0002', name: 'Chris' })}
              className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/25 transition-all hover:scale-110"
            >
              <CodeXml size={20} />
            </button>
            {hoveredContact === 'developer' && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-popover border border-border rounded-xl p-3 shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">CH</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Chris</div>
                    <div className="text-[10px] text-muted-foreground font-mono">ID: 0002</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chat with the portal developer for things you want to be added to the portal
                </p>
                <p className="text-[10px] text-primary mt-2 font-medium">Click to sign in & chat →</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
