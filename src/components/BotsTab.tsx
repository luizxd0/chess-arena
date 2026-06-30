import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { Bot, UserStats, GameRecord } from '../types';
import { botsList, getBotMove, getStockfishMove } from '../utils/chessAI';
import { openingsList } from '../utils/openingsData';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { chessAudio } from '../utils/audio';
import { Lock, Unlock, Play, ArrowLeft, RefreshCw, Award, Cpu, MessageCircle, Sparkles } from 'lucide-react';

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

  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Check if a bot is locked based on player's Bot Elo
  const isBotLocked = (bot: Bot): boolean => {
    if (bot.tier === 'Beginner') return false;
    if (bot.tier === 'Intermediate') return stats.botRating < 1000;
    if (bot.tier === 'Advanced') return stats.botRating < 1600;
    if (bot.tier === 'Master') return stats.botRating < 2200;
    return false;
  };

  const getUnlockRequirement = (tier: string): string => {
    if (tier === 'Intermediate') return 'Unlock at 1000 Bot Elo';
    if (tier === 'Advanced') return 'Unlock at 1600 Bot Elo';
    if (tier === 'Master') return 'Unlock at 2200 Bot Elo';
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
    setBotPhrase(isOpPractice ? `Let's practice the opening! Make your first move.` : bot.greeting);

    // If bot plays White, they make the move immediately
    if (playerColor === 'b' && chess.turn() === 'w') {
      triggerBotPlay(chess, bot, openingMoves, isOpPractice);
    }
  };

  // Bot play logic
  const triggerBotPlay = (currentChess: Chess, bot: Bot, openingMovesStack?: string[], isPracticeActiveOverride?: boolean) => {
    if (gameResult) return;

    const startTime = Date.now();
    const isPracticeActive = isPracticeActiveOverride !== undefined ? isPracticeActiveOverride : isOpeningPracticeActive;
    
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

        // Calculate actual elapsed time to make sure the "thinking" indicator has a realistic feel
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(50, 700 - elapsed);

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

  const handlePlayerMove = (from: string, to: string, promotion?: string) => {
    if (!game || !selectedBot || gameResult) return;

    try {
      const fenBefore = game.fen();
      const playedMove = game.move({ from, to, promotion: promotion || 'q' });

      if (playedMove) {
        setFen(game.fen());
        setMoveHistory(game.history());

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

    // Update Player Bot Rating ELO based on difficulty
    let eloChange = 0;
    if (result === 'win') {
      // Defeating stronger bots awards much more Elo
      const difficultyGap = bot.rating - stats.botRating;
      eloChange = Math.max(5, Math.floor(15 + (difficultyGap / 10)));
    } else if (result === 'loss') {
      eloChange = Math.min(-5, Math.floor(-10 + ((bot.rating - stats.botRating) / 12)));
    }

    onUpdateStats(prev => {
      const nextBotRating = Math.max(100, prev.botRating + eloChange);
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
        botRating: nextBotRating,
        wins: prev.wins + (result === 'win' ? 1 : 0),
        losses: prev.losses + (result === 'loss' ? 1 : 0),
        draws: prev.draws + (result === 'draw' ? 1 : 0),
        gameHistory: [newHistoryRecord, ...prev.gameHistory]
      };
    });
  };

  const handleExitGame = () => {
    setGame(null);
    setSelectedBot(null);
    setGameResult(null);
    setShowMobileMoves(false);
  };

  // Start selected opening variation indices mapping
  const activeOpeningObj = openingsList.find(o => o.id === startingOpeningId);

  return (
    <div className="w-full flex flex-col min-h-[500px]">
      
      {/* 1. SELECTION SCREEN */}
      {!game && (
        <div className="flex-1 flex flex-col">
          {/* Header Hero */}
          <div className="relative text-center py-4 px-4 rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#E0E0E0] shadow-md overflow-hidden mb-3 shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#4CAF50]/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-center gap-4">
              <Cpu className="w-8 h-8 text-[#4CAF50]" />
              <div className="text-left">
                <h2 className="font-sans font-bold text-2xl tracking-tight text-white leading-none">Play Versus Bots</h2>
                <p className="text-[#888888] text-xs mt-1">
                  Defeat progressively stronger chess bots to unlock advanced grandmasters.
                </p>
              </div>
              <div className="ml-auto px-4 py-1.5 rounded-xl bg-[#121212] border border-[#2A2A2A] font-mono text-xs font-bold text-[#4CAF50]">
                Bot Elo: {stats.botRating}
              </div>
            </div>
          </div>

          {/* Sandbox Setup Panel */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 shadow-md mb-3 grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
            
            {/* Color Select */}
            <div>
              <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">My Side Color</label>
              <div className="flex gap-2">
                {[
                  { id: 'w', label: 'White ⚪', style: 'border-[#2A2A2A] bg-[#121212] text-[#E0E0E0]' },
                  { id: 'b', label: 'Black ⚫', style: 'border-[#2A2A2A] bg-[#121212] text-[#888888]' }
                ].map((col) => (
                  <button
                    key={col.id}
                    id={`color-btn-${col.id}`}
                    onClick={() => setPlayerColor(col.id as 'w' | 'b')}
                    className={`flex-1 py-2 px-3 rounded-xl border font-semibold text-xs transition cursor-pointer ${playerColor === col.id ? 'ring-2 ring-[#4CAF50] scale-102 border-transparent' : 'opacity-60 hover:opacity-100 bg-[#121212] border-[#2A2A2A] text-[#888888]'}`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Select */}
            <div>
              <label className="block text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Starting Setup</label>
              <div className="flex gap-2">
                <button
                  id="pos-standard-btn"
                  onClick={() => setStartingPositionType('standard')}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${startingPositionType === 'standard' ? 'bg-[#2A2A2A] text-white border-[#4CAF50]' : 'bg-[#121212] text-[#888888] border-[#2A2A2A] hover:bg-[#2A2A2A]'}`}
                >
                  Standard
                </button>
                <button
                  id="pos-opening-btn"
                  onClick={() => {
                    setStartingPositionType('opening');
                    if (!startingOpeningId && openingsList.length > 0) {
                      setStartingOpeningId(openingsList[0].id);
                    }
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${startingPositionType === 'opening' ? 'bg-[#2A2A2A] text-white border-[#4CAF50]' : 'bg-[#121212] text-[#888888] border-[#2A2A2A] hover:bg-[#2A2A2A]'}`}
                >
                  Book Opening
                </button>
              </div>
            </div>

            {/* Opening Specific Pick */}
            {startingPositionType === 'opening' && (
              <div className="md:col-span-1 space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1">Select Opening</label>
                  <select
                    id="opening-select"
                    value={startingOpeningId}
                    onChange={(e) => {
                      setStartingOpeningId(e.target.value);
                      setStartingVariationIdx(0);
                    }}
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-[#121212] border border-[#2A2A2A] text-[#E0E0E0] focus:outline-hidden focus:border-[#4CAF50]"
                  >
                    {openingsList.map(op => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
                {activeOpeningObj && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1">Select Variation</label>
                    <select
                      id="variation-select"
                      value={startingVariationIdx}
                      onChange={(e) => setStartingVariationIdx(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-[#121212] border border-[#2A2A2A] text-[#E0E0E0] focus:outline-hidden focus:border-[#4CAF50]"
                    >
                      {activeOpeningObj.variations.map((v, i) => (
                        <option key={i} value={i}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>



          {/* Bots Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 flex-1 overflow-y-auto content-start pb-2">
            {botsList.map((bot) => {
              const locked = isBotLocked(bot);
              return (
                <div
                  key={bot.id}
                  id={`bot-card-${bot.id}`}
                  className={`relative p-2 rounded-xl border transition duration-200 flex flex-col justify-between overflow-hidden bg-[#1A1A1A] border-[#2A2A2A] shadow-md ${locked ? 'opacity-70 saturate-50' : 'hover:scale-102 hover:border-[#4CAF50]/40'}`}
                >
                  {/* Lock Overlay Banner */}
                  {locked && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-950/20 text-red-400 border border-red-900/30 text-[8px] font-bold">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </div>
                  )}

                  {/* Bot header info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 mt-1">
                      <div className="w-8 h-8 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-lg shadow-inner shrink-0">
                        {bot.avatar}
                      </div>
                      <div>
                        <h3 className="font-sans font-extrabold text-xs text-white leading-none truncate w-[70px]">{bot.name}</h3>
                        <div className="flex items-center mt-1">
                          <span className="text-[8px] font-mono font-bold bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/20 px-1 py-0.5 rounded-sm">
                            {bot.rating} ELO
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-[9px] text-[#888888] leading-tight font-medium line-clamp-1">
                      {bot.personality}
                    </p>
                  </div>

                  {/* Play/Unlock footer bar */}
                  <div className="mt-2 pt-1.5 border-t border-[#2A2A2A]">
                    {locked ? (
                      <span className="block text-[8px] font-bold text-center text-red-400 font-mono truncate">
                        {getUnlockRequirement(bot.tier)}
                      </span>
                    ) : (
                      <button
                        id={`play-bot-btn-${bot.id}`}
                        onClick={() => handleStartGame(bot)}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-[#4CAF50] hover:bg-[#388E3C] text-[#121212] font-bold text-[9px] shadow-sm transition cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-[#121212]" />
                        Play
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
        <div className="flex flex-col md:flex-row gap-4 items-stretch flex-1 min-h-0 overflow-hidden">
          
          {/* Board Frame Column */}
          <div className="flex-1 max-w-md mx-auto flex flex-col items-center h-full">
            
            {/* Top Bot panel / Unified Chat Speech Balloon */}
            <div className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3.5 shadow-md flex items-start gap-3 relative overflow-hidden mb-3">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4CAF50]/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Bot Avatar */}
              <div className="w-12 h-12 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-2xl shrink-0 shadow-inner relative">
                {selectedBot.avatar}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-[#1A1A1A] rounded-full animate-pulse" />
              </div>

              {/* Speech Balloon Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div>
                    <span className="font-sans font-black text-xs text-white mr-1.5">{selectedBot.name}</span>
                    <span className="text-[10px] font-mono bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/20 px-1.5 py-0.2 rounded-sm font-semibold">
                      {selectedBot.rating} ELO
                    </span>
                  </div>
                  <button
                    id="exit-game-bot-btn"
                    onClick={handleExitGame}
                    className="text-[10px] font-bold text-[#888888] hover:text-white border border-[#2A2A2A] bg-[#121212] hover:bg-[#2A2A2A] px-2.5 py-1 rounded-md transition cursor-pointer"
                  >
                    Exit
                  </button>
                </div>
                {/* Speech balloon styled text bubble */}
                <div className="relative bg-[#121212] border border-[#2A2A2A] rounded-xl p-2.5 text-xs text-[#E0E0E0] font-medium leading-relaxed">
                  <div className="absolute top-3 -left-1.5 w-3 h-3 bg-[#121212] border-l border-b border-[#2A2A2A] rotate-45" />
                  <p>"{botPhrase || "Good luck, you will need it!"}"</p>
                </div>
              </div>
            </div>

            {/* Chessboard */}
            <ChessBoard
              fen={fen}
              onMove={handlePlayerMove}
              playerColor={playerColor}
              isInteractive={!gameResult && game.turn() === playerColor}
              theme={boardTheme}
            />

            {/* Bottom Self Panel */}
            <div className="w-full max-w-md flex items-center bg-[#1A1A1A] border border-[#2A2A2A] p-3 rounded-xl shadow-md mt-3">
              <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#2A2A2A] flex items-center justify-center text-xl shadow-xs">
                🏆
              </div>
              <div className="ml-3">
                <span className="block font-bold text-sm text-white leading-none">{username}</span>
                <span className="block text-[10px] font-mono text-[#4CAF50] font-bold mt-1">Rating: {stats.botRating} ELO</span>
              </div>
            </div>

            {/* Live Buttons - Desktop & Mobile version */}
            {!gameResult && (
              <div className="w-full max-w-md grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={handleExitGame}
                  className="py-2 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Exit Game
                </button>
                <button
                  onClick={() => handleStartGame(selectedBot)}
                  className="py-2 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Restart
                </button>
                <button
                  onClick={() => setShowMobileMoves(true)}
                  className="py-2 lg:hidden rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 text-xs font-bold text-[#4CAF50] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 animate-pulse" />
                  PGN Moves
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Dialogue, evaluation & log (Desktop Only) */}
          <div className="hidden md:flex w-full md:w-80 flex-col justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 shadow-md h-full min-h-0">
            
            <div className="space-y-3 flex flex-col min-h-0 flex-1">
              {/* Bot Personality Header */}
              <div className="border-b border-[#2A2A2A] pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#4CAF50]" />
                  <div>
                    <span className="block text-[9px] font-bold text-[#4CAF50] uppercase tracking-wider">AI Game Panel</span>
                    <span className="block font-sans font-extrabold text-sm text-white leading-tight">Match Status</span>
                  </div>
                </div>
              </div>

              {/* PGN Logs */}
              <div className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 flex-1 overflow-y-auto flex flex-col">
                <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 shrink-0">PGN Move Logs</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-[#888888] overflow-y-auto pr-1">
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

            {/* Restart/Retry matching button */}
            <button
              id="reset-bot-game-btn"
              onClick={() => handleStartGame(selectedBot)}
              className="w-full mt-3 py-2.5 rounded-xl bg-[#2A2A2A] hover:bg-[#333333] border border-[#2A2A2A] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" /> Restart Match
            </button>

          </div>

          {/* Mobile Overlay for PGN Moves */}
          {showMobileMoves && (
            <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col p-4 animate-fade-in lg:hidden">
              <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3 mb-4">
                <span className="font-sans font-bold text-sm text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#4CAF50]" />
                  PGN Move Logs ({selectedBot.name})
                </span>
                <button
                  onClick={() => setShowMobileMoves(false)}
                  className="px-3 py-1 text-xs font-bold bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition"
                >
                  Back to Board
                </button>
              </div>

              <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 overflow-y-auto">
                <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2">PGN Move Logs</span>
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
                  {gameResult === 'win' ? 'Victory!' : gameResult === 'loss' ? 'Defeat' : "Draw Game"}
                </h3>
                <p className="text-sm text-[#888888] mt-1">Reason: {resultReason}</p>
                <div className="text-sm font-mono font-bold text-[#4CAF50] mt-2">
                  {gameResult === 'win' ? 'Your Rating: +18 Elo' : gameResult === 'loss' ? 'Your Rating: -10 Elo' : 'No change'}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => {
                    handleStartGame(selectedBot!);
                  }}
                  className="w-full py-3 rounded-xl bg-[#4CAF50] hover:bg-[#388E3C] text-white font-bold tracking-wider transition cursor-pointer"
                >
                  Rematch
                </button>
                {onReviewGame && (
                  <button
                    onClick={() => {
                      onReviewGame({
                        id: Math.random().toString(36).substr(2, 9),
                        opponentName: selectedBot ? `${selectedBot.name} (Bot)` : "Bot AI",
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
