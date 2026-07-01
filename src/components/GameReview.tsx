import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { UserStats, GameRecord } from '../types';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { minimax } from '../utils/chessAI';
import { openingsList } from '../utils/openingsData';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Sparkles, 
  ArrowLeft, 
  TrendingUp, 
  BookOpen, 
  History
} from 'lucide-react';

interface GameReviewProps {
  stats: UserStats;
  selectedGame: GameRecord | null;
  boardTheme: BoardTheme;
  onBackToLobby: () => void;
  onSelectGameToReview: (game: GameRecord) => void;
}

export interface MoveAnalysis {
  san: string;
  from: string;
  to: string;
  color: 'w' | 'b';
  evaluationBefore: number;
  evaluationAfter: number;
  type: 'brilliant' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';
  commentary: string;
  bestMove?: { from: string; to: string };
  openingName?: string;
  openingVariation?: string;
}

interface DetectedOpeningDetails {
  openingName: string;
  defenseName: string;
  variationName: string | null;
}

// Fixed position opening & defense detector based on chess.js history
export const detectOpeningAndDefense = (moves: string[]): DetectedOpeningDetails => {
  let openingName = 'None';
  let defenseName = 'None';
  let variationName: string | null = null;

  if (moves.length === 0) {
    return { openingName: 'Starting Position', defenseName: 'None', variationName: null };
  }

  // 1. Establish initial baseline category
  const firstMove = moves[0];
  if (firstMove === 'e4') {
    openingName = "King's Pawn Game";
  } else if (firstMove === 'd4') {
    openingName = "Queen's Pawn Game";
  } else if (firstMove === 'Nf3') {
    openingName = "Réti Opening";
  } else if (firstMove === 'c4') {
    openingName = "English Opening";
  } else if (firstMove === 'f4') {
    openingName = "Bird's Opening";
  } else if (firstMove === 'g3') {
    openingName = "Benko Opening";
  }

  // 2. Establish initial black response category
  if (moves.length >= 2) {
    const secondMove = moves[1];
    if (firstMove === 'e4') {
      if (secondMove === 'e5') {
        defenseName = "Open Game (Symmetrical)";
      } else if (secondMove === 'c5') {
        defenseName = "Sicilian Defense";
      } else if (secondMove === 'e6') {
        defenseName = "French Defense";
      } else if (secondMove === 'c6') {
        defenseName = "Caro-Kann Defense";
      } else if (secondMove === 'd6') {
        defenseName = "Pirc Defense";
      } else if (secondMove === 'g6') {
        defenseName = "Modern Defense";
      } else if (secondMove === 'Nf6') {
        defenseName = "Alekhine's Defense";
      } else if (secondMove === 'd5') {
        defenseName = "Scandinavian Defense";
      }
    } else if (firstMove === 'd4') {
      if (secondMove === 'd5') {
        defenseName = "Closed Game (Symmetrical)";
      } else if (secondMove === 'Nf6') {
        defenseName = "Indian Defense";
      } else if (secondMove === 'f5') {
        defenseName = "Dutch Defense";
      } else if (secondMove === 'e6') {
        defenseName = "Horwitz Defense";
      } else if (secondMove === 'c5') {
        defenseName = "Benoni Defense";
      }
    }
  }

  // 3. Search opening data tree for longest matches
  let bestOpeningMatchLen = 0;
  let bestDefenseMatchLen = 0;

  for (const op of openingsList) {
    // Check main line moves
    let matchLen = 0;
    for (let j = 0; j < Math.min(moves.length, op.moves.length); j++) {
      if (moves[j] === op.moves[j]) {
        matchLen++;
      } else {
        break;
      }
    }

    if (matchLen >= 2) {
      if (op.side === 'w') {
        if (matchLen > bestOpeningMatchLen) {
          bestOpeningMatchLen = matchLen;
          openingName = op.name;
        }
      } else {
        if (matchLen > bestDefenseMatchLen) {
          bestDefenseMatchLen = matchLen;
          defenseName = op.name;
        }
      }
    }

    // Check variations inside the database
    if (op.variations) {
      for (const v of op.variations) {
        let vMatchLen = 0;
        for (let j = 0; j < Math.min(moves.length, v.moves.length); j++) {
          if (moves[j] === v.moves[j]) {
            vMatchLen++;
          } else {
            break;
          }
        }

        if (vMatchLen >= 2) {
          if (op.side === 'w') {
            if (vMatchLen > bestOpeningMatchLen) {
              bestOpeningMatchLen = vMatchLen;
              openingName = op.name;
              variationName = v.name;
            }
          } else {
            if (vMatchLen > bestDefenseMatchLen) {
              bestDefenseMatchLen = vMatchLen;
              defenseName = op.name;
              variationName = v.name;
            }
          }
        }
      }
    }
  }

  return { openingName, defenseName, variationName };
};

