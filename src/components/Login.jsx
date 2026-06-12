import { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { LogIn, ShieldAlert } from 'lucide-react';
import '../index.css';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        await updateProfile(credential.user, {
          displayName: displayName.trim()
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      }
    } catch (err) {
      console.error("Email Auth Error:", err);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Try signing up!';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already in use. Try signing in!';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-overlay">
      <div className="card login-card" style={{ padding: '40px 30px', textAlign: 'center', maxWidth: '400px', width: '90%', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', background: 'rgba(23, 23, 23, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        
        {/* Creative Brand Logo / Emoji header */}
        <div style={{ marginBottom: '24px' }}>
          <div className="login-icon-glow" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700, #FFA500)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px', boxShadow: '0 0 20px rgba(255, 215, 0, 0.35)' }}>
            <LogIn size={28} style={{ color: '#000' }} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px', margin: '0 0 8px 0' }}>
            MoMo's Hub <span className="brand-emoji">🤬</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Sign in to track your workouts, manage your goals, and unlock rewards.
          </p>
        </div>

        {/* Error notification block if any */}
        {error && (
          <div className="card" style={{ background: 'rgba(255, 59, 48, 0.12)', border: '1px solid rgba(255, 59, 48, 0.2)', borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', textAlign: 'left' }}>
            <ShieldAlert className="text-danger" size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: '600' }}>
              {error}
            </span>
          </div>
        )}

        {!showEmailAuth ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Google Login Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="btn-primary login-btn-shine"
              style={{
                padding: '14px 24px',
                fontSize: '1rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: loading ? 0.75 : 1,
                pointerEvents: loading ? 'none' : 'auto',
                width: '100%',
                fontWeight: '700',
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                color: '#000',
                border: 'none',
                boxShadow: '0 8px 20px rgba(255, 215, 0, 0.2)'
              }}
            >
              {loading ? (
                <div className="spinner-loading" style={{ width: '20px', height: '20px', borderTopColor: '#000', margin: 0 }}></div>
              ) : (
                <>
                  {/* Google Colored Logo icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: '#000', marginRight: '4px' }}>
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.155 0-5.714-2.559-5.714-5.714 0-3.155 2.559-5.714 5.714-5.714 1.393 0 2.668.5 3.66 1.314l3.125-3.125C18.88 3.518 15.768 2.25 12.24 2.25 6.3 2.25 1.5 7.05 1.5 13s4.8 10.75 10.74 10.75c5.657 0 10.43-3.924 10.43-10.75 0-.616-.056-1.209-.157-1.715H12.24z"/>
                  </svg>
                  Sign In with Google
                </>
              )}
            </button>

            {/* Switch to Email Login */}
            <button
              onClick={() => { setShowEmailAuth(true); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'underline', marginTop: '8px' }}
            >
              Problems with Google? Sign in with Email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px', textAlign: 'center' }}>
              {isSignUp ? 'Create Account' : 'Email Sign In'}
            </h3>

            {isSignUp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pooja"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff' }}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Email Address</label>
              <input
                type="email"
                placeholder="pooja@momo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: '14px',
                fontSize: '1rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: '700',
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                color: '#000',
                border: 'none',
                marginTop: '6px'
              }}
            >
              {loading ? (
                <div className="spinner-loading" style={{ width: '20px', height: '20px', borderTopColor: '#000', margin: 0 }}></div>
              ) : (
                isSignUp ? 'Create & Sign In' : 'Sign In'
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8rem' }}>
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
              <button
                type="button"
                onClick={() => { setShowEmailAuth(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Secured by Firebase Authentication
        </div>

      </div>
    </div>
  );
}
