import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { Bot, UserStats, GameRecord } from '../types';
import { botsList, getBotMove, getStockfishMove } from '../utils/chessAI';
import { openingsList } from '../utils/openingsData';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { chessAudio } from '../utils/audio';
import { Lock, Unlock, Play, ArrowLeft, RefreshCw, Award, Cpu, MessageCircle, Sparkles, Clock } from 'lucide-react';

interface BotsTabProps {
  stats: UserStats;
  onUpdateStats: (updater: (prev: UserStats) => UserStats) => void;
  boardTheme: BoardTheme;
  onReviewGame?: (game: GameRecord) => void;
  onGameActiveChange?: (active: boolean) => void;
  username: string;
}

export const BotsTab: React.FC<BotsTabProps> = ({ stats, onUpdateStats, boardTheme, onReviewGame, onGameActiveChange, username }) => {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [game, setGame] = useState<Chess | null>(null);
  const [showMobileMoves, setShowMobileMoves] = useState(false);
  const [activeTier, setActiveTier] = useState<string>('Beginner');

  useEffect(() => {
    onGameActiveChange?.(game !== null);
  }, [game, onGameActiveChange]);
  
  const [fen, setFen] = useState('');
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [startingPositionType, setStartingPositionType] = useState<'standard' | 'opening'>('standard');
  const [startingOpeningId, setStartingOpeningId] = useState('');
  const [startingVariationIdx, setStartingVariationIdx] = useState(0);
  const [practiceOpeningMoves, setPracticeOpeningMoves] = useState<string[]>([]);
  const [isOpeningPracticeActive, setIsOpeningPracticeActive] = useState<boolean>(false);

  // Live in-game bots variables
  const [botPhrase, setBotPhrase] = useState('');
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [resultReason, setResultReason] = useState('');

  // Real-time chess clocks & ratings
  const [playerTime, setPlayerTime] = useState(600); // 10 minutes in seconds
  const [opponentTime, setOpponentTime] = useState(600);
  const [whiteAutoStartSeconds, setWhiteAutoStartSeconds] = useState(30);
  const [eloDelta, setEloDelta] = useState<number | null>(null);
  const clockInterval = React.useRef<any>(null);

  const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{from: string, to: string} | null>(null);
  const [preMove, setPreMove] = useState<{from: string, to: string} | null>(null);

  // Check if a bot is locked based on player's Bot Elo
  const isBotLocked = (bot: Bot): boolean => {
    return false;
  };

  const getUnlockRequirement = (tier: string): string => {
    if (tier === 'Intermediate') return '1000 Elo';
    if (tier === 'Advanced') return '1600 Elo';
    if (tier === 'Master') return '2200 Elo';
    return '';
  };

  // Setup standard or opening game
  const handleStartGame = (bot: Bot) => {
    const chess = new Chess();
    setShowMobileMoves(false);
    
    let openingMoves: string[] = [];
    let isOpPractice = false;
    if (startingPositionType === 'opening' && startingOpeningId) {
      const selectedOp = openingsList.find(o => o.id === startingOpeningId);
      if (selectedOp) {
        const selectedVar = selectedOp.variations[startingVariationIdx];
        if (selectedVar) {
          openingMoves = [...selectedVar.moves];
          isOpPractice = true;
        }
      }
    }

    setPracticeOpeningMoves(openingMoves);
    setIsOpeningPracticeActive(isOpPractice);

    setGame(chess);
    setFen(chess.fen());
    setSelectedBot(bot);
    setGameResult(null);
    setMoveHistory(chess.history());
    setLastMove(null);
    setBotPhrase(isOpPractice ? `Let's practice the opening!` : bot.greeting);

    // Initialize/Reset chess clocks
    setPlayerTime(600);
    setOpponentTime(600);
    setWhiteAutoStartSeconds(30);
    setEloDelta(null);

    // If bot plays White, they make the move immediately
    if (playerColor === 'b' && chess.turn() === 'w') {
      triggerBotPlay(chess, bot, openingMoves, isOpPractice);
    }
  };

  // Bot play logic
  const triggerBotPlay = (currentChess: Chess, bot: Bot, openingMovesStack?: string[], isPracticeActiveOverride?: boolean) => {
    if (gameResult) return;

    const isPracticeActive = isPracticeActiveOverride !== undefined ? isPracticeActiveOverride : isOpeningPracticeActive;
    if (!isPracticeActive) {
      const thinkingPhrases = [
        "Hmm, let me think...",
        "Interesting position here...",
        "Analyzing the board...",
        "Let's see what is the best move...",
        "Checking my options..."
      ];
      setBotPhrase(thinkingPhrases[Math.floor(Math.random() * thinkingPhrases.length)]);
    }

    const startTime = Date.now();
    
    // Define the move handling logic as an async flow
    const executeBotTurn = async () => {
      try {
        let nextMoveObj;
        
        // If in opening practice, look up the next expected book move for the bot
        const currentHistoryLength = currentChess.history().length;
        if (isPracticeActive && practiceOpeningMoves.length > currentHistoryLength) {
          const nextSan = practiceOpeningMoves[currentHistoryLength];
          const dryChess = new Chess(currentChess.fen());
          try {
            const played = dryChess.move(nextSan);
            nextMoveObj = {
              from: played.from,
              to: played.to,
              promotion: played.promotion || 'q'
            };
            setBotPhrase(`Book move: ${nextSan}. Following theory!`);
          } catch (e) {
            console.warn("Dry run failed for bot opening move:", e);
          }
        }

        if (!nextMoveObj) {
          // Roll blunder rate BEFORE calling Stockfish to simulate human mistakes at lower tiers
          const isBlunder = Math.random() < bot.blunderRate && currentChess.moves().length > 1;
          
          if (isBlunder) {
            // Pick a randomized/suboptimal move locally and instantly
            nextMoveObj = getBotMove(currentChess.fen(), { ...bot, blunderRate: 1.0 }, openingMovesStack);
          } else {
            try {
              // Query Stockfish Online with the specific bot's search depth
              nextMoveObj = await getStockfishMove(currentChess.fen(), bot.depth);
            } catch (err) {
              console.warn(`Stockfish Online API failed for ${bot.name}, falling back to local minimax:`, err);
              nextMoveObj = getBotMove(currentChess.fen(), bot, openingMovesStack);
            }
          }
        }

        // Simulate human-like thinking delay of 1.5 to 3.5 seconds so bot clock actually goes down
        const thinkingTime = 1500 + Math.random() * 2000;
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(50, thinkingTime - elapsed);

        setTimeout(() => {
          try {
            const playedMove = currentChess.move({
              from: nextMoveObj.from,
              to: nextMoveObj.to,
              promotion: nextMoveObj.promotion || 'q'
            });

            if (playedMove) {
              setFen(currentChess.fen());
              setMoveHistory(currentChess.history());
              setLastMove({ from: nextMoveObj.from, to: nextMoveObj.to });

              // Play Sound
              if (playedMove.captured) {
                chessAudio.playCapture();
                if (!isPracticeActive) {
                  if (playedMove.captured === 'q') setBotPhrase("Yes! Queen captured! Fear my tactics.");
                  else if (Math.random() < 0.25) setBotPhrase("Piece captured! Keep going.");
                }
              } else {
                chessAudio.playMove();
              }

              if (currentChess.inCheck()) {
                chessAudio.playCheck();
                if (!isPracticeActive && Math.random() < 0.40) setBotPhrase("Check! Watch your King safety.");
              }

              checkGameStatus(currentChess, bot);
            }
          } catch (err) {
            console.error("AI turn execution error inside timeout:", err);
          }
        }, remainingDelay);
      } catch (err) {
        console.error("Failed to compute bot move:", err);
      }
    };

    executeBotTurn();
  };

  // Clocks countdown
  useEffect(() => {
    if (game && !gameResult && selectedBot) {
      clockInterval.current = setInterval(() => {
        const firstMoveDone = moveHistory.length > 0;
        
        if (!firstMoveDone) {
          setWhiteAutoStartSeconds(prev => {
            if (prev <= 1) {
              // Auto-start clock for White
              if (playerColor === 'w') {
                setPlayerTime(p => {
                  if (p <= 1) {
                    clearInterval(clockInterval.current);
                    triggerGameOver('loss', 'Time out', selectedBot);
                    return 0;
                  }
                  return p - 1;
                });
              } else {
                setOpponentTime(o => {
                  if (o <= 1) {
                    clearInterval(clockInterval.current);
                    triggerGameOver('win', 'Time out', selectedBot);
                    return 0;
                  }
                  return o - 1;
                });
              }
              return 0;
            }
            return prev - 1;
          });
        } else {
          // Normal clock countdown
          if (game.turn() === playerColor) {
            setPlayerTime(prev => {
              if (prev <= 1) {
                clearInterval(clockInterval.current);
                triggerGameOver('loss', 'Time out', selectedBot);
                return 0;
              }
              return prev - 1;
            });
          } else {
            setOpponentTime(prev => {
              if (prev <= 1) {
                clearInterval(clockInterval.current);
                triggerGameOver('win', 'Time out', selectedBot);
                return 0;
              }
              return prev - 1;
            });
          }
        }
      }, 1000);
    }
    return () => clearInterval(clockInterval.current);
  }, [game, gameResult, playerColor, moveHistory.length, selectedBot]);

  // Execute preMove automatically if it's our turn
  useEffect(() => {
    if (game && !gameResult && game.turn() === playerColor && preMove) {
      const pm = preMove;
      setPreMove(null); // Clear it before executing to avoid loops
      try {
        const tempChess = new Chess(game.fen());
        const res = tempChess.move({ from: pm.from, to: pm.to, promotion: 'q' });
        if (res) {
          handlePlayerMove(pm.from, pm.to, 'q');
        }
      } catch (e) {
        // Invalid premove
      }
    }
  }, [fen, game, gameResult, playerColor, preMove]);

  const handlePlayerMove = (from: string, to: string, promotion?: string) => {
    if (!game || !selectedBot || gameResult) return;

    try {
      const fenBefore = game.fen();
      const playedMove = game.move({ from, to, promotion: promotion || 'q' });

      if (playedMove) {
        setFen(game.fen());
        setMoveHistory(game.history());
        setLastMove({ from, to });

        if (playedMove.captured) {
          chessAudio.playCapture();
        } else {
          chessAudio.playMove();
        }

        if (game.inCheck()) {
          chessAudio.playCheck();
        }

        // Handle book opening practice verification
        let nextOpeningActive = isOpeningPracticeActive;
        if (isOpeningPracticeActive) {
          const histLength = game.history().length;
          let isCorrectMove = false;
          const expectedSan = practiceOpeningMoves[histLength - 1];

          if (expectedSan) {
            const tempChess = new Chess(fenBefore);
            try {
              const expectedMoveObj = tempChess.move(expectedSan);
              if (expectedMoveObj.from === from && expectedMoveObj.to === to) {
                isCorrectMove = true;
              }
            } catch (e) {
              console.warn("Dry run check of expected player opening move failed:", e);
            }
          }

          if (isCorrectMove) {
            if (histLength >= practiceOpeningMoves.length) {
              setBotPhrase("Incredible! You completed the book opening line perfectly! Now the game continues...");
              setIsOpeningPracticeActive(false);
              nextOpeningActive = false;
            } else {
              setBotPhrase(`Correct book move: ${playedMove.san}!`);
            }
          } else {
            const expectedWord = expectedSan ? ` (${expectedSan} was expected)` : "";
            setBotPhrase(`That deviates from the chosen book line${expectedWord}. We are now playing normal chess.`);
            setIsOpeningPracticeActive(false);
            nextOpeningActive = false;
          }
        }

        // Check game status after player's move
        const isGameOver = checkGameStatus(game, selectedBot);

        // Trigger bot counterplay if not finished
        if (!isGameOver) {
          triggerBotPlay(game, selectedBot, undefined, nextOpeningActive);
        }
      }
    } catch (e) {
      console.log("Invalid move rejected");
    }
  };

  const checkGameStatus = (currentChess: Chess, bot: Bot): boolean => {
    if (currentChess.isCheckmate()) {
      const winnerColor = currentChess.turn() === 'w' ? 'b' : 'w';
      const playerWon = winnerColor === playerColor;
      
      triggerGameOver(playerWon ? 'win' : 'loss', 'Checkmate', bot);
      return true;
    } else if (currentChess.isDraw()) {
      let reason = 'Draw';
      if (currentChess.isStalemate()) reason = 'Stalemate';
      else if (currentChess.isThreefoldRepetition()) reason = 'Threefold Repetition';
      else if (currentChess.isInsufficientMaterial()) reason = 'Insufficient Material';
      
      triggerGameOver('draw', reason, bot);
      return true;
    }
    return false;
  };

  const triggerGameOver = (result: 'win' | 'loss' | 'draw', reason: string, bot: Bot) => {
    const finalizeGameOver = () => {
      setGameResult(result);
      setResultReason(reason);

      chessAudio.playGameOver(result === 'win');

      // Dialogue reaction
      if (result === 'win') {
        setBotPhrase(bot.lossPhrase);
      } else if (result === 'loss') {
        setBotPhrase(bot.winPhrase);
      } else {
        setBotPhrase("A balanced game! Let's shake hands on a draw. GG.");
      }

      // Bot games are now unrated / friendly
      setEloDelta(null);

      onUpdateStats(prev => {
        const newHistoryRecord = {
          id: Math.random().toString(36).substr(2, 9),
          opponentName: `${bot.name} (Bot)`,
          opponentRating: bot.rating,
          mode: 'bot' as const,
          playerColor,
          result,
          date: new Date().toLocaleDateString(),
          movesCount: Math.ceil(moveHistory.length / 2),
          moves: moveHistory
        };

        return {
          ...prev,
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

  const handleExitGame = () => {
    setGame(null);
    setLastMove(null);
    setSelectedBot(null);
    setGameResult(null);
    setShowMobileMoves(false);
    clearInterval(clockInterval.current);
  };

  const activeOpeningObj = openingsList.find(o => o.id === startingOpeningId);
  const tiers = ['Beginner', 'Intermediate', 'Advanced', 'Master'];
  const filteredBots = botsList.filter(b => b.tier === activeTier);

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
      
      {/* 1. SELECTION SCREEN */}
      {!game && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Header Hero */}
          <div className="relative text-center py-3 px-4 rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#E0E0E0] shadow-md overflow-hidden mb-3 shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#4CAF50]/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-center gap-4">
              <Cpu className="w-7 h-7 text-[#4CAF50]" />
              <div className="text-left">
                <h2 className="font-sans font-bold text-xl tracking-tight text-white leading-none">Play Versus Bots</h2>
                <p className="text-[#888888] text-[10px] mt-1">Practice and challenge computer personalities of varying difficulties.</p>
              </div>
            </div>
          </div>

          {/* Setup Panel */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-2 md:p-3 shadow-md mb-3 flex flex-wrap lg:flex-nowrap gap-3 shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#888888] uppercase">Color</span>
              <div className="flex bg-[#121212] border border-[#2A2A2A] rounded-xl overflow-hidden p-0.5">
                {[
                  { id: 'w', label: 'White ⚪' },
                  { id: 'b', label: 'Black ⚫' }
                ].map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setPlayerColor(col.id as 'w' | 'b')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition cursor-pointer ${playerColor === col.id ? 'bg-[#2A2A2A] text-white shadow-sm' : 'text-[#888888] hover:text-[#E0E0E0]'}`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-1 items-center gap-2 justify-end">
              <span className="text-[10px] font-bold text-[#888888] uppercase">Setup</span>
              <div className="flex gap-2 w-full max-w-[200px] lg:max-w-xs">
                <select
                  value={startingPositionType}
                  onChange={(e) => setStartingPositionType(e.target.value as any)}
                  className="flex-1 px-2 py-1.5 rounded-xl text-[11px] bg-[#121212] border border-[#2A2A2A] text-[#E0E0E0] focus:outline-hidden"
                >
                  <option value="standard">Standard</option>
                  <option value="opening">Book Opening</option>
                </select>
                
                {startingPositionType === 'opening' && (
                  <select
                    value={startingOpeningId}
                    onChange={(e) => setStartingOpeningId(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-xl text-[11px] bg-[#121212] border border-[#2A2A2A] text-[#E0E0E0] focus:outline-hidden"
                  >
                    {openingsList.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Tier Tabs */}
          <div className="flex bg-[#121212] border border-[#2A2A2A] rounded-2xl p-1 mb-3 shrink-0">
            {tiers.map(tier => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${activeTier === tier ? 'bg-[#2A2A2A] text-white shadow-sm' : 'text-[#888888] hover:text-[#E0E0E0]'}`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Bots Grid (Filtered) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2 flex-1 content-start pb-2">
            {filteredBots.map((bot) => {
              const locked = isBotLocked(bot);
              return (
                <div
                  key={bot.id}
                  id={`bot-card-${bot.id}`}
                  className={`relative p-2.5 rounded-2xl border transition duration-200 flex flex-col justify-between overflow-hidden bg-[#1A1A1A] border-[#2A2A2A] shadow-md ${locked ? 'opacity-50 saturate-0' : 'hover:scale-[1.02] hover:border-[#4CAF50]/40'}`}
                >
                  {locked && (
                    <div className="absolute top-1.5 right-1.5 text-red-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-xl shadow-inner mb-1">
                      {bot.avatar}
                    </div>
                    <h3 className="font-sans font-black text-[11px] text-white leading-tight w-full truncate">{bot.name}</h3>
                    <span className="text-[8px] font-mono font-bold text-[#4CAF50] mt-0.5">
                      {bot.rating} ELO
                    </span>
                    <p className="text-[8px] text-[#888888] leading-tight font-medium mt-0.5 line-clamp-1 min-h-[12px]">
                      {bot.personality}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-[#2A2A2A]">
                    {locked ? (
                      <span className="block text-[8px] font-bold text-center text-red-400 font-mono">
                        {getUnlockRequirement(bot.tier)}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStartGame(bot)}
                        className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-[#4CAF50] hover:bg-[#388E3C] text-[#121212] font-bold text-[9px] shadow-sm transition cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-[#121212]" /> Play
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. GAME BOARD PLAY VS BOT */}
      {game && selectedBot && (
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch flex-1 min-h-0 overflow-x-hidden overflow-y-auto pb-1 md:pb-2">
          
          {/* Board Frame Column */}
          <div className="flex-1 w-full max-w-[min(100vw-24px,100dvh-280px)] md:max-w-[min(100vw-300px,100dvh-240px)] lg:max-w-[min(100vw-360px,80dvh)] mx-auto flex flex-col items-center justify-center min-h-0 shrink-0">
            
            {/* Top Bot panel / Unified Chat Speech Balloon */}
            <div className="w-full bg-[#1A1A1A] max-md:bg-transparent max-md:border-none max-md:shadow-none max-md:p-1 p-3 border border-[#2A2A2A] rounded-2xl shadow-md flex items-start gap-2 relative overflow-hidden mb-1 md:mb-2 select-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4CAF50]/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-base md:text-xl shrink-0 shadow-inner relative">
                {selectedBot.avatar}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#1A1A1A] rounded-full animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <span className="font-sans font-black text-xs text-white mr-1">{selectedBot.name}</span>
                    <span className="text-[9px] font-mono bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/20 px-1 py-0.5 rounded-sm font-semibold">
                      {selectedBot.rating}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Real-time Bot Clock */}
                    <div className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-4 md:py-1.5 rounded-lg border font-mono font-bold text-xs md:text-lg bg-[#121212] text-[#E0E0E0] border-[#2A2A2A] shadow-inner">
                      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#888888]" />
                      <span>{formatClock(opponentTime)}</span>
                    </div>
                    <button
                      onClick={handleExitGame}
                      className="text-[9px] font-bold text-[#888888] hover:text-white border border-[#2A2A2A] bg-[#121212] hover:bg-[#2A2A2A] px-1.5 py-0.5 rounded transition cursor-pointer"
                    >
                      Exit
                    </button>
                  </div>
                </div>
                <div className="relative bg-[#121212] border border-[#2A2A2A] rounded-lg p-1.5 md:p-2 text-[10px] md:text-[11px] text-[#E0E0E0] font-medium leading-tight">
                  <div className="absolute top-2 -left-1.5 w-2 h-2 bg-[#121212] border-l border-b border-[#2A2A2A] rotate-45" />
                  <p>"{botPhrase || "Good luck, you will need it!"}"</p>
                </div>
              </div>
            </div>

            {/* Chessboard */}
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
              wrapperClassName="w-full"
            />

            {/* Bottom Self Panel */}
            <div className="w-full flex items-center justify-between bg-[#1A1A1A] max-md:bg-transparent max-md:border-none max-md:shadow-none max-md:p-1 p-2.5 rounded-xl shadow-md mt-1 md:mt-2 select-none">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-base md:text-lg shadow-xs">
                  🏆
                </div>
                <div className="ml-2">
                  <span className="block font-bold text-xs text-white leading-none">{username}</span>
                  <span className="block text-[9px] font-mono text-[#888888] font-bold mt-0.5 md:mt-1">Casual Mode</span>
                </div>
              </div>

              {/* Real-time Player Clock */}
              <div className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-4 md:py-1.5 rounded-lg border font-mono font-bold text-xs md:text-lg bg-[#121212] text-[#E0E0E0] border-[#2A2A2A] shadow-inner">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#888888]" />
                <span>{formatClock(playerTime)}</span>
              </div>
            </div>

            {/* Live Buttons - Mobile version */}
            {!gameResult && (
              <div className="w-full grid grid-cols-2 gap-2 mt-1 md:hidden">
                <button
                  onClick={() => handleStartGame(selectedBot)}
                  className="py-1.5 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[10px] font-bold text-[#888888] flex items-center justify-center transition cursor-pointer"
                >
                  Restart
                </button>
                <button
                  onClick={() => setShowMobileMoves(true)}
                  className="py-1.5 rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/5 text-[10px] font-bold text-[#4CAF50] flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  PGN Moves
                </button>
              </div>
            )}
          </div>

          {/* Right Column: PGN (Desktop Only) */}
          <div className="hidden md:flex w-full md:w-64 flex-col justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 shadow-md h-full min-h-0">
            <div className="space-y-2 flex flex-col min-h-0 flex-1">
              <div className="border-b border-[#2A2A2A] pb-1.5 shrink-0">
                <span className="block font-sans font-extrabold text-xs text-white">Match Status</span>
              </div>

              <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-2 flex-1 overflow-y-auto flex flex-col">
                <span className="block text-[9px] font-bold text-[#888888] uppercase mb-1 shrink-0">Move Logs</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px] text-[#888888] overflow-y-auto pr-1">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <span className="text-[#666666] w-4">{idx + 1}.</span>
                      <span className="font-semibold text-[#E0E0E0]">{moveHistory[idx * 2]}</span>
                      {moveHistory[idx * 2 + 1] && (
                        <span className="text-[#666666]">{moveHistory[idx * 2 + 1]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartGame(selectedBot)}
              className="w-full mt-2 py-2 rounded-xl bg-[#2A2A2A] hover:bg-[#333333] border border-[#2A2A2A] text-white text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restart
            </button>
          </div>

          {/* Mobile Overlay for PGN Moves */}
          {showMobileMoves && (
            <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col p-4 animate-fade-in lg:hidden">
              <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3 mb-4">
                <span className="font-sans font-bold text-sm text-white">Move Logs ({selectedBot.name})</span>
                <button
                  onClick={() => setShowMobileMoves(false)}
                  className="px-3 py-1 text-xs font-bold bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg"
                >
                  Back
                </button>
              </div>
              <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 overflow-y-auto font-mono text-xs text-[#888888]">
                {/* ...same list... */}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Over Modal */}
      {gameResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-6 shadow-2xl w-full max-w-sm relative animate-scale-up">
            <button onClick={handleExitGame} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
              <div className="text-xl leading-none">×</div>
            </button>

            <div className="text-center space-y-4">
              <Award className="w-12 h-12 text-amber-500 mx-auto" />
              <div>
                <h3 className="font-sans font-black text-2xl text-white">
                  {gameResult === 'win' ? 'Victory!' : gameResult === 'loss' ? 'Defeat' : "Draw"}
                </h3>
                <p className="text-sm text-[#888888] mt-1">{resultReason}</p>
                <div className="text-sm font-sans font-semibold text-[#888888] mt-2">
                  Friendly Game (Unrated)
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <button
                  onClick={() => handleStartGame(selectedBot!)}
                  className="w-full py-2.5 rounded-xl bg-[#4CAF50] hover:bg-[#388E3C] text-white font-bold transition"
                >
                  Rematch
                </button>
                {onReviewGame && (
                  <button
                    onClick={() => {
                      onReviewGame({
                        id: Math.random().toString(36).substr(2, 9),
                        opponentName: selectedBot ? `${selectedBot.name} (Bot)` : "Bot",
                        opponentRating: selectedBot ? selectedBot.rating : 1200,
                        mode: 'bot',
                        playerColor,
                        result: gameResult,
                        date: new Date().toLocaleDateString(),
                        movesCount: Math.ceil(moveHistory.length / 2),
                        moves: moveHistory
                      });
                      handleExitGame();
                    }}
                    className="w-full py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/50 text-cyan-400 font-bold flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Review
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