export const GameReview: React.FC<GameReviewProps> = ({
  stats,
  selectedGame,
  boardTheme,
  onBackToLobby,
  onSelectGameToReview
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzedMoves, setAnalyzedMoves] = useState<MoveAnalysis[]>([]);
  const [activeMoveIdx, setActiveMoveIdx] = useState(-1); // -1 is starting position
  const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [playerPerspective, setPlayerPerspective] = useState<'w' | 'b'>('w');

  // Mobile navigation tabs state
  const [mobileTab, setMobileTab] = useState<'commentary' | 'moves' | 'stats'>('commentary');

  // Auto-set perspective based on the selected game
  useEffect(() => {
    if (selectedGame) {
      setPlayerPerspective(selectedGame.playerColor);
    }
  }, [selectedGame]);

  // Run full game analysis when a selected game changes
  useEffect(() => {
    let isCancelled = false;

    if (!selectedGame || !selectedGame.moves || selectedGame.moves.length === 0) {
      setAnalyzedMoves([]);
      setActiveMoveIdx(-1);
      setCurrentFen(selectedGame?.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      return;
    }

    setAnalyzing(true);
    setProgress(5);

    const runAnalysis = async () => {
      const getDeepEval = (chessInstance: Chess, depth: number): { evalScore: number, bestMoveObj?: {from: string, to: string} } => {
        if (chessInstance.isCheckmate()) {
          return { evalScore: chessInstance.turn() === 'w' ? -1000.0 : 1000.0 };
        }
        if (chessInstance.isDraw()) {
          return { evalScore: 0.0 };
        }
        const isMaximizing = chessInstance.turn() === 'w';
        const res = minimax(chessInstance, depth, -Infinity, Infinity, isMaximizing);
        return { 
          evalScore: res.score / 100.0, 
          bestMoveObj: res.move ? { from: res.move.from, to: res.move.to } : undefined 
        };
      };

      const moves = selectedGame.moves || [];
      const initialFen = selectedGame.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const chess = new Chess(initialFen);
      const analysisList: MoveAnalysis[] = [];
      let lastEval = getDeepEval(chess, 1).evalScore;

      for (let i = 0; i < moves.length; i++) {
        if (isCancelled) return;

        // Yield to main thread
        await new Promise(r => setTimeout(r, 0));

        const san = moves[i];
        const turn = chess.turn(); // 'w' or 'b'
        
        const verboseMoves = chess.moves({ verbose: true });
        const matched = verboseMoves.find(m => m.san === san);
        const fromSquare = matched ? matched.from : '';
        const toSquare = matched ? matched.to : '';
        const captured = matched ? matched.captured : undefined;
        const pieceType = matched ? matched.piece : '';

        const bestEval = lastEval;
        const bestMoveObj = getDeepEval(chess, 1).bestMoveObj;

        try {
          chess.move(san);
        } catch (e) {
          continue;
        }

        const currentEval = getDeepEval(chess, 1).evalScore;
        lastEval = currentEval;

        let evalLoss = turn === 'w' ? (bestEval - currentEval) : (currentEval - bestEval);
        const isCompletelyWinning = (turn === 'w' && bestEval >= 5.0 && currentEval >= 3.0) ||
                                    (turn === 'b' && bestEval <= -5.0 && currentEval <= -3.0);
                                    
        if (isCompletelyWinning && evalLoss > 0.5) {
           evalLoss = 0.4;
        }

        const loss = Math.max(0, evalLoss);
        let type: 'brilliant' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' = 'good';
        let commentary = '';

        if (i < 6) {
          type = 'book';
          commentary = 'Theory! Standard opening play developing active squares.';
        } else if (chess.isCheckmate()) {
          type = 'brilliant';
          commentary = 'Brilliant! A match-winning force that delivers absolute checkmate.';
        } else {
          if (loss <= 0.05) {
            if (captured && (pieceType === 'n' || pieceType === 'b' || pieceType === 'r' || pieceType === 'q')) {
              type = 'brilliant';
              commentary = 'Brilliant! A gorgeous tactical sacrifice giving huge positional gains.';
            } else {
              type = 'best';
              commentary = 'Best move! Perfect tactical play keeping full pressure.';
            }
          } else if (loss <= 0.20) {
            type = 'excellent';
            commentary = 'Excellent! Highly precise move maintaining control.';
          } else if (loss <= 0.50) {
            type = 'good';
            commentary = 'Good. Maintains competitiveness on the board.';
          } else if (loss <= 1.00) {
            type = 'inaccuracy';
            commentary = 'Inaccuracy. Misses a better square to post the piece.';
          } else if (loss <= 2.00) {
            type = 'mistake';
            commentary = 'Mistake! Relinquishes space and lets the opponent counter.';
          } else {
            type = 'blunder';
            commentary = 'Blunder! Drops critical material or damages king safety.';
          }
        }

        let finalCommentary = commentary;
        if ((type === 'inaccuracy' || type === 'mistake' || type === 'blunder') && bestMoveObj) {
          finalCommentary += ` The engine preferred moving from ${bestMoveObj.from} to ${bestMoveObj.to}.`;
        }

        analysisList.push({
          san,
          from: fromSquare,
          to: toSquare,
          color: turn,
          evaluationBefore: turn === 'w' ? bestEval : -bestEval,
          evaluationAfter: currentEval,
          type,
          commentary: finalCommentary,
          bestMove: bestMoveObj
        });

        lastEval = currentEval;
        
        if (!isCancelled) {
          setProgress(Math.round(((i + 1) / moves.length) * 100));
        }
      }

      if (!isCancelled) {
        setAnalyzedMoves(analysisList);
        setActiveMoveIdx(-1);
        setCurrentFen(initialFen);
        setProgress(100);
        setAnalyzing(false);
      }
    };

    const startupTimer = setTimeout(() => {
      runAnalysis();
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(startupTimer);
    };
  }, [selectedGame]);

  const handleStepTo = (idx: number) => {
    if (!selectedGame) return;
    const moves = selectedGame.moves || [];
    const initialFen = selectedGame.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    if (idx < -1 || idx >= moves.length) return;

    const chess = new Chess(initialFen);
    for (let i = 0; i <= idx; i++) {
      chess.move(moves[i]);
    }

    setCurrentFen(chess.fen());
    setActiveMoveIdx(idx);
  };

  const handleNext = () => {
    if (analyzedMoves.length > 0 && activeMoveIdx < analyzedMoves.length - 1) {
      handleStepTo(activeMoveIdx + 1);
    }
  };

  const handlePrev = () => {
    if (activeMoveIdx >= 0) {
      handleStepTo(activeMoveIdx - 1);
    }
  };

  const handleFirst = () => {
    handleStepTo(-1);
  };

  const handleLast = () => {
    if (analyzedMoves.length > 0) {
      handleStepTo(analyzedMoves.length - 1);
    }
  };

  const getMoveSummaryCounts = (color: 'w' | 'b') => {
    const counts = {
      brilliant: 0,
      best: 0,
      excellent: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    };

    analyzedMoves
      .filter(m => m.color === color)
      .forEach(m => {
        counts[m.type]++;
      });

    return counts;
  };

  const whiteCounts = getMoveSummaryCounts('w');
  const blackCounts = getMoveSummaryCounts('b');

  const computeAccuracy = (counts: typeof whiteCounts) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return 100;

    const weightedScore = 
      counts.brilliant * 100 +
      counts.best * 98 +
      counts.excellent * 90 +
      counts.book * 95 +
      counts.good * 75 +
      counts.inaccuracy * 50 +
      counts.mistake * 25 +
      counts.blunder * 0;

    return Math.round(weightedScore / total);
  };

  const whiteAccuracy = computeAccuracy(whiteCounts);
  const blackAccuracy = computeAccuracy(blackCounts);

  const activeMoveAnalysis = activeMoveIdx >= 0 ? analyzedMoves[activeMoveIdx] : null;

  // Real-time calculated opening details
  const currentPlayedMoves = selectedGame?.moves ? selectedGame.moves.slice(0, activeMoveIdx + 1) : [];
  const { openingName: liveOpening, defenseName: liveDefense, variationName: liveVariation } = detectOpeningAndDefense(currentPlayedMoves);

  return (
    <div className="w-full h-full flex flex-col gap-3 min-h-0 overflow-y-auto pb-2" id="game-review-component">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-[#2A2A2A] shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="review-back-btn"
            onClick={onBackToLobby}
            className="p-2 rounded-xl bg-[#121212] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-md border border-[#388E3C]/20 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#4CAF50]" />
                Interactive Engine Review
              </span>
            </div>
            <h2 className="font-sans font-black text-lg md:text-xl text-white mt-1">
              {selectedGame ? `Review vs ${selectedGame.opponentName}` : 'Game Review Lobby'}
            </h2>
          </div>
        </div>

        {selectedGame && (
          <button
            id="review-flip-btn"
            onClick={() => setPlayerPerspective(prev => prev === 'w' ? 'b' : 'w')}
            className="px-3 py-1.5 rounded-xl bg-[#121212] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs font-semibold text-gray-300 transition cursor-pointer"
          >
            🔄 Flip Board View
          </button>
        )}
      </div>

      {/* RENDER ANALYZING PROGRESS SCREEN */}
      {analyzing ? (
        <div className="flex-1 flex flex-col justify-center items-center py-10 bg-[#121212]/50 border border-[#2A2A2A] rounded-3xl gap-4 min-h-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#4CAF50] border-t-transparent animate-spin" />
            <span className="text-2xl animate-pulse">👑</span>
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-sans font-extrabold text-sm text-white">Stockfish AI Analysis...</h4>
            <p className="text-[10px] text-gray-500 font-mono">Generating brilliant moves & blunder indicators</p>
          </div>
          <div className="w-40 h-1 bg-[#2A2A2A] rounded-full overflow-hidden mt-1">
            <div 
              className="h-full bg-[#4CAF50] transition-all duration-300 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : !selectedGame ? (
        /* NO SELECTED GAME: HISTORY LIST LOBBY */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 text-center max-w-md mx-auto shrink-0 mb-4">
            <History className="w-10 h-10 text-[#4CAF50] mx-auto mb-2" />
            <h3 className="font-sans font-black text-base text-white">Select a Match to Review</h3>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Open any of your recently finished arena or computer bot matches to replay the moves and analyze your brilliant plays and blunders with our AI tool.
            </p>
          </div>

          <div className="max-w-2xl mx-auto w-full bg-[#121212] border border-[#2A2A2A] rounded-3xl p-4 shadow-lg flex-1 flex flex-col min-h-0">
            <h4 className="font-bold text-xs text-white mb-2 uppercase tracking-wider font-mono shrink-0">My Recent Games</h4>
            {stats.gameHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No matches found in your profile history yet. Play games to generate logs.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1 content-start">
                {stats.gameHistory.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => onSelectGameToReview(game)}
                    className="p-4 rounded-2xl bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-left transition hover:border-[#4CAF50]/30 cursor-pointer flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <span className="block font-black text-white text-sm">{game.opponentName}</span>
                        <span className="block text-[10px] text-gray-500 font-mono mt-0.5">Rating: {game.opponentRating}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${game.result === 'win' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' : game.result === 'loss' ? 'bg-red-950/40 text-red-400 border border-red-800/30' : 'bg-slate-800 text-slate-300'}`}>
                        {game.result}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-[#2A2A2A] font-mono w-full">
                      <span>{game.mode.toUpperCase()} ({game.playerColor === 'w' ? 'White' : 'Black'})</span>
                      <span className="text-[#4CAF50] font-bold">Review Match →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* FULL GAME REVIEW REPLAY VIEW */
        <div className="flex flex-col md:flex-row gap-4 items-stretch flex-1 min-h-0">
          
          {/* LEFT COLUMN: Chessboard, Evaluation Meter & Live Opening Tracker (Always visible at top on mobile) */}
          <div className="flex-1 w-full max-w-[min(100vw-24px,100dvh-320px)] md:max-w-[min(100vw-360px,100dvh-220px)] lg:max-w-[min(100vw-480px,70dvh)] mx-auto flex flex-col items-center min-h-0 shrink-0">
            
            {/* Evaluation Score Meter */}
            <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-2 flex items-center justify-between mb-2 font-mono text-[10px] text-white shrink-0">
              <span className="text-gray-500 font-semibold uppercase">Eval Score:</span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span className={`font-black text-sm ${(activeMoveAnalysis?.evaluationAfter || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(activeMoveAnalysis?.evaluationAfter || 0) >= 0 ? '+' : ''}{(activeMoveAnalysis?.evaluationAfter || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Chessboard container with no-overflow */}
            <div className="w-full aspect-square shrink-0 relative rounded-xl overflow-hidden shadow-lg border border-[#2A2A2A]">
              <ChessBoard
                fen={currentFen}
                lastMove={activeMoveAnalysis ? { from: activeMoveAnalysis.from, to: activeMoveAnalysis.to } : null}
                hintMove={
                  activeMoveAnalysis && 
                  (activeMoveAnalysis.type === 'inaccuracy' || activeMoveAnalysis.type === 'mistake' || activeMoveAnalysis.type === 'blunder') && 
                  activeMoveAnalysis.bestMove
                    ? activeMoveAnalysis.bestMove 
                    : null
                }
                onMove={() => {}} // Readonly
                playerColor={playerPerspective}
                isInteractive={false}
                theme={boardTheme}
                reviewMoveEvaluation={
                  activeMoveAnalysis
                    ? { square: activeMoveAnalysis.to, type: activeMoveAnalysis.type }
                    : null
                }
                wrapperClassName="w-full"
              />
            </div>

            {/* FIXED Opening & Defense Recognition Card */}
            <div className="w-full mt-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2.5 shrink-0 flex flex-col gap-1 shadow-md">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#4CAF50] tracking-widest leading-none">
                <BookOpen className="w-3 h-3 text-[#4CAF50]" />
                Live Opening Tracker
              </div>
              <div className="grid grid-cols-2 gap-3 mt-1 pt-1.5 border-t border-[#2A2A2A]/40">
                <div className="text-left min-w-0">
                  <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider leading-none">Opening (White)</span>
                  <span className="text-xs font-black text-white truncate block mt-1 leading-none" title={liveOpening}>
                    {liveOpening}
                  </span>
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider leading-none">Defense (Black)</span>
                  <span className="text-xs font-black text-cyan-400 truncate block mt-1 leading-none" title={liveDefense}>
                    {liveDefense}
                  </span>
                </div>
              </div>
              {liveVariation && (
                <div className="mt-1 text-[9px] text-gray-400 font-semibold bg-[#222222]/50 px-2 py-0.5 rounded border border-[#2A2A2A]/30 flex items-center gap-1.5 max-w-full truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">Variation: <strong className="text-amber-400 font-bold">{liveVariation}</strong></span>
                </div>
              )}
            </div>

            {/* Replay Controls Row (Positioned right below the board on mobile so it is always easy to tap) */}
            <div className="md:hidden w-full bg-[#1A1A1A] border border-[#2A2A2A] mt-2 rounded-xl p-2 flex items-center justify-center gap-2 shrink-0 shadow-md">
              <button
                onClick={handleFirst}
                disabled={activeMoveIdx === -1}
                className="p-1.5 rounded-lg hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrev}
                disabled={activeMoveIdx === -1}
                className="p-1.5 rounded-lg hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="font-mono text-xs font-bold text-[#E0E0E0] min-w-[70px] text-center">
                {activeMoveIdx === -1 ? (
                  <span className="text-gray-500 text-[10px]">Start</span>
                ) : (
                  <span className="text-[11px]">Move {activeMoveIdx + 1}</span>
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={analyzedMoves.length === 0 || activeMoveIdx === analyzedMoves.length - 1}
                className="p-1.5 rounded-lg hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleLast}
                disabled={analyzedMoves.length === 0 || activeMoveIdx === analyzedMoves.length - 1}
                className="p-1.5 rounded-lg hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN / MOBILE BOTTOM TABS: Game stats, commentary & moves list */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col justify-start gap-2 h-auto md:h-full min-h-0 flex-1">
            
            {/* Desktop View Sidebar */}
            <div className="hidden md:flex flex-col gap-2 h-full min-h-0">
              
              {/* ACCURACY GAUGE */}
              <div className="grid grid-cols-2 gap-2 bg-[#1A1A1A] p-2.5 rounded-xl shadow-md border border-[#2A2A2A] shrink-0">
                <div className="text-center border-r border-[#2A2A2A] pr-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">White Accuracy</span>
                  <span className="text-2xl font-black font-mono text-[#4CAF50]">{whiteAccuracy}%</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Black Accuracy</span>
                  <span className="text-2xl font-black font-mono text-cyan-400">{blackAccuracy}%</span>
                </div>
              </div>

              {/* Sidebar Complete Moves & Commentary Panel */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-md flex-1 flex flex-col min-h-0 overflow-hidden">
                
                {/* Scrollable moves feed */}
                <div className="p-1 flex-1 min-h-0 flex flex-col overflow-y-auto bg-[#1A1A1A]">
                  <div className="flex flex-col gap-0 text-xs font-semibold flex-1">
                    {Array.from({ length: Math.ceil(analyzedMoves.length / 2) }).map((_, idx) => {
                      const wIdx = idx * 2;
                      const bIdx = idx * 2 + 1;
                      const wMove = analyzedMoves[wIdx];
                      const bMove = analyzedMoves[bIdx];

                      return (
                        <div key={idx} className={`flex items-center gap-1 ${idx % 2 === 0 ? 'bg-[#222222]' : 'bg-[#1A1A1A]'} px-1`}>
                          <span className="text-[#666666] w-5 text-right mr-0.5 text-[10px] font-mono">{idx + 1}.</span>
                          
                          {wMove && (
                            <button
                              onClick={() => handleStepTo(wIdx)}
                              className={`flex-1 text-left px-1.5 py-1 rounded-sm transition flex justify-between items-center ${activeMoveIdx === wIdx ? 'bg-gray-700 text-white font-bold' : 'text-gray-300 hover:bg-[#333]'}`}
                            >
                              <span>{wMove.san}</span>
                              <span className={`text-[10px] font-bold ${
                                wMove.type === 'brilliant' ? 'text-cyan-400' :
                                wMove.type === 'best' ? 'text-emerald-400' :
                                wMove.type === 'excellent' ? 'text-green-400' :
                                wMove.type === 'book' ? 'text-amber-500' :
                                wMove.type === 'inaccuracy' ? 'text-yellow-400' :
                                wMove.type === 'mistake' ? 'text-orange-400' :
                                wMove.type === 'blunder' ? 'text-red-400' : ''
                              }`}>
                                {wMove.type === 'brilliant' ? '!!' : 
                                 wMove.type === 'best' ? '★' : 
                                 wMove.type === 'excellent' ? '✓' : 
                                 wMove.type === 'book' ? '📖' : 
                                 wMove.type === 'inaccuracy' ? '?!' : 
                                 wMove.type === 'mistake' ? '?' : 
                                 wMove.type === 'blunder' ? '??' : ''}
                              </span>
                            </button>
                          )}

                          {bMove && (
                            <button
                              onClick={() => handleStepTo(bIdx)}
                              className={`flex-1 text-left px-1.5 py-1 rounded-sm transition flex justify-between items-center ${activeMoveIdx === bIdx ? 'bg-gray-700 text-white font-bold' : 'text-gray-300 hover:bg-[#333]'}`}
                            >
                              <span>{bMove.san}</span>
                              <span className={`text-[10px] font-bold ${
                                bMove.type === 'brilliant' ? 'text-cyan-400' :
                                bMove.type === 'best' ? 'text-emerald-400' :
                                bMove.type === 'excellent' ? 'text-green-400' :
                                bMove.type === 'book' ? 'text-amber-500' :
                                bMove.type === 'inaccuracy' ? 'text-yellow-400' :
                                bMove.type === 'mistake' ? 'text-orange-400' :
                                bMove.type === 'blunder' ? 'text-red-400' : ''
                              }`}>
                                {bMove.type === 'brilliant' ? '!!' : 
                                 bMove.type === 'best' ? '★' : 
                                 bMove.type === 'excellent' ? '✓' : 
                                 bMove.type === 'book' ? '📖' : 
                                 bMove.type === 'inaccuracy' ? '?!' : 
                                 bMove.type === 'mistake' ? '?' : 
                                 bMove.type === 'blunder' ? '??' : ''}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Commentary Box */}
                <div className="bg-[#121212] border-t border-[#2A2A2A] p-3 shrink-0 flex flex-col min-h-[90px]">
                  {activeMoveAnalysis ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono uppercase ${
                          activeMoveAnalysis.type === 'brilliant' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/30' :
                          activeMoveAnalysis.type === 'best' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' :
                          activeMoveAnalysis.type === 'excellent' ? 'bg-green-950/40 text-green-400 border border-green-800/30' :
                          activeMoveAnalysis.type === 'good' ? 'bg-slate-800 text-slate-300' :
                          activeMoveAnalysis.type === 'book' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/20' :
                          activeMoveAnalysis.type === 'inaccuracy' ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/30' :
                          activeMoveAnalysis.type === 'mistake' ? 'bg-orange-950/40 text-orange-400 border border-orange-800/30' :
                          'bg-red-950/40 text-red-400 border border-red-800/30'
                        }`}>
                          {activeMoveAnalysis.type}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Eval: {(activeMoveAnalysis.evaluationAfter >= 0 ? '+' : '')}{activeMoveAnalysis.evaluationAfter.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed font-semibold">
                        "{activeMoveAnalysis.commentary}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-2 text-center">
                      Select a move to view detailed engine analysis and commentary.
                    </p>
                  )}
                </div>

                {/* Desktop Controls */}
                <div className="bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-b-2xl p-2 flex items-center justify-center gap-2 shrink-0">
                  <button
                    onClick={handleFirst}
                    disabled={activeMoveIdx === -1}
                    className="p-2 rounded-xl hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
                  >
                    <ChevronsLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePrev}
                    disabled={activeMoveIdx === -1}
                    className="p-2 rounded-xl hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="font-mono text-xs font-bold text-[#E0E0E0] min-w-[70px] text-center">
                    {activeMoveIdx === -1 ? (
                      <span className="text-gray-500">Start</span>
                    ) : (
                      <span>Move {activeMoveIdx + 1}</span>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={analyzedMoves.length === 0 || activeMoveIdx === analyzedMoves.length - 1}
                    className="p-2 rounded-xl hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleLast}
                    disabled={analyzedMoves.length === 0 || activeMoveIdx === analyzedMoves.length - 1}
                    className="p-2 rounded-xl hover:bg-[#222] disabled:opacity-30 text-gray-300 transition"
                  >
                    <ChevronsRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile View Bottom Tabs (Renders only below md screens, resolves overlaps!) */}
            <div className="md:hidden flex flex-col gap-1 w-full shrink-0">
              
              {/* Segmented Tab Bar */}
              <div className="flex border-b border-[#2A2A2A] bg-[#121212] py-1 rounded-t-xl shrink-0">
                {[
                  { id: 'commentary', label: 'Coach' },
                  { id: 'moves', label: 'Moves' },
                  { id: 'stats', label: 'Accuracy' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMobileTab(t.id as any)}
                    className={`flex-1 py-2 text-xs font-bold transition-colors ${mobileTab === t.id ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-gray-400 hover:text-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents Card */}
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-b-xl p-3 min-h-[140px] max-h-[160px] overflow-y-auto shrink-0 shadow-md flex flex-col justify-between">
                
                {mobileTab === 'commentary' && (
                  <div className="flex flex-col gap-1.5 h-full">
                    {activeMoveAnalysis ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase ${
                            activeMoveAnalysis.type === 'brilliant' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/30' :
                            activeMoveAnalysis.type === 'best' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' :
                            activeMoveAnalysis.type === 'excellent' ? 'bg-green-950/40 text-green-400 border border-green-800/30' :
                            activeMoveAnalysis.type === 'good' ? 'bg-slate-800 text-slate-300' :
                            activeMoveAnalysis.type === 'book' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/20' :
                            activeMoveAnalysis.type === 'inaccuracy' ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/30' :
                            activeMoveAnalysis.type === 'mistake' ? 'bg-orange-950/40 text-orange-400 border border-orange-800/30' :
                            'bg-red-950/40 text-red-400 border border-red-800/30'
                          }`}>
                            {activeMoveAnalysis.type}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">
                            Eval: {(activeMoveAnalysis.evaluationAfter >= 0 ? '+' : '')}{activeMoveAnalysis.evaluationAfter.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-200 leading-relaxed font-semibold">
                          "{activeMoveAnalysis.commentary}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic text-center my-auto">
                        Tap any move below or use arrow keys to view coach insights.
                      </p>
                    )}
                  </div>
                )}

                {mobileTab === 'moves' && (
                  <div className="grid grid-cols-3 gap-1 overflow-y-auto max-h-[140px] p-0.5 font-sans">
                    {analyzedMoves.map((m, index) => (
                      <button
                        key={index}
                        onClick={() => handleStepTo(index)}
                        className={`px-1.5 py-1 text-[10px] rounded border transition flex justify-between items-center ${activeMoveIdx === index ? 'bg-gray-700 text-white font-bold border-[#4CAF50]' : 'bg-[#121212] text-gray-300 border-[#2A2A2A] hover:bg-[#2A2A2A]'}`}
                      >
                        <span className="font-mono text-gray-500 mr-0.5">{Math.floor(index/2) + 1}{index % 2 === 0 ? '.' : '...'}</span>
                        <span className="truncate">{m.san}</span>
                        <span className={`text-[8px] font-black ml-0.5 ${
                          m.type === 'brilliant' ? 'text-cyan-400' :
                          m.type === 'best' ? 'text-emerald-400' :
                          m.type === 'excellent' ? 'text-green-400' :
                          m.type === 'book' ? 'text-amber-500' :
                          m.type === 'inaccuracy' ? 'text-yellow-400' :
                          m.type === 'mistake' ? 'text-orange-400' :
                          m.type === 'blunder' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {m.type === 'brilliant' ? '!!' : 
                           m.type === 'best' ? '★' : 
                           m.type === 'excellent' ? '✓' : 
                           m.type === 'book' ? '📖' : 
                           m.type === 'inaccuracy' ? '?!' : 
                           m.type === 'mistake' ? '?' : 
                           m.type === 'blunder' ? '??' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {mobileTab === 'stats' && (
                  <div className="flex flex-col gap-2 justify-center h-full">
                    <div className="grid grid-cols-2 gap-2 text-center bg-[#121212] p-2 rounded-lg border border-[#2A2A2A]/50">
                      <div>
                        <span className="text-[8px] font-bold text-gray-500 uppercase block leading-none mb-1">White Accuracy</span>
                        <span className="text-lg font-black font-mono text-[#4CAF50]">{whiteAccuracy}%</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-gray-500 uppercase block leading-none mb-1">Black Accuracy</span>
                        <span className="text-lg font-black font-mono text-cyan-400">{blackAccuracy}%</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Back to select match */}
            <button
              id="review-lobby-btn"
              onClick={onBackToLobby}
              className="w-full py-2.5 rounded-xl bg-[#2A2A2A] hover:bg-[#333] border border-[#2A2A2A] text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-md mt-1"
            >
              Back to Match List
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
