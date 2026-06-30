import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { getBotMove } from '../utils/chessAI';
import { chessAudio } from '../utils/audio';
import { UserStats, ChessMode, ChessColor, RatingTier, GameRecord } from '../types';
import { Play, Shield, Zap, Search, MessageSquare, Send, Award, Clock, ArrowLeft, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, getCountFromServer, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';

interface MatchmakingTabProps {
  stats: UserStats;
  onUpdateStats: (updater: (prev: UserStats) => UserStats) => void;
  boardTheme: BoardTheme;
  onReviewGame?: (game: GameRecord) => void;
  onGameActiveChange?: (active: boolean) => void;
  username: string;
  isGuest: boolean;
}

interface ChatMessage {
  sender: 'player' | 'opponent' | 'system';
  text: string;
  time: string;
}

export const MatchmakingTab: React.FC<MatchmakingTabProps> = ({ stats, onUpdateStats, boardTheme, onReviewGame, onGameActiveChange, username, isGuest }) => {
  const [mode, setMode] = useState<ChessMode>('blitz');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const [matchedOpponent, setMatchedOpponent] = useState<any | null>(null);
  
  // Game state
  const [game, setGame] = useState<Chess | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    onGameActiveChange?.(game !== null);
  }, [game, onGameActiveChange]);
  
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [playerColor, setPlayerColor] = useState<ChessColor>('w');
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState<string>('');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{from: string, to: string} | null>(null);
  const [preMove, setPreMove] = useState<{from: string, to: string} | null>(null);
  const preMoveRef = useRef<{from: string, to: string} | null>(null);

  useEffect(() => {
    preMoveRef.current = preMove;
  }, [preMove]);
  
  // Clocks
  const [playerTime, setPlayerTime] = useState(180); // seconds
  const [opponentTime, setOpponentTime] = useState(180);
  const clockInterval = useRef<any>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const getUserId = () => {
    if (auth?.currentUser) return auth.currentUser.uid;
    if (isGuest) return localStorage.getItem('chess_arena_guest_uid');
    return null;
  };

  // Fetch real user count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        if (db) {
          const twoMinsAgo = Date.now() - 120000;
          const q = query(collection(db, 'onlineUsers'), where('lastPing', '>=', twoMinsAgo));
          const snapshot = await getCountFromServer(q);
          const count = snapshot.data().count;
          // Set to real count, fallback to 1 so it doesn't show 0
          setOnlineCount(Math.max(1, count));
        }
      } catch (e) {
        console.log("Could not fetch user count", e);
      }
    };
    fetchCount();
    const timer = setInterval(fetchCount, 30000);
    return () => clearInterval(timer);
  }, []);

  // Reconnect logic
  useEffect(() => {
    const checkReconnect = async () => {
      const uid = getUserId();
      if (!uid || matchId || !db) return;
      const savedMatchId = localStorage.getItem('chess_arena_active_match');
      const savedColor = localStorage.getItem('chess_arena_match_color') as ChessColor;
      if (savedMatchId && savedColor) {
        try {
          const docRef = doc(db, 'matches', savedMatchId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.status === 'playing' || data.status === 'waiting') {
              setPlayerColor(savedColor);
              setMatchId(savedMatchId);
            } else {
              localStorage.removeItem('chess_arena_active_match');
              localStorage.removeItem('chess_arena_match_color');
            }
          }
        } catch (e) {
          console.error('Reconnect failed', e);
        }
      }
    };
    checkReconnect();
  }, [auth.currentUser, matchId]);

  // Searching timer
  useEffect(() => {
    let timer: any;
    if (isSearching && !matchId) {
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearching, matchId]);

  // Online Multiplayer Matchmaking Logic
  useEffect(() => {
    const uid = getUserId();
    if (isSearching && !matchId && uid) {
      const findMatch = async () => {
        try {
          const q = query(
            collection(db, 'matches'), 
            where('status', '==', 'waiting'), 
            where('mode', '==', mode),
            where('isGuestMatch', '==', isGuest)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Join first available match
            const matchDoc = querySnapshot.docs[0];
            const data = matchDoc.data();
            
            if (data.player1.uid !== uid) {
              await updateDoc(doc(db, 'matches', matchDoc.id), {
                status: 'playing',
                player2: {
                  uid: uid,
                  name: username,
                  rating: stats.elo[mode]
                }
              });
              localStorage.setItem('chess_arena_active_match', matchDoc.id);
              localStorage.setItem('chess_arena_match_color', 'b');
              setPlayerColor('b');
              setMatchId(matchDoc.id);
              setupMatch(matchDoc.id, 'b', data.player1);
              return;
            }
          }
          
          // No match found, create one
          const newMatch = await addDoc(collection(db, 'matches'), {
            status: 'waiting',
            mode,
            isGuestMatch: isGuest,
            createdAt: serverTimestamp(),
            player1: {
              uid: uid,
              name: username,
              rating: stats.elo[mode]
            },
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            history: [],
            lastMoveTime: Date.now()
          });
          localStorage.setItem('chess_arena_active_match', newMatch.id);
          localStorage.setItem('chess_arena_match_color', 'w');
          setPlayerColor('w');
          setMatchId(newMatch.id);
          // Wait for opponent in onSnapshot
        } catch (e) {
          console.error("Matchmaking error:", e);
          setIsSearching(false);
          alert("Matchmaking is currently unavailable (Sandbox mode).");
        }
      };
      
      findMatch();
    }
  }, [isSearching, matchId, mode, stats.elo, username, isGuest]);

  const oppPingRef = useRef<number>(Date.now());

  // Listen to match document
  useEffect(() => {
    if (!matchId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Opponent joined!
        if (data.status === 'playing' && !game) {
          const oppData = playerColor === 'w' ? data.player2 : data.player1;
          if (oppData) {
            setupMatch(matchId, playerColor, oppData, data.fen, data.history);
          }
        }

        // Track opponent ping
        if (data.status === 'playing') {
          const oppPingField = playerColor === 'w' ? data.p2Ping : data.p1Ping;
          if (oppPingField) {
            oppPingRef.current = oppPingField;
          }
        }
        
        // Sync moves from opponent
        if (data.status === 'playing' && game && data.fen !== game.fen()) {
          // If the FEN in DB changed and it's our turn now (meaning opponent just moved)
          game.load(data.fen);
          setFen(data.fen);
          setMoveHistory(data.history || []);
          if (data.lastMoveData) {
            setLastMove(data.lastMoveData);
          }
          
          // Play audio
          chessAudio.playMove();
          if (game.inCheck()) {
            chessAudio.playCheck();
          }
          
          checkGameStatus();
        }
        
        // Handle opponent leaving or game over synced from DB
        if (data.status === 'finished' && !gameResult) {
          const uid = getUserId();
          if (data.winner === uid) {
            triggerGameOver('win', data.reason || 'Opponent resigned');
          } else if (data.winner === 'draw') {
            triggerGameOver('draw', data.reason || 'Draw agreed');
          } else {
            triggerGameOver('loss', data.reason || 'Checkmate');
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [matchId, game, playerColor, gameResult]);

  const setupMatch = (mId: string, color: ChessColor, oppData: any, existingFen?: string, existingHistory?: any[]) => {
    setIsSearching(false);
    setShowMobileChat(false);
    
    const matchObj = {
      name: oppData.name,
      rating: oppData.rating,
      country: '🌐',
      color: color === 'w' ? 'b' : 'w',
      tier: getRatingTier(oppData.rating)
    };
    setMatchedOpponent(matchObj);
    oppPingRef.current = Date.now();
    
    // Initialize Chess Clock
    let totalSec = 180;
    if (mode === 'bullet') totalSec = 60;
    if (mode === 'rapid') totalSec = 600;

    setPlayerTime(totalSec);
    setOpponentTime(totalSec);

    const chessGame = new Chess();
    if (existingFen) {
      chessGame.load(existingFen);
    }
    setGame(chessGame);
    setFen(chessGame.fen());
    setMoveHistory(existingHistory || []);
    if (existingData?.lastMoveData) {
      setLastMove(existingData.lastMoveData);
    }
    setGameResult(null);

    const welcomeMsgs: ChatMessage[] = [
      { sender: 'system', text: `Match found! You are playing ${color === 'w' ? 'White' : 'Black'}.`, time: formatTime() },
      { sender: 'system', text: `Time control: ${mode === 'bullet' ? '1m Bullet' : mode === 'blitz' ? '3m Blitz' : '10m Rapid'}.`, time: formatTime() }
    ];
    if (existingFen) {
      welcomeMsgs.push({ sender: 'system', text: 'Reconnected to match in progress.', time: formatTime() });
    }
    setChatMessages(welcomeMsgs);
  };

  // Clocks countdown
  useEffect(() => {
    if (game && !gameResult) {
      clockInterval.current = setInterval(() => {
        if (game.turn() === playerColor) {
          setPlayerTime(prev => {
            if (prev <= 1) {
              clearInterval(clockInterval.current);
              triggerGameOver('loss', 'Time out', true);
              return 0;
            }
            return prev - 1;
          });
        } else {
          setOpponentTime(prev => {
            if (prev <= 1) {
              clearInterval(clockInterval.current);
              triggerGameOver('win', 'Time out', true);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(clockInterval.current);
  }, [game, gameResult, playerColor]);

  // Ping mechanism to detect abandonment
  useEffect(() => {
    if (!game || gameResult || !matchId) return;
    
    // Ping every 30 seconds
    const pingInterval = setInterval(() => {
      const pingField = playerColor === 'w' ? 'p1Ping' : 'p2Ping';
      updateDoc(doc(db, 'matches', matchId), { [pingField]: Date.now() }).catch(e=>e);
    }, 30000);
    
    // Initial ping
    const pingField = playerColor === 'w' ? 'p1Ping' : 'p2Ping';
    updateDoc(doc(db, 'matches', matchId), { [pingField]: Date.now() }).catch(e=>e);

    return () => clearInterval(pingInterval);
  }, [game, gameResult, matchId, playerColor]);

  // Abandonment checker
  useEffect(() => {
    if (!game || gameResult || !matchId) return;
    
    const checkInterval = setInterval(() => {
      const now = Date.now();
      // If opponent hasn't pinged in 2 minutes (120000ms), they abandoned the match
      if (now - oppPingRef.current > 120000) {
        clearInterval(checkInterval);
        triggerGameOver('win', 'Opponent abandoned', true);
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [game, gameResult, matchId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handlePlayerMove = async (from: string, to: string, promotion?: string) => {
    if (!game || gameResult || game.turn() !== playerColor) return;

    try {
      const moveResult = game.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (moveResult) {
        const newFen = game.fen();
        const newHistory = game.history();
        
        setFen(newFen);
        setMoveHistory(newHistory);
        setLastMove({ from, to });

        // Sync to Firestore
        if (matchId) {
          updateDoc(doc(db, 'matches', matchId), {
            fen: newFen,
            history: newHistory,
            lastMoveData: { from, to },
            lastMoveTime: Date.now()
          }).catch(e => console.error("Failed to sync move", e));
        }

        if (moveResult.captured) {
          chessAudio.playCapture();
        } else {
          chessAudio.playMove();
        }

        if (mode === 'blitz') {
          setPlayerTime(prev => prev + 2);
        }

        if (game.inCheck()) {
          chessAudio.playCheck();
        }

        checkGameStatus(true);
      }
    } catch (e) {
      console.log("Invalid move played: ", from, to);
    }
  };

  // Execute preMove automatically if it's our turn
  useEffect(() => {
    if (game && !gameResult && game.turn() === playerColor && preMove) {
      const pm = preMove;
      setPreMove(null); // Clear it before executing to avoid loops
      // Try to execute
      try {
        const tempChess = new Chess(game.fen());
        const res = tempChess.move({ from: pm.from, to: pm.to, promotion: 'q' });
        if (res) {
          handlePlayerMove(pm.from, pm.to, 'q');
        }
      } catch (e) {
        // Premove was invalid
        console.log("Premove was invalid", pm);
      }
    }
  }, [fen, game, gameResult, playerColor, preMove]);

  const checkGameStatus = (isLocalInitiator = false) => {
    if (!game) return;

    if (game.isCheckmate()) {
      const winner = game.turn() === playerColor ? 'loss' : 'win';
      triggerGameOver(winner, 'Checkmate', isLocalInitiator);
    } else if (game.isDraw()) {
      let reason = 'Draw';
      if (game.isStalemate()) reason = 'Stalemate';
      else if (game.isThreefoldRepetition()) reason = 'Threefold Repetition';
      else if (game.isInsufficientMaterial()) reason = 'Insufficient Material';
      triggerGameOver('draw', reason, isLocalInitiator);
    }
  };

  const triggerGameOver = async (result: 'win' | 'loss' | 'draw', reason: string, syncToDb = false) => {
    clearInterval(clockInterval.current);

    const finalizeGameOver = () => {
      setGameResult(result);
      setResultReason(reason);

      localStorage.removeItem('chess_arena_active_match');
      localStorage.removeItem('chess_arena_match_color');

      chessAudio.playGameOver(result === 'win');
      
      const uid = getUserId();
      if (syncToDb && matchId && uid) {
        let winnerUid = result === 'draw' ? 'draw' : (result === 'win' ? uid : 'opponent');
        updateDoc(doc(db, 'matches', matchId), {
          status: 'finished',
          winner: winnerUid,
          reason: reason
        }).catch(e => console.error(e));
      }

      let eloDelta = 0;
      if (result === 'win') {
        eloDelta = Math.floor(Math.random() * 7) + 12;
      } else if (result === 'loss') {
        eloDelta = -(Math.floor(Math.random() * 6) + 10);
      }

      onUpdateStats(prev => {
        const currentElo = prev.elo[mode];
        const nextElo = Math.max(100, currentElo + eloDelta);
        
        const newHistoryRecord = {
          id: Math.random().toString(36).substr(2, 9),
          opponentName: matchedOpponent.name,
          opponentRating: matchedOpponent.rating,
          mode,
          playerColor,
          result,
          date: new Date().toLocaleDateString(),
          movesCount: Math.ceil(moveHistory.length / 2),
          moves: moveHistory
        };

        return {
          ...prev,
          elo: {
            ...prev.elo,
            [mode]: nextElo
          },
          wins: prev.wins + (result === 'win' ? 1 : 0),
          losses: prev.losses + (result === 'loss' ? 1 : 0),
          draws: prev.draws + (result === 'draw' ? 1 : 0),
          gameHistory: [newHistoryRecord, ...prev.gameHistory]
        };
      });
    };

    if (reason === 'Checkmate') {
      setTimeout(finalizeGameOver, 2000);
    } else {
      finalizeGameOver();
    }
  };

  const handleResign = () => {
    if (window.confirm("Are you sure you want to resign? You will lose ELO.")) {
      triggerGameOver('loss', 'Resigned', true);
    }
  };

  const handleOfferDraw = () => {
    sendChatMessage('system', `${username} offered a draw.`);
    // Simplified for now: just trigger draw locally if clicked (in a full app, opponent would need to accept)
    if (window.confirm("Offer draw to opponent? For this prototype, they will automatically accept.")) {
      triggerGameOver('draw', 'Draw agreed', true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    sendChatMessage('player', inputMessage.trim());
    setInputMessage('');
  };

  const sendChatMessage = (sender: 'player' | 'opponent' | 'system', text: string) => {
    setChatMessages(prev => [...prev, { sender, text, time: formatTime() }]);
  };

  const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
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
      case 'Novice': return 'text-gray-400 bg-gray-950/20 border-gray-900/30';
      case 'Beginner': return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
      case 'Intermediate': return 'text-blue-400 bg-blue-950/20 border-blue-900/30';
      case 'Advanced': return 'text-purple-400 bg-purple-950/20 border-purple-900/30';
      case 'Expert': return 'text-pink-400 bg-pink-950/20 border-pink-900/30';
      case 'Master': return 'text-amber-400 bg-amber-950/20 border-amber-800/30';
      case 'Grandmaster': return 'text-[#4CAF50] bg-[#4CAF50]/10 border-[#388E3C]/30';
    }
  };

  const handleExitGame = () => {
    if (matchId && !gameResult) {
      updateDoc(doc(db, 'matches', matchId), { status: 'finished', winner: 'opponent', reason: 'Opponent left' }).catch(e=>e);
    }
    localStorage.removeItem('chess_arena_active_match');
    localStorage.removeItem('chess_arena_match_color');
    setGame(null);
    setMatchedOpponent(null);
    setGameResult(null);
    setMatchId(null);
    setLastMove(null);
    setShowMobileChat(false);
  };


  return (
    <div className="w-full h-full flex flex-col min-h-0">
      
      {/* 1. LOBBY VIEW */}
      {!game && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 mb-2 shrink">
            {/* Header Hero */}
            <div className="relative text-center py-2 px-3 lg:py-4 lg:px-4 rounded-2xl lg:rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#E0E0E0] shadow-md overflow-hidden flex-1">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#4CAF50]/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#4CAF50]/5 rounded-full blur-2xl" />
              
              <div className="flex items-center justify-center gap-2 lg:gap-4">
                <Trophy className="w-5 h-5 lg:w-8 lg:h-8 text-amber-500 animate-bounce" />
                <div className="text-left">
                  <h2 className="font-sans font-bold text-lg lg:text-2xl tracking-tight text-white leading-none">1v1 Arena</h2>
                  <p className="text-[#888888] text-[9px] lg:text-xs mt-0.5 lg:mt-1">
                    Match with players around your rating tier, climb the global divisions.
                  </p>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="flex justify-center gap-4 lg:gap-6 mt-2 pt-2 border-t border-[#2A2A2A] text-xs">
                {!isGuest && (
                  <>
                    <div className="text-center">
                      <span className="block text-[#888888] font-medium text-[9px] lg:text-[10px]">Your Elo</span>
                      <span className="block font-mono font-bold text-sm lg:text-base text-amber-500">{stats.elo[mode]}</span>
                    </div>
                    <div className="border-r border-[#2A2A2A]" />
                    <div className="text-center">
                      <span className="block text-[#888888] font-medium text-[9px] lg:text-[10px]">Win/Loss</span>
                      <span className="block font-mono font-bold text-sm lg:text-base text-[#4CAF50]">{stats.wins}W / {stats.losses}L</span>
                    </div>
                    <div className="border-r border-[#2A2A2A]" />
                  </>
                )}
                <div className="text-center">
                  <span className="block text-[#888888] font-medium text-[9px] lg:text-[10px]">Active Online</span>
                  <span className="block font-mono font-bold text-sm lg:text-base text-[#4CAF50] flex items-center justify-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-ping" />
                    {onlineCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl lg:rounded-3xl p-2 lg:p-4 shadow-md">
              <h3 className="text-[10px] lg:text-xs font-bold text-[#E0E0E0] mb-1.5 lg:mb-2 flex items-center gap-1.5 px-1">
                <Clock className="w-3.5 h-3.5 text-[#4CAF50]" />
                Select Time Control
              </h3>

              <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                {[
                  { id: 'bullet', label: 'Bullet', time: '1 + 0', icon: Zap, bg: 'from-amber-500 to-yellow-500' },
                  { id: 'blitz', label: 'Blitz', time: '3 + 2', icon: Zap, bg: 'from-red-500 to-pink-500' },
                  { id: 'rapid', label: 'Rapid', time: '10 + 0', icon: Clock, bg: 'from-green-500 to-emerald-500' }
                ].map((m) => {
                  const isActive = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      id={`mode-${m.id}`}
                      onClick={() => setMode(m.id as ChessMode)}
                      className={`relative p-1.5 lg:p-3 rounded-xl lg:rounded-2xl border text-left transition duration-200 overflow-hidden group ${isActive ? 'bg-[#2A2A2A] border-[#4CAF50]/40 text-white shadow-md' : 'bg-[#121212] hover:bg-[#2A2A2A]/40 border-[#2A2A2A] text-[#888888] hover:text-[#E0E0E0]'}`}
                    >
                      <div className="flex justify-between items-start mb-0.5 lg:mb-1">
                        <m.icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${isActive ? 'text-[#4CAF50]' : 'text-[#666666]'}`} />
                        <span className={`text-[8px] lg:text-[9px] font-bold px-1 lg:px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[#4CAF50]/20 text-[#4CAF50]' : 'bg-[#1A1A1A] text-[#888888] border border-[#2A2A2A]'}`}>
                          {m.time}
                        </span>
                      </div>
                      <span className="block font-bold text-[10px] lg:text-xs tracking-tight">{m.label}</span>
                      {!isGuest && (
                        <span className="block text-[8px] lg:text-[9px] opacity-70 lg:mt-0.5 font-mono">Elo: {stats.elo[m.id as ChessMode]}</span>
                      )}
                      
                      {/* Hover Glow Accent */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-[#4CAF50] opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-1 flex flex-col justify-center items-center py-2 min-h-0 shrink">
            {!isSearching ? (
              <button
                id="search-match-btn"
                onClick={() => setIsSearching(true)}
                className="w-full max-w-xs flex items-center justify-center gap-2 lg:gap-3 py-3 lg:py-4 rounded-xl lg:rounded-2xl bg-[#4CAF50] hover:bg-[#388E3C] text-white font-sans font-bold text-base lg:text-lg shadow-md cursor-pointer transition active:scale-95"
              >
                <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-white" />
                Find 1v1 Match
              </button>
            ) : (
              <div className="w-full max-w-xs flex flex-col items-center">
                {/* Radar scanner */}
                <div className="relative w-20 h-20 lg:w-28 lg:h-28 flex items-center justify-center mb-2 lg:mb-4">
                  <div className="absolute inset-0 rounded-full border border-[#4CAF50]/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-[#4CAF50]/40 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-[#4CAF50] border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
                  <Search className="w-8 h-8 lg:w-10 lg:h-10 text-[#4CAF50] animate-bounce" />
                </div>
                
                <h4 className="font-bold text-white text-sm lg:text-base mb-1">Searching for Opponent...</h4>
                <p className="text-[10px] lg:text-xs text-[#888888] font-mono">Elapsed time: {searchTime}s</p>
                <p className="text-[10px] lg:text-xs text-[#4CAF50] font-semibold mt-1 lg:mt-2 animate-pulse">Matching within ±100 Elo...</p>

                <button
                  id="cancel-search-btn"
                  onClick={() => setIsSearching(false)}
                  className="mt-4 lg:mt-6 px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl bg-[#2A2A2A] border border-[#2A2A2A] text-[#888888] hover:text-white font-bold text-[10px] lg:text-xs hover:bg-[#333] transition"
                >
                  Cancel Search
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. LIVE GAME VIEW */}
      {game && matchedOpponent && (
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch flex-1 min-h-0 overflow-x-hidden overflow-y-auto pb-1 md:pb-2">
          
          {/* Left Column: Board & Clock */}
          <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-0 shrink-0">
            
            {/* Top Player (Opponent) Info */}
            <div className="w-full max-w-md flex justify-between items-center bg-[#1A1A1A] max-md:bg-transparent max-md:border-none max-md:shadow-none max-md:p-1.5 p-3 rounded-xl shadow-md mb-1 md:mb-3 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-base md:text-xl shadow-xs">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs md:text-sm text-white leading-none">{matchedOpponent.name}</span>
                    <span className="text-xs" title="Country">{matchedOpponent.country}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                    <span className="text-[9px] md:text-[10px] font-mono bg-[#121212] border border-[#2A2A2A] text-[#888888] px-1.5 py-0.5 rounded-sm font-semibold">
                      {matchedOpponent.rating}
                    </span>
                    <span className={`text-[8px] md:text-[9px] font-bold px-1 rounded-sm border ${getTierColor(matchedOpponent.tier)}`}>
                      {matchedOpponent.tier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opponent Clock */}
              <div className={`flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border font-mono font-bold text-sm md:text-lg ${game.turn() !== playerColor && !gameResult ? 'bg-red-950/20 text-red-400 border-red-900/30 animate-pulse' : 'bg-[#121212] text-[#888888] border-[#2A2A2A]'}`}>
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#666666]" />
                {formatClock(opponentTime)}
              </div>
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={fen}
              lastMove={lastMove}
              onMove={handlePlayerMove}
              playerColor={playerColor}
              isInteractive={!gameResult}
              theme={boardTheme}
              preMove={preMove}
              onPremove={(from, to) => setPreMove({from, to})}
              onClearPremove={() => setPreMove(null)}
              gameResult={gameResult}
              resultReason={resultReason}
            />

            {/* Bottom Player (Self) Info */}
            <div className="w-full max-w-md flex justify-between items-center bg-[#1A1A1A] max-md:bg-transparent max-md:border-none max-md:shadow-none max-md:p-1.5 p-3 rounded-xl shadow-md mt-1 md:mt-3 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-base md:text-xl shadow-xs">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs md:text-sm text-white leading-none">{username}</span>
                    <span className="text-xs">👋</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                    <span className="text-[9px] md:text-[10px] font-mono bg-[#121212] border border-[#2A2A2A] text-[#4CAF50] px-1.5 py-0.5 rounded-sm font-semibold">
                      {stats.elo[mode]}
                    </span>
                    <span className={`text-[8px] md:text-[9px] font-bold px-1 rounded-sm border ${getTierColor(getRatingTier(stats.elo[mode]))}`}>
                      {getRatingTier(stats.elo[mode])}
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Clock */}
              <div className={`flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border font-mono font-bold text-sm md:text-lg ${game.turn() === playerColor && !gameResult ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#388E3C]/30' : 'bg-[#121212] text-[#888888] border-[#2A2A2A]'}`}>
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#666666]" />
                {formatClock(playerTime)}
              </div>
            </div>

            {/* Live Buttons - Desktop & Mobile version */}
            {!gameResult && (
              <div className="w-full max-w-md grid grid-cols-3 gap-2 mt-1 md:mt-3">
                <button
                  id="offer-draw-btn"
                  onClick={handleOfferDraw}
                  className="py-1.5 md:py-2 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[10px] md:text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Offer Draw
                </button>
                <button
                  id="resign-btn"
                  onClick={handleResign}
                  className="py-1.5 md:py-2 rounded-xl border border-red-900/30 hover:bg-red-950/20 text-[10px] md:text-xs font-bold text-red-400 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Resign
                </button>
                <button
                  onClick={() => setShowMobileChat(true)}
                  className="py-1.5 md:py-2 lg:hidden rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 text-[10px] md:text-xs font-bold text-[#4CAF50] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat / Moves
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Chat & Moves Log (Desktop Only) */}
          <div className="hidden md:flex w-full md:w-80 flex-col h-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-md min-h-0">
            
            {/* Top Tabs: Chats / Moves */}
            <div className="bg-[#121212] border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
              <span className="font-sans font-bold text-sm text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#4CAF50]" />
                Live Match Feed
              </span>
              
              {gameResult && (
                <button
                  id="exit-game-btn"
                  onClick={handleExitGame}
                  className="text-xs font-bold bg-[#2A2A2A] text-[#E0E0E0] border border-[#2A2A2A] px-3 py-1 rounded-md hover:bg-[#333333] flex items-center gap-1 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Lobby
                </button>
              )}
            </div>

            {/* Chats Feed Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-end">
              <div className="space-y-3">
                {chatMessages.map((msg, idx) => {
                  if (msg.sender === 'system') {
                     return (
                      <div key={idx} className="text-center">
                        <span className="inline-block text-[10px] font-medium text-[#888888] bg-[#121212] px-2.5 py-0.5 rounded-full border border-[#2A2A2A]">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isPlayer = msg.sender === 'player';
                  return (
                    <div key={idx} className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'} max-w-[85%] ${isPlayer ? 'ml-auto' : 'mr-auto'}`}>
                      <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${isPlayer ? 'bg-[#4CAF50] text-white rounded-br-none shadow-sm' : 'bg-[#121212] text-[#E0E0E0] border border-[#2A2A2A] rounded-bl-none'}`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-[#666666] mt-1 px-1">{isPlayer ? 'You' : matchedOpponent.name} • {msg.time}</span>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Chat Input form */}
            {!gameResult && (
              <form onSubmit={handleSendMessage} className="border-t border-[#2A2A2A] p-3 flex gap-2 bg-[#121212]">
                <input
                  type="text"
                  id="chat-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type a message to opponent..."
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-[#1A1A1A] border border-[#2A2A2A] focus:outline-hidden focus:ring-1 focus:ring-[#4CAF50] text-white"
                />
                <button
                  type="submit"
                  id="chat-send-btn"
                  className="p-2 rounded-xl bg-[#4CAF50] hover:bg-[#388E3C] text-white transition flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Bottom panel: Moves List */}
            <div className="bg-[#121212] border-t border-[#2A2A2A] p-3 h-28 overflow-y-auto">
              <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1">PGN Move Logs</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-[#888888]">
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-[#666666] w-5">{idx + 1}.</span>
                    <span className="font-semibold text-[#E0E0E0]">{moveHistory[idx * 2]}</span>
                    {moveHistory[idx * 2 + 1] && (
                      <span className="text-[#666666]">{moveHistory[idx * 2 + 1]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Overlay for Chat & PGN */}
          {showMobileChat && (
            <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col p-4 animate-fade-in lg:hidden">
              <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3 mb-4">
                <span className="font-sans font-bold text-sm text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#4CAF50]" />
                  Live Match Feed & Moves
                </span>
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="px-3 py-1 text-xs font-bold bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition"
                >
                  Back to Board
                </button>
              </div>

              {/* Chat Log Inside Overlay */}
              <div className="flex-1 overflow-y-auto p-2 mb-3 space-y-3 flex flex-col justify-end bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
                <div className="space-y-3">
                  {chatMessages.map((msg, idx) => {
                    if (msg.sender === 'system') {
                      return (
                        <div key={idx} className="text-center">
                          <span className="inline-block text-[10px] font-medium text-[#888888] bg-[#121212] px-2.5 py-0.5 rounded-full border border-[#2A2A2A]">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    const isPlayer = msg.sender === 'player';
                    return (
                      <div key={idx} className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'} max-w-[85%] ${isPlayer ? 'ml-auto' : 'mr-auto'}`}>
                        <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${isPlayer ? 'bg-[#4CAF50] text-white rounded-br-none shadow-sm' : 'bg-[#121212] text-[#E0E0E0] border border-[#2A2A2A] rounded-bl-none'}`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-[#666666] mt-1 px-1">{isPlayer ? 'You' : matchedOpponent.name} • {msg.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat Input form Inside Overlay */}
              {!gameResult && (
                <form onSubmit={handleSendMessage} className="flex gap-2 mb-3 bg-[#121212]">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message to opponent..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-[#1A1A1A] border border-[#2A2A2A] focus:outline-hidden focus:ring-1 focus:ring-[#4CAF50] text-white"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#4CAF50] hover:bg-[#388E3C] text-white transition flex items-center justify-center cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* PGN Moves inside Overlay */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 h-32 overflow-y-auto">
                <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1">PGN Move Logs</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-[#888888]">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-[#666666] w-5">{idx + 1}.</span>
                      <span className="font-semibold text-[#E0E0E0]">{moveHistory[idx * 2]}</span>
                      {moveHistory[idx * 2 + 1] && (
                        <span className="text-[#666666]">{moveHistory[idx * 2 + 1]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Game Over Popup Modal */}
      {gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-6 shadow-2xl w-full max-w-sm relative animate-scale-up">
            
            <button 
              onClick={handleExitGame}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <div className="text-xl leading-none">×</div>
            </button>

            <div className="text-center space-y-4">
              <Award className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="font-sans font-black text-2xl text-white">
                  {gameResult === 'win' ? 'You Won!' : gameResult === 'loss' ? 'Opponent Won' : "It's a Draw"}
                </h3>
                <p className="text-sm text-[#888888] mt-1">By {resultReason}</p>
                <div className="text-sm font-mono font-bold text-[#4CAF50] mt-2">
                  {gameResult === 'win' ? 'Rating: +15 Elo' : gameResult === 'loss' ? 'Rating: -12 Elo' : 'Rating: Unchanged'}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => {
                    handleExitGame();
                    setTimeout(() => setIsSearching(true), 300); // quick rematch logic
                  }}
                  className="w-full py-3 rounded-xl bg-[#4CAF50] hover:bg-[#388E3C] text-white font-bold tracking-wider transition cursor-pointer"
                >
                  Rematch / Find New
                </button>
                {onReviewGame && (
                  <button
                    onClick={() => {
                      onReviewGame({
                        id: Math.random().toString(36).substr(2, 9),
                        opponentName: matchedOpponent ? matchedOpponent.name : "Opponent",
                        opponentRating: matchedOpponent ? matchedOpponent.rating : 1200,
                        mode,
                        playerColor,
                        result: gameResult,
                        date: new Date().toLocaleDateString(),
                        movesCount: Math.ceil(moveHistory.length / 2),
                        moves: moveHistory
                      });
                      handleExitGame();
                    }}
                    className="w-full py-3 rounded-xl bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/50 text-cyan-400 font-bold tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Game Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
