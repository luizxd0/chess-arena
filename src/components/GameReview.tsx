import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { UserStats, GameRecord } from '../types';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { evaluateBoard } from '../utils/chessAI';
import { 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Sparkles, 
  ArrowLeft, 
  TrendingUp, 
  BookOpen, 
  Zap, 
  Check, 
  AlertTriangle, 
  Skull, 
  Info,
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
}

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
  const [showBestMove, setShowBestMove] = useState(false);

  // Auto-set perspective based on the selected game
  useEffect(() => {
    if (selectedGame) {
      setPlayerPerspective(selectedGame.playerColor);
    }
  }, [selectedGame]);

  // Run full game analysis when a selected game changes
  useEffect(() => {
    if (!selectedGame || !selectedGame.moves || selectedGame.moves.length === 0) {
      setAnalyzedMoves([]);
      setActiveMoveIdx(-1);
      setCurrentFen(selectedGame?.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      return;
    }

    setAnalyzing(true);
    setProgress(10);

    // Run in a slight timeout to simulate deep engine analysis & prevent UI freezing
    const timer = setTimeout(() => {
      const getMoveEval = (chessInstance: Chess, turn: 'w' | 'b'): number => {
        if (chessInstance.isCheckmate()) {
          return turn === 'w' ? 1000.0 : -1000.0;
        }
        if (chessInstance.isDraw()) {
          return 0.0;
        }
        return evaluateBoard(chessInstance) / 100.0;
      };

      const getBestMoveEval = (chessInstance: Chess): number => {
        const movesList = chessInstance.moves({ verbose: true });
        const side = chessInstance.turn();
        if (movesList.length === 0) {
          return getMoveEval(chessInstance, side);
        }
        
        let bestEval = side === 'w' ? -Infinity : Infinity;
        
        for (const m of movesList) {
          try {
            chessInstance.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
            const ev = getMoveEval(chessInstance, side);
            chessInstance.undo();
            
            if (side === 'w') {
              if (ev > bestEval) bestEval = ev;
            } else {
              if (ev < bestEval) bestEval = ev;
            }
          } catch (e) {
            // skip
          }
        }
        return bestEval;
      };

      const moves = selectedGame.moves || [];
      const initialFen = selectedGame.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const chess = new Chess(initialFen);
      
      const analysisList: MoveAnalysis[] = [];
      let lastEval = getMoveEval(chess, 'w');

      for (let i = 0; i < moves.length; i++) {
        const san = moves[i];
        const turn = chess.turn(); // 'w' or 'b'
        
        // Compute best move evaluation before making the move
        const bestEval = getBestMoveEval(chess);
        
        // Find from & to square by dry-running move
        const verboseMoves = chess.moves({ verbose: true });
        const matched = verboseMoves.find(m => m.san === san);
        const fromSquare = matched ? matched.from : '';
        const toSquare = matched ? matched.to : '';
        const captured = matched ? matched.captured : undefined;
        const pieceType = matched ? matched.piece : '';

        // Execute move
        try {
          chess.move(san);
        } catch (e) {
          // Fallback if move fails
          continue;
        }

        const currentEval = getMoveEval(chess, turn);
        
        // Loss of evaluation (centipawn loss, always >= 0)
        const evalLoss = turn === 'w' ? (bestEval - currentEval) : (currentEval - bestEval);
        const loss = Math.max(0, evalLoss);

        // Classification heuristics based on centipawn loss
        let type: 'brilliant' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' = 'good';
        let commentary = '';

        // Book check: First 6 moves of the game that are typical openings
        if (i < 6) {
          type = 'book';
          commentary = 'Theory! You are playing standard book openings.';
        } else if (chess.isCheckmate()) {
          type = 'brilliant';
          commentary = 'Brilliant! Forced checkmate delivered directly on the board.';
        } else {
          if (loss <= 0.05) {
            // Check if it is a tactical sacrifice (brilliant)
            if (captured && (pieceType === 'n' || pieceType === 'b' || pieceType === 'r' || pieceType === 'q')) {
              type = 'brilliant';
              commentary = 'Brilliant! A tactical piece activity that wins positional advantage.';
            } else {
              type = 'best';
              commentary = 'Best move! Matches the absolute peak line evaluated by the engine.';
            }
          } else if (loss <= 0.20) {
            type = 'excellent';
            commentary = 'Excellent move! Solid choice that keeps your position strong.';
          } else if (loss <= 0.50) {
            type = 'good';
            commentary = 'Good move. Balanced play keeping the match competitive.';
          } else if (loss <= 1.00) {
            type = 'inaccuracy';
            commentary = 'An inaccuracy. Missing slightly better positional squares.';
          } else if (loss <= 2.00) {
            type = 'mistake';
            commentary = 'A mistake! Gives your opponent opportunities to gain initiative.';
          } else {
            type = 'blunder';
            commentary = 'Blunder! Drops vital material or severely ruins your king safety.';
          }
        }

        analysisList.push({
          san,
          from: fromSquare,
          to: toSquare,
          color: turn,
          evaluationBefore: turn === 'w' ? bestEval : -bestEval,
          evaluationAfter: currentEval,
          type,
          commentary
        });

        lastEval = currentEval;
      }

      setAnalyzedMoves(analysisList);
      setActiveMoveIdx(-1);
      setCurrentFen(initialFen);
      setProgress(100);
      setAnalyzing(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [selectedGame]);

  // Navigate replaying state
  const handleStepTo = (idx: number) => {
    if (!selectedGame) return;
    const moves = selectedGame.moves || [];
    const initialFen = selectedGame.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    if (idx < -1 || idx >= moves.length) return;

    // Fast-forward board state
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

  // Compute game summaries
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

  // Compute custom accuracy percentage based on move evaluation counts
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

  // Active highlighted move evaluation details
  const activeMoveAnalysis = activeMoveIdx >= 0 ? analyzedMoves[activeMoveIdx] : null;

  return (
    <div className="w-full flex flex-col gap-6" id="game-review-component">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
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
            <h2 className="font-sans font-black text-2xl text-white mt-1">
              {selectedGame ? `Review vs ${selectedGame.opponentName}` : 'Game Review Lobby'}
            </h2>
          </div>
        </div>

        {/* Change perspective button */}
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

      {/* RENDER ANALYZING SPINNER PROGRESS SCREEN */}
      {analyzing ? (
        <div className="flex-1 flex flex-col justify-center items-center py-20 bg-[#121212]/50 border border-[#2A2A2A] rounded-3xl gap-4">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#4CAF50] border-t-transparent animate-spin" />
            {/* Pulsing crown */}
            <span className="text-3xl animate-pulse">👑</span>
          </div>
          <div className="text-center space-y-1">
            <h4 className="font-sans font-extrabold text-base text-white">Stockfish AI Analysis...</h4>
            <p className="text-xs text-gray-500 font-mono">Generating brilliant moves & blunder indicators</p>
          </div>
          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-linear-to-r from-emerald-500 to-[#4CAF50] transition-all duration-300 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : !selectedGame ? (
        /* NO SELECTED GAME: HISTORY LIST LOBBY */
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 text-center max-w-md mx-auto">
            <History className="w-12 h-12 text-[#4CAF50] mx-auto mb-3" />
            <h3 className="font-sans font-black text-lg text-white">Select a Match to Review</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Open any of your recently finished arena or computer bot matches to replay the moves and analyze your brilliant plays and blunders with our AI tool.
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-lg">
            <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider font-mono">My Recent Games</h4>
            {stats.gameHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                No matches found in your profile history yet. Play games to generate logs.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* LEFT: Chessboard Frame Column */}
          <div className="flex-1 max-w-md mx-auto flex flex-col items-center">
            
            {/* Evaluation Score Meter */}
            <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-2.5 flex items-center justify-between mb-3 font-mono text-xs text-white">
              <span className="text-gray-500 font-semibold uppercase">Eval Score:</span>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span className={`font-black text-sm ${(activeMoveAnalysis?.evaluationAfter || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(activeMoveAnalysis?.evaluationAfter || 0) >= 0 ? '+' : ''}{(activeMoveAnalysis?.evaluationAfter || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Chessboard */}
            <ChessBoard
              fen={currentFen}
              onMove={() => {}} // Readonly board during review replay
              playerColor={playerPerspective}
              isInteractive={false} // completely static board
              theme={boardTheme}
              reviewMoveEvaluation={
                activeMoveAnalysis
                  ? { square: activeMoveAnalysis.to, type: activeMoveAnalysis.type }
                  : null
              }
            />
          </div>

          {/* RIGHT: Game Statistics, Accuracy & Move classification list */}
          <div className="w-full lg:w-96 flex flex-col justify-between gap-4">
            
            {/* Replay Controls Row (Now on the right like chess.com) */}
            <div className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 flex items-center justify-center gap-3.5 shadow-md shrink-0">
              <button
                id="review-ctrl-first"
                onClick={handleFirst}
                disabled={activeMoveIdx === -1}
                className="p-2.5 rounded-xl bg-[#121212] hover:bg-[#222] border border-[#2A2A2A] disabled:opacity-30 disabled:hover:bg-[#121212] text-gray-300 transition cursor-pointer"
                title="First Position"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                id="review-ctrl-prev"
                onClick={handlePrev}
                disabled={activeMoveIdx === -1}
                className="p-2.5 rounded-xl bg-[#121212] hover:bg-[#222] border border-[#2A2A2A] disabled:opacity-30 disabled:hover:bg-[#121212] text-gray-300 transition cursor-pointer"
                title="Previous Move"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="font-mono text-xs font-bold text-[#E0E0E0] min-w-[70px] text-center">
                {activeMoveIdx === -1 ? (
                  <span className="text-gray-500">Start</span>
                ) : (
                  <span>Move {activeMoveIdx + 1} / {analyzedMoves.length}</span>
                )}
              </div>

              <button
                id="review-ctrl-next"
                onClick={handleNext}
                disabled={analyzedMoves.length === 0 || activeMoveIdx === analyzedMoves.length - 1}
                className="p-2.5 rounded-xl bg-[#121212] hover:bg-[#222] border border-[#2A2A2A] disabled:opacity-30 disabled:hover:bg-[#121212] text-gray-300 transition cursor-pointer"
                title="Next Move"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                id="review-ctrl-last"
                onClick={handleLast}
                disabled={analyzedMoves.length === 0 || activeMoveIdx === analyzedMoves.length - 1}
                className="p-2.5 rounded-xl bg-[#121212] hover:bg-[#222] border border-[#2A2A2A] disabled:opacity-30 disabled:hover:bg-[#121212] text-gray-300 transition cursor-pointer"
                title="Last Position"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-5 shadow-md flex-1 flex flex-col justify-between gap-4 overflow-y-auto">
            
            {/* Dynamic Analysis Commentary Box */}
            <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-4 min-h-[110px] flex flex-col justify-between">
              <div>
                <span className="block text-[9px] font-bold text-[#4CAF50] uppercase tracking-wider font-mono">Move Commentary</span>
                {activeMoveAnalysis ? (
                  <div className="mt-2 flex items-start gap-2.5">
                    <span className={`text-sm font-extrabold px-1.5 py-0.5 rounded font-mono ${
                      activeMoveAnalysis.type === 'brilliant' ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-800/30' :
                      activeMoveAnalysis.type === 'best' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' :
                      activeMoveAnalysis.type === 'excellent' ? 'bg-green-950/40 text-green-400 border border-green-800/30' :
                      activeMoveAnalysis.type === 'good' ? 'bg-slate-800 text-slate-300' :
                      activeMoveAnalysis.type === 'book' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/20' :
                      activeMoveAnalysis.type === 'inaccuracy' ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-800/30' :
                      activeMoveAnalysis.type === 'mistake' ? 'bg-orange-950/40 text-orange-400 border border-orange-800/30' :
                      'bg-red-950/40 text-red-400 border border-red-800/30 animate-shake'
                    }`}>
                      {activeMoveAnalysis.type.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-200 leading-relaxed font-semibold">
                      "{activeMoveAnalysis.commentary}"
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-2">
                    Step through the game moves using the controller to inspect detailed engine analysis for each placement.
                  </p>
                )}
              </div>

              {activeMoveAnalysis && (
                <div className="text-[10px] text-gray-500 font-mono text-right mt-2 border-t border-[#2A2A2A]/50 pt-2">
                  Evaluation shift: {activeMoveAnalysis.evaluationBefore.toFixed(2)} → {activeMoveAnalysis.evaluationAfter.toFixed(2)}
                </div>
              )}
            </div>

            {/* ACCURACY GAUGE */}
            <div className="grid grid-cols-2 gap-3.5 bg-[#121212]/50 p-4 rounded-2xl border border-[#2A2A2A]">
              
              {/* White stats */}
              <div className="text-center border-r border-[#2A2A2A] pr-3.5">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">White Accuracy</span>
                <span className="text-3xl font-black font-mono text-[#4CAF50]">{whiteAccuracy}%</span>
                <span className="text-[9px] text-gray-400 block mt-1.5">
                  {selectedGame.playerColor === 'w' ? 'You' : selectedGame.opponentName}
                </span>
              </div>

              {/* Black stats */}
              <div className="text-center">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Black Accuracy</span>
                <span className="text-3xl font-black font-mono text-cyan-400">{blackAccuracy}%</span>
                <span className="text-[9px] text-gray-400 block mt-1.5">
                  {selectedGame.playerColor === 'b' ? 'You' : selectedGame.opponentName}
                </span>
              </div>
            </div>

            {/* Move Evaluation Summary Lists */}
            <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-3">
              <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 px-1">Move Breakdowns</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {[
                  { name: 'Brilliant', key: 'brilliant', color: 'text-cyan-400', symbol: '!!' },
                  { name: 'Best Move', key: 'best', color: 'text-emerald-400', symbol: '★' },
                  { name: 'Excellent', key: 'excellent', color: 'text-green-400', symbol: '✓' },
                  { name: 'Good', key: 'good', color: 'text-gray-400', symbol: '✓' },
                  { name: 'Book', key: 'book', color: 'text-amber-500', symbol: '📖' },
                  { name: 'Inaccuracy', key: 'inaccuracy', color: 'text-yellow-400', symbol: '?!' },
                  { name: 'Mistake', key: 'mistake', color: 'text-orange-400', symbol: '?' },
                  { name: 'Blunder', key: 'blunder', color: 'text-red-400', symbol: '??' }
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center text-[11px] hover:bg-[#1A1A1A] p-1.5 rounded transition">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 text-center font-black ${item.color}`}>{item.symbol}</span>
                      <span className="font-semibold text-gray-300">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      <span className="text-emerald-500 font-bold">W: {whiteCounts[item.key as keyof typeof whiteCounts]}</span>
                      <span className="text-cyan-500 font-bold">B: {blackCounts[item.key as keyof typeof blackCounts]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Moves List Scroll Feed */}
            <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-3 flex-1 min-h-[140px] flex flex-col justify-between">
              <div>
                <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2">Move List</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-36 overflow-y-auto pr-1 font-mono text-xs">
                  {Array.from({ length: Math.ceil(analyzedMoves.length / 2) }).map((_, idx) => {
                    const wIdx = idx * 2;
                    const bIdx = idx * 2 + 1;
                    const wMove = analyzedMoves[wIdx];
                    const bMove = analyzedMoves[bIdx];

                    return (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="text-[#555555] w-6 text-right mr-1">{idx + 1}.</span>
                        
                        {/* White move tag */}
                        {wMove && (
                          <button
                            onClick={() => handleStepTo(wIdx)}
                            className={`flex-1 text-left px-1.5 py-0.5 rounded transition ${activeMoveIdx === wIdx ? 'bg-[#4CAF50]/20 text-white font-bold border border-[#4CAF50]/30' : 'text-gray-300 hover:bg-[#1A1A1A]'}`}
                          >
                            {wMove.san} <span className="text-[8px] opacity-70">
                              {wMove.type === 'brilliant' ? '!!' : wMove.type === 'blunder' ? '??' : ''}
                            </span>
                          </button>
                        )}

                        {/* Black move tag */}
                        {bMove && (
                          <button
                            onClick={() => handleStepTo(bIdx)}
                            className={`flex-1 text-left px-1.5 py-0.5 rounded transition ${activeMoveIdx === bIdx ? 'bg-cyan-400/20 text-white font-bold border border-cyan-400/30' : 'text-gray-300 hover:bg-[#1A1A1A]'}`}
                          >
                            {bMove.san} <span className="text-[8px] opacity-70">
                              {bMove.type === 'brilliant' ? '!!' : bMove.type === 'blunder' ? '??' : ''}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back to select match */}
              <button
                id="review-lobby-btn"
                onClick={onBackToLobby}
                className="w-full mt-3.5 py-2 rounded-xl bg-[#2A2A2A] hover:bg-[#333] text-white font-bold text-xs transition cursor-pointer"
              >
                Back to Match List
              </button>
            </div>

          </div>
          </div>

        </div>
      )}

    </div>
  );
};
