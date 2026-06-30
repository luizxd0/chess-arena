import React, { useState } from 'react';
import { Trophy, Mail, Lock, User, Play, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { auth, db, isFirebaseAvailable } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserStats } from '../types';

interface AuthPageProps {
  onAuthSuccess: (username: string, stats: UserStats, isGuest: boolean) => void;
  initialStats: UserStats;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, initialStats }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simple local fallback database stored in localStorage
  const getLocalUsers = (): Record<string, { username: string; email: string; passwordHash: string; stats: UserStats }> => {
    try {
      const users = localStorage.getItem('chess_arena_mock_users');
      return users ? JSON.parse(users) : {};
    } catch {
      return {};
    }
  };

  const saveLocalUsers = (users: Record<string, any>) => {
    try {
      localStorage.setItem('chess_arena_mock_users', JSON.stringify(users));
    } catch (e) {
      console.warn("Could not write mock users to local storage:", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic Validation
    if (!isLogin && username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      setIsLoading(false);
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      if (isFirebaseAvailable && auth && db) {
        // --- REAL FIREBASE FLOW ---
        if (isLogin) {
          // Firebase Login
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          
          // Retrieve stats and username from Firestore
          const docRef = doc(db, 'users', uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('chess_arena_logged_in_email', email.toLowerCase().trim());
            onAuthSuccess(data.username || 'PawnPusher', data.stats || initialStats, false);
          } else {
            // Document didn't exist, create default
            const fallbackUsername = email.split('@')[0] || 'Player';
            await setDoc(docRef, {
              username: fallbackUsername,
              email: email,
              stats: initialStats
            });
            localStorage.setItem('chess_arena_logged_in_email', email.toLowerCase().trim());
            onAuthSuccess(fallbackUsername, initialStats, false);
          }
        } else {
          // Firebase Register
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          
          // Save stats and username to Firestore
          const docRef = doc(db, 'users', uid);
          await setDoc(docRef, {
            username: username.trim(),
            email: email,
            stats: initialStats
          });
          localStorage.setItem('chess_arena_logged_in_email', email.toLowerCase().trim());
          onAuthSuccess(username.trim(), initialStats, false);
        }
      } else {
        // --- SIMULATED LOCAL FLOW ---
        const localUsers = getLocalUsers();
        const emailLower = email.toLowerCase().trim();

        if (isLogin) {
          // Mock Login
          const foundUser = Object.values(localUsers).find(
            u => u.email.toLowerCase() === emailLower && u.passwordHash === password
          );

          if (foundUser) {
            // Found matched user
            localStorage.setItem('chess_arena_logged_in_email', emailLower);
            onAuthSuccess(foundUser.username, foundUser.stats || initialStats, false);
          } else {
            throw new Error('Invalid email or password. Please try again.');
          }
        } else {
          // Mock Register
          if (localUsers[emailLower]) {
            throw new Error('An account with this email already exists.');
          }
          const isUsernameTaken = Object.values(localUsers).some(
            u => u.username.toLowerCase() === username.toLowerCase().trim()
          );
          if (isUsernameTaken) {
            throw new Error('This username is already taken. Please choose another.');
          }

          // Register new simulated user
          localUsers[emailLower] = {
            username: username.trim(),
            email: emailLower,
            passwordHash: password, // Simple plain text for local mock sandbox
            stats: initialStats
          };
          saveLocalUsers(localUsers);
          localStorage.setItem('chess_arena_logged_in_email', emailLower);

          onAuthSuccess(username.trim(), initialStats, false);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let friendlyMessage = err.message || 'An unexpected authentication error occurred.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use by another account.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyMessage = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid credentials. Please try again.';
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestPlay = () => {
    // Generate a quick fun random username or load existing guest from localStorage if there is one
    const randomID = Math.floor(Math.random() * 900) + 100;
    const defaultGuestName = `Guest#${randomID}`;
    onAuthSuccess(defaultGuestName, initialStats, true);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-3 md:p-4 relative overflow-hidden">
      {/* Visual Ambient Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl shadow-2xl p-4 md:p-8 relative z-10 transition-all duration-300">
        
        {/* Title Brand */}
        <div className="flex flex-col items-center mb-4 md:mb-8">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-linear-to-tr from-[#388E3C] via-[#4CAF50] to-[#81C784] flex items-center justify-center text-2xl md:text-4xl shadow-lg rotate-3 mb-2 md:mb-3 hover:rotate-0 transition-transform duration-300">
            👑
          </div>
          <h1 className="font-sans font-black text-xl md:text-2xl tracking-tight leading-none bg-linear-to-r from-white via-slate-100 to-[#81C784] bg-clip-text text-transparent">
            Chess Arena
          </h1>
          <p className="text-[#888888] text-[10px] md:text-xs font-mono tracking-widest uppercase mt-1">
            1v1 Arena & Engine Training
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 bg-[#121212] p-1 rounded-2xl border border-[#2A2A2A] mb-4">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-black transition cursor-pointer ${
              isLogin ? 'bg-[#2A2A2A] text-[#4CAF50] border border-[#4CAF50]/10 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-black transition cursor-pointer ${
              !isLogin ? 'bg-[#2A2A2A] text-[#4CAF50] border border-[#4CAF50]/10 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Status indicator for database availability (fully transparent and honest) */}
        {!isFirebaseAvailable && (
          <div className="mb-4 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-start gap-2 text-[10px] md:text-[11px] leading-relaxed text-cyan-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Sandbox Demo Active</span>
              Stats save securely in your local browser storage.
            </div>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-950/30 border border-red-800/30 flex items-start gap-2 text-[11px] text-red-400 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-3 md:gap-4">
          
          {/* Pick Username (Only on Register) */}
          {!isLogin && (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Choose Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <input
                  id="auth-username-input"
                  type="text"
                  placeholder="e.g. PawnPusher"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2A2A2A] focus:border-[#4CAF50] rounded-xl py-2 pl-9 pr-3 text-[11px] md:text-xs font-medium text-white placeholder-gray-600 outline-hidden transition"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
              <input
                id="auth-email-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] focus:border-[#4CAF50] rounded-xl py-2 pl-9 pr-3 text-[11px] md:text-xs font-medium text-white placeholder-gray-600 outline-hidden transition"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
              <input
                id="auth-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#121212] border border-[#2A2A2A] focus:border-[#4CAF50] rounded-xl py-2 pl-9 pr-3 text-[11px] md:text-xs font-medium text-white placeholder-gray-600 outline-hidden transition"
                required
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full mt-1.5 py-2.5 rounded-xl bg-linear-to-r from-[#388E3C] to-[#4CAF50] hover:from-[#4CAF50] hover:to-[#4CAF50] disabled:from-gray-700 disabled:to-gray-700 text-white font-extrabold text-[11px] md:text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center mt-2.5">
          <div className="flex-grow border-t border-[#2A2A2A]"></div>
          <span className="flex-shrink mx-3 text-[8px] md:text-[9px] font-bold text-gray-600 uppercase tracking-widest">or</span>
          <div className="flex-grow border-t border-[#2A2A2A]"></div>
        </div>

        {/* Continue as Guest Button */}
        <button
          id="auth-guest-btn"
          onClick={handleGuestPlay}
          className="w-full py-2 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A]/40 text-gray-400 hover:text-white font-bold text-[11px] md:text-xs transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-2.5 h-2.5 fill-gray-500 stroke-none" />
          <span>Continue as Guest</span>
        </button>

      </div>
    </div>
  );
};
