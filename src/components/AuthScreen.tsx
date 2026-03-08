import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthScreenProps {
  onLogin: () => void;
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

  const submit = async () => {
    setError('');
    setLoading(true);
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
        onLogin();
      } else {
        if (!email.trim() || !password) { setError('Enter email and password'); setLoading(false); return; }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) { setError(signInError.message); setLoading(false); return; }
        onLogin();
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const inputClass = "bg-wa-input-bg text-foreground border border-transparent rounded-lg px-3.5 py-3 text-sm focus:border-primary transition-colors placeholder:text-muted-foreground outline-none";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-60 bg-primary z-0" />

      <div className="relative z-10 bg-wa-panel rounded-2xl p-8 w-[360px] shadow-2xl" onKeyDown={handleKeyDown}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-primary/40">
            💬
          </div>
          <h1 className="text-xl font-normal text-foreground">Web Chaty YST</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'register' ? 'Create a new account' : 'Welcome back! Sign in to continue'}
          </p>
        </div>

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
            onClick={submit}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold mt-1 hover:bg-wa-green-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
          </button>
        </div>

        <div className="text-center text-muted-foreground text-xs mt-5 flex items-center justify-center gap-1">
          🔒 Your conversations are secured by Lovable Cloud
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
