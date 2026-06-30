import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { getBotMove } from '../utils/chessAI';
import { chessAudio } from '../utils/audio';
import { UserStats, ChessMode, ChessColor, RatingTier, GameRecord } from '../types';
import { Play, Shield, Zap, Search, MessageSquare, Send, Award, Clock, ArrowLeft, RefreshCw, Trophy, Sparkles } from 'lucide-react';

interface MatchmakingTabProps {
  stats: UserStats;
  onUpdateStats: (updater: (prev: UserStats) => UserStats) => void;
  boardTheme: BoardTheme;
  onReviewGame?: (game: GameRecord) => void;
}

interface ChatMessage {
  sender: 'player' | 'opponent' | 'system';
  text: string;
  time: string;
}

const OPPONENT_NAMES = [
  { name: 'Garry_K', ratingOffset: 45, country: '🇺🇳' },
  { name: 'BethHarmon_99', ratingOffset: -20, country: '🇺🇸' },
  { name: 'Hikaru_Fan_1', ratingOffset: -50, country: '🇯🇵' },
  { name: 'MagnusDisciple', ratingOffset: 85, country: '🇳🇴' },
  { name: 'ChessMaster4000', ratingOffset: 120, country: '🇩🇪' },
  { name: 'CheckmatePls', ratingOffset: -80, country: '🇬🇧' },
  { name: 'PawnPusherX', ratingOffset: 10, country: '🇫🇷' },
  { name: 'Sicilian_Lover', ratingOffset: 30, country: '🇮🇹' },
  { name: 'Bobby_F_Legend', ratingOffset: 140, country: '🇺🇸' },
  { name: 'EnPassant_King', ratingOffset: -10, country: '🇨🇦' }
];

const OPPONENT_CHAT_TEMPLATES = {
  greetings: ["Hi, good luck!", "Hello! Let's have a great game", "gl hf!", "gl!", "Hi from across the globe!"],
  midgame_good: ["Wow, nice move", "Good defense there", "That's tricky...", "Ah, didn't see that coming!"],
  midgame_blunder: ["Oops...", "Wait, nooo!", "My mouse slipped! Just kidding", "Oh, I messed up"],
  endgame: ["Intense endgame!", "Good fight!", "GG", "Draw? No, let's fight to the end!"],
  gg: ["Good game! Well played", "gg wp!", "Wow, you are strong! Thanks for the game", "Thanks for the game! gg"]
};

