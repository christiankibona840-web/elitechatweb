import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, CodeXml, MessageCircleHeart } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (targetReadableId?: string) => void;
}

const SLIDES = ['/auth-bg-1.jpg', '/auth-bg-2.jpg', '/auth-bg-3.jpg'];
const TAGLINES = [
  'Where conversations come alive',
  'Connect. Share. Belong.',
  'Crafted for the moments that matter',
];

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
  const [showAuth, setShowAuth] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [taglineIdx, setTaglineIdx] = useState(0);

  // Slideshow rotation
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Tagline rotation
  useEffect(() => {
    const id = setInterval(() => {
      setTaglineIdx((i) => (i + 1) % TAGLINES.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Generate particles once
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 8 + Math.random() * 12,
        size: 2 + Math.random() * 4,
      })),
    []
  );

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
            },
          },
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
    setShowAuth(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const inputClass =
    "bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60 border border-white/20 rounded-lg px-3.5 py-3 text-sm focus:border-accent focus:bg-white/15 transition-all outline-none";

  return (
    <div className="fixed inset-0 overflow-hidden font-sans">
      {/* === Slideshow Background === */}
      <div className="absolute inset-0 z-[1]">
        {SLIDES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ${
              i === activeSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={i === activeSlide ? { animation: 'kenBurns 20s ease-out forwards' } : undefined}
          />
        ))}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background: 'var(--gradient-hero)',
            animation: 'pulseOverlay 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* === Particles === */}
      <div className="absolute inset-0 z-[2] pointer-events-none">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-white/50"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `float-particle ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* === Hero Intro === */}
      {!showAuth && (
        <div
          className="relative z-[3] h-full flex flex-col items-center justify-center text-center px-5 py-10 overflow-y-auto"
          style={{ animation: 'fadeInContent 1s ease-out' }}
        >
          {/* Badge logo */}
          <div
            className="mb-8"
            style={{ animation: 'floatShake 4s ease-in-out infinite, scaleInBadge 0.8s ease-out' }}
          >
            <div
              className="relative w-[140px] h-[140px] rounded-full bg-white flex items-center justify-center overflow-hidden border-[5px] border-accent"
              style={{
                boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 8px hsl(var(--accent) / 0.3)',
              }}
            >
              {/* shimmer sweep */}
              <span
                className="absolute"
                style={{
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.5), transparent)',
                  animation: 'shimmer 3s infinite',
                }}
              />
              <MessageCircleHeart
                className="relative z-[2] w-[70px] h-[70px] text-brand-primary"
                style={{ animation: 'rotateSubtle 6s ease-in-out infinite' }}
                strokeWidth={1.6}
              />
            </div>
          </div>

          <h1
            className="font-display font-black text-white leading-[1.1] tracking-tight mb-5"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              animation: 'slideInDown 0.8s ease-out 0.3s backwards',
            }}
          >
            YST Web Chat
          </h1>

          <p
            className="text-white/95 font-medium uppercase mb-7"
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.4rem)',
              letterSpacing: '0.15em',
              animation: 'slideInUp 0.8s ease-out 0.5s backwards',
            }}
          >
            Modern · Secure · Beautiful
          </p>

          <p
            key={taglineIdx}
            className="text-white/85 max-w-xl leading-relaxed min-h-[60px] mb-10 px-4"
            style={{
              fontSize: 'clamp(0.95rem, 1.6vw, 1.1rem)',
              animation: 'fadeInScale 0.8s ease-out backwards',
            }}
          >
            <span className="inline-block border-r-[3px] border-white/90 pr-1.5" style={{ animation: 'blink 0.7s step-end infinite' }}>
              {TAGLINES[taglineIdx]}
            </span>
          </p>

          {/* Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none justify-center px-2"
            style={{ animation: 'bounceIn 0.8s ease-out 0.9s backwards' }}
          >
            <button
              onClick={() => { setMode('register'); setShowAuth(true); }}
              className="relative overflow-hidden px-10 py-4 rounded-full font-semibold uppercase tracking-wider text-sm sm:text-base text-brand-dark transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'var(--gradient-gold)',
                boxShadow: 'var(--shadow-gold)',
                animation: 'pulseGold 2s ease-in-out infinite',
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => { setMode('login'); setShowAuth(true); }}
              className="px-10 py-4 rounded-full font-semibold uppercase tracking-wider text-sm sm:text-base text-white border-2 border-white/50 bg-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white hover:-translate-y-1 hover:scale-105"
            >
              Sign In
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center mt-12 px-4">
            {[
              { icon: '💬', label: 'Real-time messaging' },
              { icon: '🛡️', label: 'End-to-end secure' },
              { icon: '✨', label: 'AI-powered replies' },
            ].map((f, i) => (
              <div
                key={f.label}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm transition-all hover:-translate-y-1 hover:bg-white/20 hover:border-white/40"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${1.1 + i * 0.2}s backwards`,
                }}
              >
                <span className="text-xl" style={{ animation: 'rotateSubtle 3s ease-in-out infinite' }}>
                  {f.icon}
                </span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Quick contact buttons */}
          <div className="flex gap-4 mt-10">
            <div
              className="relative"
              onMouseEnter={() => setHoveredContact('designer')}
              onMouseLeave={() => setHoveredContact(null)}
            >
              <button
                onClick={() => handleContactClick({ readableId: '0005', name: 'Json' })}
                className="w-12 h-12 rounded-full bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center text-accent hover:bg-white/25 transition-all hover:scale-110"
                aria-label="Contact designer"
              >
                <Wrench size={20} />
              </button>
              {hoveredContact === 'designer' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-popover/95 backdrop-blur border border-border rounded-xl p-3 shadow-elegant z-20">
                  <div className="text-sm font-semibold text-foreground mb-1">Json · Designer</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Chat with the portal designer about structural changes.
                  </p>
                  <p className="text-[10px] text-accent mt-2 font-medium">Click to sign in & chat →</p>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setHoveredContact('developer')}
              onMouseLeave={() => setHoveredContact(null)}
            >
              <button
                onClick={() => handleContactClick({ readableId: '0002', name: 'Chris' })}
                className="w-12 h-12 rounded-full bg-white/15 border border-white/30 backdrop-blur-md flex items-center justify-center text-accent hover:bg-white/25 transition-all hover:scale-110"
                aria-label="Contact developer"
              >
                <CodeXml size={20} />
              </button>
              {hoveredContact === 'developer' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-popover/95 backdrop-blur border border-border rounded-xl p-3 shadow-elegant z-20">
                  <div className="text-sm font-semibold text-foreground mb-1">Chris · Developer</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Chat with the portal developer about new features.
                  </p>
                  <p className="text-[10px] text-accent mt-2 font-medium">Click to sign in & chat →</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Auth Form Modal === */}
      {showAuth && (
        <div
          className="relative z-[3] h-full flex items-center justify-center p-4 overflow-y-auto"
          style={{ animation: 'fadeInContent 0.5s ease-out' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 sm:p-8 bg-brand-primary/40 backdrop-blur-xl border border-white/20 shadow-elegant"
            onKeyDown={handleKeyDown}
            style={{ animation: 'fadeInScale 0.5s ease-out' }}
          >
            <button
              onClick={() => setShowAuth(false)}
              className="text-white/70 hover:text-white text-xs mb-3 flex items-center gap-1"
            >
              ← Back
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl shadow-gold border-2 border-accent" style={{ background: 'var(--gradient-gold)' }}>
                💬
              </div>
              <h2 className="font-display text-2xl text-white">YST Web Chat</h2>
              <p className="text-white/70 text-xs mt-1">
                {targetContact
                  ? `Sign in to chat with ${targetContact.name}`
                  : mode === 'register' ? 'Create your account' : 'Welcome back'}
              </p>
            </div>

            {targetContact && (
              <div className="bg-accent/15 border border-accent/30 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
                <span className="text-xs text-accent font-medium">Chat with {targetContact.name} after login</span>
                <button onClick={() => setTargetContact(null)} className="text-xs text-white/60 hover:text-white">✕</button>
              </div>
            )}

            <div className="flex border border-white/20 rounded-lg overflow-hidden mb-4 bg-white/5">
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-2 text-sm transition-all ${mode === 'login' ? 'bg-accent text-brand-dark font-semibold' : 'text-white/70'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('register'); setError(''); }}
                className={`flex-1 py-2 text-sm transition-all ${mode === 'register' ? 'bg-accent text-brand-dark font-semibold' : 'text-white/70'}`}
              >
                Register
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {mode === 'register' && (
                <>
                  <input className={inputClass} placeholder="Username (e.g. john)" maxLength={20} value={username} onChange={e => setUsername(e.target.value)} />
                  <input className={inputClass} placeholder="Display name" maxLength={30} value={displayName} onChange={e => setDisplayName(e.target.value)} />
                  <select
                    className={`${inputClass} ${!gender ? 'text-white/60' : ''}`}
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                  >
                    <option value="" className="text-brand-dark">Select gender</option>
                    <option value="male" className="text-brand-dark">♂ Male</option>
                    <option value="female" className="text-brand-dark">♀ Female</option>
                    <option value="other" className="text-brand-dark">Other</option>
                  </select>
                </>
              )}
              <input className={inputClass} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className={inputClass} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              {mode === 'register' && (
                <input className={inputClass} type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} />
              )}
              {error && <p className="text-destructive text-xs text-center bg-destructive/10 rounded py-2 px-2">{error}</p>}
              <button
                onClick={() => submit()}
                disabled={loading}
                className="rounded-full py-3 text-sm font-semibold uppercase tracking-wider mt-1 text-brand-dark hover:-translate-y-0.5 transition-transform disabled:opacity-50"
                style={{ background: 'var(--gradient-gold)', boxShadow: 'var(--shadow-gold)' }}
              >
                {loading ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Sign In'}
              </button>
            </div>

            <div className="text-center text-white/60 text-xs mt-5 flex items-center justify-center gap-1">
              🔒 End-to-end encrypted messaging
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
