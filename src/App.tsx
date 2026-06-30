import React, { useState, useEffect } from 'react';
import { UserStats, ChessMode, RatingTier, GameRecord } from './types';
import { MatchmakingTab } from './components/MatchmakingTab';
import { OpeningsTab } from './components/OpeningsTab';
import { BotsTab } from './components/BotsTab';
import { StatsTab } from './components/StatsTab';
import { GameReview } from './components/GameReview';
import { BoardTheme } from './components/ChessBoard';
import { AuthPage } from './components/AuthPage';
import { isFirebaseAvailable, auth, db } from './lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Trophy, Cpu, BookOpen, User, Flame, Palette, Zap, LogOut, Sparkles } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'chess_applet_user_stats_v1';
const LOCAL_STORAGE_USERNAME_KEY = 'chess_applet_username_v1';

const INITIAL_STATS: UserStats = {
  elo: {
    bullet: 800,
    blitz: 800,
    rapid: 800
  },
  botRating: 400,
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
            } else {
              const fallbackUsername = user.email ? user.email.split('@')[0] : 'Player';
              setUsername(fallbackUsername);
              setStats(INITIAL_STATS);
            }
            setIsAuthenticated(true);
            setIsGuest(false);
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
    if (elo < 800) return 'Beginner';
    if (elo < 1200) return 'Intermediate';
    if (elo < 1600) return 'Advanced';
    if (elo < 2000) return 'Expert';
    if (elo < 2400) return 'Master';
    return 'Grandmaster';
  };

  const getTierColor = (tier: RatingTier) => {
    switch (tier) {
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

  return (
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0] flex flex-col font-sans antialiased selection:bg-[#4CAF50]/30">
      
      {/* Top Premium Navbar */}
      <header className={`border-b border-[#2A2A2A] bg-[#1A1A1A] sticky top-0 z-40 px-4 py-3 shadow-md ${isMenuHidden ? 'hidden' : ''}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-[#388E3C] via-[#4CAF50] to-[#81C784] flex items-center justify-center text-2xl shadow-md rotate-3 hover:rotate-0 transition-transform">
              👑
            </div>
            <div>
              <h1 className="font-sans font-black text-lg tracking-tight leading-none bg-linear-to-r from-white via-slate-100 to-[#81C784] bg-clip-text text-transparent">
                GrandMaster Arena
              </h1>
              <span className="text-[10px] text-[#888888] font-mono tracking-widest uppercase mt-0.5 block">Chess Hub</span>
            </div>
          </div>

          {/* User ratings preview bar */}
          <div className="flex items-center gap-3 md:gap-5 bg-[#121212] border border-[#2A2A2A] py-1.5 px-3 md:px-4 rounded-2xl text-xs font-medium">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[#E0E0E0] font-semibold truncate max-w-[80px] md:max-w-none">{username}</span>
              <span className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${getTierColor(activeTier)}`}>
                {activeTier}
              </span>
              {isGuest && (
                <span className="hidden sm:inline text-[9px] font-black text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/10 uppercase tracking-wider">Guest</span>
              )}
            </div>
            <div className="h-4 w-[1px] bg-[#2A2A2A]" />
            <div className="flex items-center gap-2 md:gap-4 font-mono text-[10px] md:text-[11px]">
              <span className="text-[#888888]"><Zap className="inline-block w-3 h-3 text-[#4CAF50] mr-0.5 md:mr-1 align-middle" /><span className="hidden sm:inline">Blitz: </span><strong className="text-white">{stats.elo.blitz}</strong></span>
              <span className="text-[#888888]"><Trophy className="inline-block w-3.5 h-3.5 text-amber-500 mr-0.5 md:mr-1 align-middle" /><span className="hidden sm:inline">Bot: </span><strong className="text-white">{stats.botRating}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme custom picker */}
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#888888] shrink-0" />
              <select
                id="global-board-theme-select"
                value={boardTheme}
                onChange={(e) => setBoardTheme(e.target.value as BoardTheme)}
                className="bg-[#121212] border border-[#2A2A2A] rounded-xl px-2.5 py-1.5 text-xs text-[#E0E0E0] font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="elegant">Elegant Dark</option>
                <option value="emerald">Emerald Wood</option>
                <option value="wood">Lichess Maple</option>
                <option value="cyber">Cyber Midnight</option>
                <option value="royal">Royal Gold</option>
              </select>
            </div>

            {/* Logout Button */}
            <button
              id="global-signout-btn"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 rounded-xl border border-[#2A2A2A] hover:border-red-500/30 hover:bg-red-950/15 hover:text-red-400 text-gray-500 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className={`flex-1 w-full mx-auto flex flex-col ${isMenuHidden ? 'p-1 md:p-3 max-w-5xl' : 'p-4 md:p-6 max-w-6xl gap-6'}`}>
        
        {/* Navigation Selector Tabs */}
        <div className={`bg-[#1A1A1A] border border-[#2A2A2A] p-2 rounded-2xl flex flex-wrap gap-1.5 shadow-md ${isMenuHidden ? 'hidden' : ''}`}>
          {[
            { id: 'matchmaking', label: '1v1 Arena', icon: Trophy, desc: 'Play online' },
            { id: 'openings', label: 'Learn Openings', icon: BookOpen, desc: 'Opening theory' },
            { id: 'bots', label: 'Play vs Bots', icon: Cpu, desc: 'Challenge computer' },
            { id: 'stats', label: 'Stats & Rank', icon: User, desc: 'Climb ladder' },
            { id: 'review', label: 'AI Review', icon: Sparkles, desc: 'Analyze moves' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => {
                  if (tab.id === 'review' && !reviewGameRecord && stats.gameHistory.length > 0) {
                    // Pre-select most recent game if none selected
                    setReviewGameRecord(stats.gameHistory[0]);
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`flex-1 min-w-[110px] py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2.5 font-sans font-extrabold text-sm transition cursor-pointer ${isActive ? 'bg-[#2A2A2A] text-[#4CAF50] border border-[#4CAF50]/20 shadow-md' : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#2A2A2A]/40'}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#4CAF50]' : 'text-[#888]'}`} />
                <div className="text-left">
                  <span className="block leading-none">{tab.label}</span>
                  <span className={`block text-[9px] font-medium leading-none mt-1 opacity-75 ${isActive ? 'text-[#4CAF50]/80' : 'text-[#666]'}`}>{tab.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Panel View */}
        <div className={`flex-1 flex flex-col ${isMenuHidden ? 'p-0 md:p-4 bg-transparent border-none shadow-none' : 'bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-4 md:p-6 shadow-md'}`}>
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
              username={username}
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
              username={username}
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

      </main>

      {/* Global aesthetic footer info lines */}
      <footer className={`border-t border-[#2A2A2A] py-5 px-4 bg-[#121212] text-center text-xs text-[#888888] ${isMenuHidden ? 'hidden' : ''}`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 font-medium">
          <span>♟ "Chess is a struggle against your own errors." — Johannes Zukertort</span>
          <span className="text-[10px] font-mono text-[#666666]">GrandMaster Arena • v1.0.2 Stable</span>
        </div>
      </footer>

    </div>
  );
}
