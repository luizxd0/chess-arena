import React, { useState, useEffect } from 'react';
import { UserStats, ChessMode, RatingTier, GameRecord } from './types';
import { MatchmakingTab } from './components/MatchmakingTab';
import { OpeningsTab } from './components/OpeningsTab';
import { BotsTab } from './components/BotsTab';
import { StatsTab } from './components/StatsTab';
import { GameReview } from './components/GameReview';
import { BoardTheme } from './components/ChessBoard';
import { AuthPage } from './components/AuthPage';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { isFirebaseAvailable, auth, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Trophy, Cpu, BookOpen, User, Flame, Palette, Zap, LogOut, Sparkles, Settings as SettingsIcon } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'chess_applet_user_stats_v1';
const LOCAL_STORAGE_USERNAME_KEY = 'chess_applet_username_v1';

const INITIAL_STATS: UserStats = {
  elo: {
    bullet: 500,
    blitz: 500,
    rapid: 500
  },
  botRating: 500,
  wins: 0,
  losses: 0,
  draws: 0,
  completedOpenings: [],
  unlockedBots: ['martin', 'elspeth'],
  gameHistory: []
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'matchmaking' | 'openings' | 'bots' | 'stats' | 'review'>('matchmaking');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('elegant');
  const [username, setUsername] = useState('NewPlayer');
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isGameplayActive, setIsGameplayActive] = useState(false);
  const [reviewGameRecord, setReviewGameRecord] = useState<GameRecord | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isMenuHidden = isGameplayActive || (activeTab === 'review' && reviewGameRecord !== null);

  // Check active session on mount
  useEffect(() => {
    let unsubscribe: any = null;

    if (isFirebaseAvailable && auth) {
      // Listen for Firebase Auth state changes
      unsubscribe = auth.onAuthStateChanged(async (user: any) => {
        if (user) {
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUsername(data.username || 'PawnPusher');
              setStats(data.stats || INITIAL_STATS);
              setIsGuest(!!data.isGuest);
            } else {
              const fallbackUsername = user.email ? user.email.split('@')[0] : 'Player';
              setUsername(fallbackUsername);
              setStats(INITIAL_STATS);
              setIsGuest(user.isAnonymous);
            }
            setIsAuthenticated(true);
          } catch (err) {
            console.warn("Could not retrieve Firestore user stats:", err);
          }
        } else {
          // Firebase not authenticated; check local session keys
          const storedAuth = localStorage.getItem('chess_arena_is_authenticated');
          if (storedAuth === 'true') {
            const storedIsGuest = localStorage.getItem('chess_arena_is_guest') === 'true';
            setIsGuest(storedIsGuest);
            
            const storedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
            if (storedUsername) setUsername(storedUsername);
            
            const storedStats = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedStats) setStats(JSON.parse(storedStats));

            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setIsGuest(false);
          }
        }
        setIsAuthChecking(false);
      });
    } else {
      // Local mock auth mode
      try {
        const storedAuth = localStorage.getItem('chess_arena_is_authenticated');
        if (storedAuth === 'true') {
          const storedIsGuest = localStorage.getItem('chess_arena_is_guest') === 'true';
          setIsGuest(storedIsGuest);
          
          const storedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
          if (storedUsername) setUsername(storedUsername);
          
          const storedStats = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (storedStats) setStats(JSON.parse(storedStats));

          setIsAuthenticated(true);
        }
      } catch (e) {
        console.warn("Could not read local authentication state:", e);
      }
      setIsAuthChecking(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (name: string, userStats: UserStats, guestStatus: boolean) => {
    setUsername(name);
    setStats(userStats);
    setIsGuest(guestStatus);
    setIsAuthenticated(true);
    
    // Save state to localStorage to persist session
    localStorage.setItem('chess_arena_is_authenticated', 'true');
    localStorage.setItem('chess_arena_is_guest', guestStatus ? 'true' : 'false');
    localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, name);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userStats));
  };

  const handleSignOut = async () => {
    try {
      if (isFirebaseAvailable && auth) {
        await auth.signOut();
      }
    } catch (e) {
      console.warn("Firebase sign out failed:", e);
    }
    setIsAuthenticated(false);
    setIsGuest(false);
    setUsername('NewPlayer');
    setStats(INITIAL_STATS);
    localStorage.removeItem('chess_arena_is_authenticated');
    localStorage.removeItem('chess_arena_is_guest');
    localStorage.removeItem('chess_arena_logged_in_email');
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  // Update stats wrapper that also writes to localStorage & Firestore
  const handleUpdateStats = (updater: (prev: UserStats) => UserStats) => {
    setStats(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
        
        // Sync to firestore if authenticated
        if (isFirebaseAvailable && auth && auth.currentUser) {
          const uid = auth.currentUser.uid;
          setDoc(doc(db, 'users', uid), { stats: next }, { merge: true })
            .catch(e => console.warn("Firestore stats sync failed:", e));
        } else if (!isGuest) {
          // Update in local mock db
          const email = localStorage.getItem('chess_arena_logged_in_email');
          if (email) {
            const users = localStorage.getItem('chess_arena_mock_users');
            if (users) {
              const usersObj = JSON.parse(users);
              if (usersObj[email]) {
                usersObj[email].stats = next;
                localStorage.setItem('chess_arena_mock_users', JSON.stringify(usersObj));
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not write to local storage: ", e);
      }
      return next;
    });
  };

  const handleUpdateUsername = (newName: string) => {
    setUsername(newName);
    try {
      localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, newName);

      // Sync to firestore if authenticated
      if (isFirebaseAvailable && auth && auth.currentUser) {
        const uid = auth.currentUser.uid;
        setDoc(doc(db, 'users', uid), { username: newName }, { merge: true })
          .catch(e => console.warn("Firestore username sync failed:", e));
      } else if (!isGuest) {
        // Update in local mock db
        const email = localStorage.getItem('chess_arena_logged_in_email');
        if (email) {
          const users = localStorage.getItem('chess_arena_mock_users');
          if (users) {
            const usersObj = JSON.parse(users);
            if (usersObj[email]) {
              usersObj[email].username = newName;
              localStorage.setItem('chess_arena_mock_users', JSON.stringify(usersObj));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not write username to local storage: ", e);
    }
  };

  const getRatingTier = (elo: number): RatingTier => {
    if (elo < 250) return 'Novice';
    if (elo < 800) return 'Beginner';
    if (elo < 1200) return 'Intermediate';
    if (elo < 1800) return 'Advanced';
    if (elo < 2200) return 'Master';
    return 'Grandmaster';
  };

  const getTierColor = (tier: RatingTier) => {
    switch (tier) {
      case 'Novice': return 'text-gray-400 bg-gray-950/30 border-gray-800/40';
      case 'Beginner': return 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40';
      case 'Intermediate': return 'text-blue-400 bg-blue-950/30 border-blue-800/40';
      case 'Advanced': return 'text-purple-400 bg-purple-950/30 border-purple-800/40';
      case 'Expert': return 'text-pink-400 bg-pink-950/30 border-pink-800/40';
      case 'Master': return 'text-amber-400 bg-amber-950/30 border-amber-800/40';
      case 'Grandmaster': return 'text-[#4CAF50] bg-[#4CAF50]/10 border-[#388E3C]/40';
    }
  };

  const activeElo = stats.elo.blitz; // default show blitz ELO in header
  const activeTier = getRatingTier(activeElo);

  const maxElo = Math.max(stats.elo.bullet, stats.elo.blitz, stats.elo.rapid, stats.botRating);
  const playerTitle = maxElo >= 2200 ? ' GM' : (maxElo >= 1800 ? ' M' : '');
  const displayUsername = username + playerTitle;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-tr from-[#388E3C] via-[#4CAF50] to-[#81C784] flex items-center justify-center text-2xl shadow-lg rotate-3 animate-bounce">
            👑
          </div>
          <span className="text-xs text-[#888888] font-mono tracking-widest uppercase animate-pulse">Analyzing Board State...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} initialStats={INITIAL_STATS} />;
  }

  const navItems = [
    { id: 'matchmaking', label: '1v1 Arena', short: 'Play', icon: Trophy },
    { id: 'openings', label: 'Openings', short: 'Learn', icon: BookOpen },
    { id: 'bots', label: 'Play vs Bots', short: 'Bots', icon: Cpu },
    { id: 'stats', label: 'Stats & Rank', short: 'Stats', icon: User },
    { id: 'review', label: 'AI Review', short: 'Review', icon: Sparkles }
  ];

  return (
    <div className="h-[100dvh] w-full fixed inset-0 overflow-hidden bg-[#121212] text-[#E0E0E0] flex flex-col md:flex-row font-sans antialiased selection:bg-[#4CAF50]/30">
      
      {/* Top Mobile Navbar */}
      <header className={`md:hidden shrink-0 border-b border-[#2A2A2A] bg-[#1A1A1A] sticky top-0 z-40 px-4 py-3 shadow-md ${isMenuHidden ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-[#388E3C] via-[#4CAF50] to-[#81C784] flex items-center justify-center text-lg shadow-md shrink-0">👑</div>
            <div className="min-w-0">
              <h1 className="font-sans font-black text-sm tracking-tight leading-none bg-linear-to-r from-white via-slate-100 to-[#81C784] bg-clip-text text-transparent truncate">{displayUsername}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg border border-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg border border-[#2A2A2A] hover:bg-red-950/20 text-gray-500 hover:text-red-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-[#2A2A2A] bg-[#1A1A1A] shadow-xl z-40 ${isMenuHidden ? 'hidden' : ''}`}>
        {/* Brand */}
        <div className="p-5 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-[#388E3C] via-[#4CAF50] to-[#81C784] flex items-center justify-center text-2xl shadow-md rotate-3 shrink-0">👑</div>
            <div className="min-w-0">
              <h1 className="font-sans font-black text-base lg:text-lg tracking-tight leading-none bg-linear-to-r from-white via-slate-100 to-[#81C784] bg-clip-text text-transparent truncate">{displayUsername}</h1>
              <span className="text-[10px] text-[#888] font-mono tracking-widest uppercase mt-1 block truncate">{activeTier} • {stats.elo.blitz} Elo</span>
            </div>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'review' && !reviewGameRecord && stats.gameHistory.length > 0) {
                    setReviewGameRecord(stats.gameHistory[0]);
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-sans font-bold text-sm transition cursor-pointer ${isActive ? 'bg-[#2A2A2A] text-[#4CAF50] border border-[#4CAF50]/20 shadow-md' : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#2A2A2A]/40 border border-transparent'}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#4CAF50]' : 'text-[#888]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop Footer Actions */}
        <div className="p-4 border-t border-[#2A2A2A] flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-400 hover:text-white text-xs font-bold transition"
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </button>
          <button
            onClick={handleSignOut}
            className="p-2.5 rounded-xl border border-[#2A2A2A] hover:bg-red-950/20 text-gray-500 hover:text-red-400 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-h-0 w-full bg-[#121212] overflow-hidden relative">
        <div className={`flex-1 flex flex-col min-h-0 ${isMenuHidden ? 'p-1' : 'p-2 md:p-6'} mx-auto w-full max-w-6xl`}>
          
          {/* Tab Panel View */}
          <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isMenuHidden ? 'p-0 bg-transparent border-none shadow-none' : 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl md:rounded-3xl p-2 md:p-6 shadow-md'}`}>
            {activeTab === 'matchmaking' && (
              <MatchmakingTab 
                stats={stats} 
                onUpdateStats={handleUpdateStats} 
                boardTheme={boardTheme} 
                onReviewGame={(game) => {
                  setReviewGameRecord(game);
                  setActiveTab('review');
                }}
                onGameActiveChange={setIsGameplayActive}
                username={displayUsername}
              />
            )}
            {activeTab === 'openings' && (
              <OpeningsTab 
                stats={stats} 
                onUpdateStats={handleUpdateStats} 
                boardTheme={boardTheme} 
                onGameActiveChange={setIsGameplayActive}
              />
            )}
            {activeTab === 'bots' && (
              <BotsTab 
                stats={stats} 
                onUpdateStats={handleUpdateStats} 
                boardTheme={boardTheme} 
                onReviewGame={(game) => {
                  setReviewGameRecord(game);
                  setActiveTab('review');
                }}
                onGameActiveChange={setIsGameplayActive}
                username={displayUsername}
              />
            )}
            {activeTab === 'stats' && (
              <StatsTab
                stats={stats}
                onUpdateStats={handleUpdateStats}
                username={username}
                onUpdateUsername={handleUpdateUsername}
                onSelectGameToReview={(game) => {
                  setReviewGameRecord(game);
                  setActiveTab('review');
                }}
              />
            )}
            {activeTab === 'review' && (
              <GameReview
                stats={stats}
                selectedGame={reviewGameRecord}
                boardTheme={boardTheme}
                onBackToLobby={() => {
                  setReviewGameRecord(null);
                  setActiveTab('stats');
                }}
                onSelectGameToReview={(game) => {
                  setReviewGameRecord(game);
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className={`md:hidden shrink-0 border-t border-[#2A2A2A] bg-[#1A1A1A] shadow-[0_-4px_10px_rgba(0,0,0,0.5)] z-40 pb-[env(safe-area-inset-bottom)] ${isMenuHidden ? 'hidden' : ''}`}>
        <div className="flex items-center justify-around p-1.5">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'review' && !reviewGameRecord && stats.gameHistory.length > 0) {
                    setReviewGameRecord(stats.gameHistory[0]);
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${isActive ? 'text-[#4CAF50]' : 'text-[#888888] hover:text-[#E0E0E0]'}`}
              >
                <div className={`p-1 rounded-full mb-0.5 ${isActive ? 'bg-[#4CAF50]/10' : 'bg-transparent'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-bold tracking-tight">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {isSettingsOpen && (
        <ProfileSettingsModal
          onClose={() => setIsSettingsOpen(false)}
          boardTheme={boardTheme}
          onUpdateBoardTheme={setBoardTheme}
          onSignOut={() => {
            setIsSettingsOpen(false);
            handleSignOut();
          }}
        />
      )}

    </div>
  );
}