export const MatchmakingTab: React.FC<MatchmakingTabProps> = ({ stats, onUpdateStats, boardTheme, onReviewGame }) => {
  const [mode, setMode] = useState<ChessMode>('blitz');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1482);
  const [matchedOpponent, setMatchedOpponent] = useState<any | null>(null);
  
  // Game state
  const [game, setGame] = useState<Chess | null>(null);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [playerColor, setPlayerColor] = useState<ChessColor>('w');
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState<string>('');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  
  // Clocks
  const [playerTime, setPlayerTime] = useState(180); // seconds
  const [opponentTime, setOpponentTime] = useState(180);
  const clockInterval = useRef<any>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fluctuating online counter
  useEffect(() => {
    const timer = setInterval(() => {
      setOnlineCount(prev => prev + Math.floor(Math.random() * 9) - 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Searching timer
  useEffect(() => {
    let timer: any;
    if (isSearching) {
      setSearchTime(0);
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);

        // Simulate match find at 4-9 seconds
        if (searchTime >= Math.floor(Math.random() * 4) + 5) {
          triggerMatchFound();
        }
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isSearching, searchTime]);

  // Clocks countdown
  useEffect(() => {
    if (game && !gameResult) {
      clockInterval.current = setInterval(() => {
        if (game.turn() === playerColor) {
          setPlayerTime(prev => {
            if (prev <= 1) {
              clearInterval(clockInterval.current);
              triggerGameOver('loss', 'Time out');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setOpponentTime(prev => {
            if (prev <= 1) {
              clearInterval(clockInterval.current);
              triggerGameOver('win', 'Time out');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(clockInterval.current);
  }, [game, gameResult, playerColor]);

  // Opponent AI Response trigger
  useEffect(() => {
    if (game && !gameResult && game.turn() !== playerColor) {
      // Add simulated thinking delay
      const thinkTime = Math.floor(Math.random() * 1500) + 1200; // 1.2 to 2.7s
      const timer = setTimeout(() => {
        makeOpponentMove();
      }, thinkTime);
      return () => clearTimeout(timer);
    }
  }, [game, fen, gameResult]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const triggerMatchFound = () => {
    setIsSearching(false);
    
    // Choose opponent with similar rating
    const pRating = stats.elo[mode];
    const opponentData = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
    const oppRating = Math.max(100, pRating + opponentData.ratingOffset + Math.floor(Math.random() * 21) - 10);
    
    const assignedColor: ChessColor = Math.random() > 0.5 ? 'w' : 'b';
    setPlayerColor(assignedColor);

    const matchObj = {
      name: opponentData.name,
      rating: oppRating,
      country: opponentData.country,
      color: assignedColor === 'w' ? 'b' : 'w',
      tier: getRatingTier(oppRating)
    };

    setMatchedOpponent(matchObj);
    
    // Initialize Chess Clock
    let totalSec = 180; // default 3 min (Blitz)
    if (mode === 'bullet') totalSec = 60;
    if (mode === 'rapid') totalSec = 600;

    setPlayerTime(totalSec);
    setOpponentTime(totalSec);

    // Create chess.js game
    const chessGame = new Chess();
    setGame(chessGame);
    setFen(chessGame.fen());
    setMoveHistory([]);
    setGameResult(null);

    // Initial system chats
    const welcomeMsgs: ChatMessage[] = [
      { sender: 'system', text: `Match found! You are playing ${assignedColor === 'w' ? 'White' : 'Black'}.`, time: formatTime() },
      { sender: 'system', text: `Time control: ${mode === 'bullet' ? '1m Bullet' : mode === 'blitz' ? '3m Blitz' : '10m Rapid'}.`, time: formatTime() }
    ];

    setChatMessages(welcomeMsgs);

    // Trigger greeting chat from opponent
    setTimeout(() => {
      const greeting = OPPONENT_CHAT_TEMPLATES.greetings[Math.floor(Math.random() * OPPONENT_CHAT_TEMPLATES.greetings.length)];
      sendChatMessage('opponent', greeting);
    }, 1500);
  };

  const makeOpponentMove = () => {
    if (!game || gameResult) return;

    try {
      // Find matching Bot properties to run the bot algorithm
      // Map opponent strength to bot levels based on their rating
      const oppRating = matchedOpponent.rating;
      let depth = 2;
      let blunderRate = 0.15;
      if (oppRating < 800) { depth = 1; blunderRate = 0.40; }
      else if (oppRating < 1300) { depth = 2; blunderRate = 0.18; }
      else if (oppRating < 1800) { depth = 3; blunderRate = 0.08; }
      else { depth = 4; blunderRate = 0.01; }

      const dummyBot = {
        id: 'online-opp',
        name: matchedOpponent.name,
        avatar: '👤',
        rating: oppRating,
        tier: matchedOpponent.tier,
        personality: 'Simulated online player',
        blunderRate,
        depth,
        greeting: '',
        winPhrase: '',
        lossPhrase: ''
      };

      const result = getBotMove(game.fen(), dummyBot);
      
      const moveResult = game.move({
        from: result.from,
        to: result.to,
        promotion: result.promotion || 'q'
      });

      if (moveResult) {
        setFen(game.fen());
        setMoveHistory(game.history());

        // Play move/capture audio
        if (moveResult.captured) {
          chessAudio.playCapture();
        } else {
          chessAudio.playMove();
        }

        // Apply clock increment if mode is Blitz (3+2)
        if (mode === 'blitz') {
          setOpponentTime(prev => prev + 2);
        }

        // If in check
        if (game.inCheck()) {
          chessAudio.playCheck();
        }

        // Random opponent commentary
        triggerOpponentCommentary(moveResult);

        // Check game over
        checkGameStatus();
      }
    } catch (e) {
      console.error("Opponent play error: ", e);
    }
  };

  const triggerOpponentCommentary = (moveResult: any) => {
    const r = Math.random();
    if (r < 0.18) {
      let phrase = '';
      if (moveResult.captured && getPieceValue(moveResult.captured) >= 3) {
        phrase = OPPONENT_CHAT_TEMPLATES.midgame_good[Math.floor(Math.random() * OPPONENT_CHAT_TEMPLATES.midgame_good.length)];
      } else if (game?.inCheck()) {
        phrase = "Check! Let's see how you defend this.";
      }
      if (phrase) {
        setTimeout(() => sendChatMessage('opponent', phrase), 800);
      }
    }
  };

  const getPieceValue = (p: string): number => {
    switch (p.toLowerCase()) {
      case 'p': return 1;
      case 'n': return 3;
      case 'b': return 3;
      case 'r': return 5;
      case 'q': return 9;
      default: return 0;
    }
  };

  const handlePlayerMove = (from: string, to: string, promotion?: string) => {
    if (!game || gameResult) return;

    try {
      const moveResult = game.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (moveResult) {
        setFen(game.fen());
        setMoveHistory(game.history());

        // Play audio
        if (moveResult.captured) {
          chessAudio.playCapture();
        } else {
          chessAudio.playMove();
        }

        // Increment clock if blitz (3+2)
        if (mode === 'blitz') {
          setPlayerTime(prev => prev + 2);
        }

        // Check check audio
        if (game.inCheck()) {
          chessAudio.playCheck();
        }

        // Check game status
        checkGameStatus();
      }
    } catch (e) {
      console.log("Invalid move played: ", from, to);
    }
  };

  const checkGameStatus = () => {
    if (!game) return;

    if (game.isCheckmate()) {
      const winner = game.turn() === playerColor ? 'loss' : 'win';
      triggerGameOver(winner, 'Checkmate');
    } else if (game.isDraw()) {
      let reason = 'Draw';
      if (game.isStalemate()) reason = 'Stalemate';
      else if (game.isThreefoldRepetition()) reason = 'Threefold Repetition';
      else if (game.isInsufficientMaterial()) reason = 'Insufficient Material';
      triggerGameOver('draw', reason);
    }
  };

  const triggerGameOver = (result: 'win' | 'loss' | 'draw', reason: string) => {
    clearInterval(clockInterval.current);
    setGameResult(result);
    setResultReason(reason);

    chessAudio.playGameOver(result === 'win');

    // Calculate Elo delta
    let eloDelta = 0;
    if (result === 'win') {
      eloDelta = Math.floor(Math.random() * 7) + 12; // +12 to +18
    } else if (result === 'loss') {
      eloDelta = -(Math.floor(Math.random() * 6) + 10); // -10 to -15
    }

    // Update global Stats!
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

    // Add final GG opponent text
    setTimeout(() => {
      if (result === 'win') {
        const text = OPPONENT_CHAT_TEMPLATES.gg[Math.floor(Math.random() * OPPONENT_CHAT_TEMPLATES.gg.length)];
        sendChatMessage('opponent', text);
      } else if (result === 'loss') {
        sendChatMessage('opponent', "Yes! Good fight. Thanks for the game!");
      } else {
        sendChatMessage('opponent', "Draw! GG, that was incredibly close.");
      }
    }, 1200);
  };

  const handleResign = () => {
    if (window.confirm("Are you sure you want to resign? You will lose ELO.")) {
      triggerGameOver('loss', 'Resigned');
    }
  };

  const handleOfferDraw = () => {
    // 50% chance opponent accepts draw if materials are balanced, otherwise refuses
    const isAccepted = Math.random() > 0.45;
    if (isAccepted) {
      alert(`${matchedOpponent.name} accepted your draw offer!`);
      triggerGameOver('draw', 'Draw agreed');
    } else {
      sendChatMessage('opponent', "No, let's keep playing!");
      alert(`${matchedOpponent.name} declined the draw offer.`);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    sendChatMessage('player', inputMessage.trim());
    setInputMessage('');

    // Simulate opponent replies 20% of the time to custom user messages
    setTimeout(() => {
      const oppResponses = ["Interesting plan", "Let's see!", "Nice", "Hmm...", "Focusing!", "Good game!"];
      const reply = oppResponses[Math.floor(Math.random() * oppResponses.length)];
      sendChatMessage('opponent', reply);
    }, 1500);
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
    if (elo < 800) return 'Beginner';
    if (elo < 1200) return 'Intermediate';
    if (elo < 1600) return 'Advanced';
    if (elo < 2000) return 'Expert';
    if (elo < 2400) return 'Master';
    return 'Grandmaster';
  };

  const getTierColor = (tier: RatingTier) => {
    switch (tier) {
      case 'Beginner': return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
      case 'Intermediate': return 'text-blue-400 bg-blue-950/20 border-blue-900/30';
      case 'Advanced': return 'text-purple-400 bg-purple-950/20 border-purple-900/30';
      case 'Expert': return 'text-pink-400 bg-pink-950/20 border-pink-900/30';
      case 'Master': return 'text-amber-400 bg-amber-950/20 border-amber-800/30';
      case 'Grandmaster': return 'text-[#4CAF50] bg-[#4CAF50]/10 border-[#388E3C]/30';
    }
  };

  const handleExitGame = () => {
    setGame(null);
    setMatchedOpponent(null);
    setGameResult(null);
  };

  return (
    <div className="w-full flex flex-col min-h-[500px]">
      
      {/* 1. LOBBY VIEW */}
      {!game && (
        <div className="flex-1 flex flex-col">
          {/* Header Hero */}
          <div className="relative text-center py-8 px-4 rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#E0E0E0] shadow-md overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#4CAF50]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#4CAF50]/5 rounded-full blur-2xl" />
            
            <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-500 animate-bounce" />
            <h2 className="font-sans font-bold text-3xl tracking-tight text-white">1v1 Arena</h2>
            <p className="text-[#888888] text-sm mt-1 max-w-sm mx-auto">
              Match with players around your rating tier, climb the global divisions, and claim the rank of Grandmaster.
            </p>

            {/* Quick stats row */}
            <div className="flex justify-center gap-6 mt-6 pt-5 border-t border-[#2A2A2A] text-xs">
              <div className="text-center">
                <span className="block text-[#888888] font-medium">Your Elo</span>
                <span className="block font-mono font-bold text-lg text-amber-500">{stats.elo[mode]}</span>
              </div>
              <div className="border-r border-[#2A2A2A]" />
              <div className="text-center">
                <span className="block text-[#888888] font-medium">Win/Loss</span>
                <span className="block font-mono font-bold text-lg text-[#4CAF50]">{stats.wins}W / {stats.losses}L</span>
              </div>
              <div className="border-r border-[#2A2A2A]" />
              <div className="text-center">
                <span className="block text-[#888888] font-medium text-center">Active Online</span>
                <span className="block font-mono font-bold text-lg text-[#4CAF50] flex items-center justify-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#4CAF50] animate-ping" />
                  {onlineCount}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#E0E0E0] mb-3 flex items-center gap-1.5 px-1">
              <Clock className="w-4 h-4 text-[#4CAF50]" />
              Select Time Control
            </h3>

            <div className="grid grid-cols-3 gap-3">
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
                    className={`relative p-4 rounded-2xl border text-left transition duration-200 overflow-hidden group ${isActive ? 'bg-[#2A2A2A] border-[#4CAF50]/40 text-white shadow-md' : 'bg-[#1A1A1A] hover:bg-[#2A2A2A]/40 border-[#2A2A2A] text-[#888888] hover:text-[#E0E0E0]'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <m.icon className={`w-5 h-5 ${isActive ? 'text-[#4CAF50]' : 'text-[#666666]'}`} />
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[#4CAF50]/20 text-[#4CAF50]' : 'bg-[#121212] text-[#888888] border border-[#2A2A2A]'}`}>
                        {m.time}
                      </span>
                    </div>
                    <span className="block font-bold text-sm tracking-tight">{m.label}</span>
                    <span className="block text-[10px] opacity-70 mt-0.5 font-mono">Elo: {stats.elo[m.id as ChessMode]}</span>
                    
                    {/* Hover Glow Accent */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-[#4CAF50] opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-1 flex flex-col justify-center items-center py-6">
            {!isSearching ? (
              <button
                id="search-match-btn"
                onClick={() => setIsSearching(true)}
                className="w-full max-w-xs flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#4CAF50] hover:bg-[#388E3C] text-white font-sans font-bold text-lg shadow-md cursor-pointer transition active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                Find 1v1 Match
              </button>
            ) : (
              <div className="w-full max-w-xs flex flex-col items-center">
                {/* Radar scanner */}
                <div className="relative w-28 h-28 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 rounded-full border border-[#4CAF50]/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border border-[#4CAF50]/40 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-[#4CAF50] border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
                  <Search className="w-10 h-10 text-[#4CAF50] animate-bounce" />
                </div>
                
                <h4 className="font-bold text-white mb-1">Searching for Opponent...</h4>
                <p className="text-xs text-[#888888] font-mono">Elapsed time: {searchTime}s</p>
                <p className="text-xs text-[#4CAF50] font-semibold mt-2 animate-pulse">Matching within ±100 Elo...</p>

                <button
                  id="cancel-search-btn"
                  onClick={() => setIsSearching(false)}
                  className="mt-6 px-4 py-2 rounded-xl bg-[#2A2A2A] border border-[#2A2A2A] text-[#888888] hover:text-white font-bold text-xs hover:bg-[#333] transition"
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
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Board & Clock */}
          <div className="flex-1 flex flex-col items-center">
            
            {/* Top Player (Opponent) Info */}
            <div className="w-full max-w-md flex justify-between items-center bg-[#1A1A1A] border border-[#2A2A2A] p-3 rounded-xl shadow-md mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-xl shadow-xs">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white leading-none">{matchedOpponent.name}</span>
                    <span className="text-xs" title="Country">{matchedOpponent.country}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-mono bg-[#121212] border border-[#2A2A2A] text-[#888888] px-1.5 py-0.5 rounded-sm font-semibold">
                      {matchedOpponent.rating}
                    </span>
                    <span className={`text-[9px] font-bold px-1 rounded-sm border ${getTierColor(matchedOpponent.tier)}`}>
                      {matchedOpponent.tier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opponent Clock */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-lg ${game.turn() !== playerColor && !gameResult ? 'bg-red-950/20 text-red-400 border-red-900/30 animate-pulse' : 'bg-[#121212] text-[#888888] border-[#2A2A2A]'}`}>
                <Clock className="w-4 h-4 text-[#666666]" />
                {formatClock(opponentTime)}
              </div>
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={fen}
              onMove={handlePlayerMove}
              playerColor={playerColor}
              isInteractive={!gameResult && game.turn() === playerColor}
              theme={boardTheme}
            />

            {/* Bottom Player (Self) Info */}
            <div className="w-full max-w-md flex justify-between items-center bg-[#1A1A1A] border border-[#2A2A2A] p-3 rounded-xl shadow-md mt-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-xl shadow-xs">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white leading-none">You</span>
                    <span className="text-xs">👋</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-mono bg-[#121212] border border-[#2A2A2A] text-[#4CAF50] px-1.5 py-0.5 rounded-sm font-semibold">
                      {stats.elo[mode]}
                    </span>
                    <span className={`text-[9px] font-bold px-1 rounded-sm border ${getTierColor(getRatingTier(stats.elo[mode]))}`}>
                      {getRatingTier(stats.elo[mode])}
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Clock */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-lg ${game.turn() === playerColor && !gameResult ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#388E3C]/30' : 'bg-[#121212] text-[#888888] border-[#2A2A2A]'}`}>
                <Clock className="w-4 h-4 text-[#666666]" />
                {formatClock(playerTime)}
              </div>
            </div>

            {/* Live Buttons */}
            {!gameResult && (
              <div className="w-full max-w-md grid grid-cols-2 gap-3 mt-4">
                <button
                  id="offer-draw-btn"
                  onClick={handleOfferDraw}
                  className="py-2.5 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  Offer Draw
                </button>
                <button
                  id="resign-btn"
                  onClick={handleResign}
                  className="py-2.5 rounded-xl border border-red-900/30 hover:bg-red-950/20 text-xs font-bold text-red-400 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  Resign
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Chat & Moves Log */}
          <div className="w-full lg:w-80 flex flex-col h-[460px] lg:h-auto bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-md">
            
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

            {/* Game Result Screen (Overlays active tab if game finished) */}
            {gameResult && (
              <div className="bg-[#4CAF50]/5 p-4 border-b border-[#2A2A2A] text-center animate-fade-in space-y-2.5">
                <Award className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                <h4 className="font-sans font-extrabold text-base text-white">
                  {gameResult === 'win' ? 'You Won!' : gameResult === 'loss' ? 'Opponent Won' : "It's a Draw"}
                </h4>
                <p className="text-xs text-[#888888] mt-0.5">By {resultReason}</p>
                <div className="text-xs font-mono font-bold text-[#4CAF50]">
                  {gameResult === 'win' ? 'Rating: +15 Elo' : gameResult === 'loss' ? 'Rating: -12 Elo' : 'Rating: Unchanged'}
                </div>
                {onReviewGame && (
                  <button
                    id="post-match-review-btn"
                    onClick={() => onReviewGame({
                      id: Math.random().toString(36).substr(2, 9),
                      opponentName: matchedOpponent ? matchedOpponent.name : "Opponent",
                      opponentRating: matchedOpponent ? matchedOpponent.rating : 1200,
                      mode,
                      playerColor,
                      result: gameResult,
                      date: new Date().toLocaleDateString(),
                      movesCount: Math.ceil(moveHistory.length / 2),
                      moves: moveHistory
                    })}
                    className="w-full py-2 rounded-lg bg-[#4CAF50]/15 hover:bg-[#4CAF50]/35 border border-[#388E3C]/30 text-[#4CAF50] font-bold text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> AI Move Review
                  </button>
                )}
              </div>
            )}

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

        </div>
      )}

    </div>
  );
};
