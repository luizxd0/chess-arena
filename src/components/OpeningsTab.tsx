import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { BookOpen, Award, ArrowLeft, Lightbulb, Play, CheckCircle2, ChevronRight, HelpCircle, RefreshCw } from 'lucide-react';
import { ChessBoard, BoardTheme } from './ChessBoard';
import { openingsList } from '../utils/openingsData';
import { chessAudio } from '../utils/audio';
import { UserStats, Opening, OpeningVariation } from '../types';

interface OpeningsTabProps {
  stats: UserStats;
  onUpdateStats: (updater: (prev: UserStats) => UserStats) => void;
  boardTheme: BoardTheme;
  onGameActiveChange?: (active: boolean) => void;
}

export const OpeningsTab: React.FC<OpeningsTabProps> = ({ stats, onUpdateStats, boardTheme, onGameActiveChange }) => {
  const [selectedOpening, setSelectedOpening] = useState<Opening | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<OpeningVariation | null>(null);
  const [showMobileChecklist, setShowMobileChecklist] = useState(false);
  
  // Trainer gameplay state
  const [game, setGame] = useState<Chess | null>(null);

  useEffect(() => {
    onGameActiveChange?.(game !== null);
  }, [game, onGameActiveChange]);
  const [fen, setFen] = useState('');
  const [lastMove, setLastMove] = useState<{from: string, to: string} | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // active move index in variation.moves
  const [coachTip, setCoachTip] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Initialize a training session
  const startTraining = (opening: Opening, variation: OpeningVariation) => {
    const chess = new Chess();
    setGame(chess);
    setFen(chess.fen());
    setLastMove(null);
    setSelectedOpening(opening);
    setSelectedVariation(variation);
    setCurrentStep(0);
    setIsCompleted(false);
    setShowHint(false);
    setShowMobileChecklist(false);
    setFeedback({ type: 'info', text: "Let's begin! Make the first move of the variation." });

    // Set first move coach tip
    setCoachTip(variation.tips[0] || 'Make the first move to develop your pieces.');

    // If we are playing Black, the engine (White) must play the first move immediately!
    if (opening.side === 'b') {
      const firstMoveStr = variation.moves[0]; // e.g. "e4"
      setTimeout(() => {
        const firstMoveObj = chess.move(firstMoveStr);
        setFen(chess.fen());
        setLastMove({ from: firstMoveObj.from, to: firstMoveObj.to });
        setCurrentStep(1);
        chessAudio.playMove();
        setCoachTip(variation.tips[1] || 'Respond in the center!');
      }, 800);
    }
  };

  const handleMoveAttempt = (from: string, to: string, promotion?: string) => {
    if (!game || !selectedVariation || isCompleted) return;

    // Check if the move is legal in chess
    const sandboxChess = new Chess(game.fen());
    let playedMoveObj: any = null;
    try {
      playedMoveObj = sandboxChess.move({ from, to, promotion: promotion || 'q' });
    } catch (e) {
      // Illegal chess move
      setFeedback({ type: 'error', text: "Illegal move. Try a valid chess move!" });
      return;
    }

    if (!playedMoveObj) return;

    // Verify if this move matches the expected theory move at currentStep
    const expectedMoveSAN = selectedVariation.moves[currentStep];
    const isTheoryCorrect = playedMoveObj.san === expectedMoveSAN;

    if (!isTheoryCorrect) {
      // Correct chess move but WRONG theory move!
      setFeedback({
        type: 'error',
        text: `Oops! "${playedMoveObj.san}" is a valid move, but not the theoretical continuation for this variation. We expected "${expectedMoveSAN}".`
      });
      return;
    }

    // Theory is correct! Apply move
    game.move({ from, to, promotion: promotion || 'q' });
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setFen(game.fen());
    setLastMove({ from, to });
    setShowHint(false);

    // Audio
    if (playedMoveObj.captured) {
      chessAudio.playCapture();
    } else {
      chessAudio.playMove();
    }

    // Set feedback and next tip
    setFeedback({ type: 'success', text: `Excellent! "${playedMoveObj.san}" is correct.` });
    
    // Check if the opening is finished
    if (nextStep >= selectedVariation.moves.length) {
      triggerCompletion();
      return;
    }

    // Set next coach tip
    setCoachTip(selectedVariation.tips[nextStep] || 'Keep developing!');

    // Since the player played their move, if there is another move in the sequence and it's the engine's turn, play it!
    const isEngineTurn = (selectedOpening?.side === 'w' && nextStep % 2 === 1) || 
                         (selectedOpening?.side === 'b' && nextStep % 2 === 0);

    if (isEngineTurn && nextStep < selectedVariation.moves.length) {
      const engineMoveSAN = selectedVariation.moves[nextStep];
      
      setTimeout(() => {
        const engineMoveObj = game.move(engineMoveSAN);
        const engineStep = nextStep + 1;
        setCurrentStep(engineStep);
        setFen(game.fen());
        setLastMove({ from: engineMoveObj.from, to: engineMoveObj.to });

        if (engineMoveObj.captured) {
          chessAudio.playCapture();
        } else {
          chessAudio.playMove();
        }

        if (game.inCheck()) {
          chessAudio.playCheck();
        }

        // Check if finished
        if (engineStep >= selectedVariation.moves.length) {
          triggerCompletion();
          return;
        }

        setCoachTip(selectedVariation.tips[engineStep] || 'Your turn to move!');
      }, 900);
    }
  };

  const triggerCompletion = () => {
    setIsCompleted(true);
    setFeedback({ type: 'success', text: "🎉 Outstanding! You successfully completed this opening variation!" });
    setCoachTip("Congratulations! You have mastered this theoretical line. You can now practice it vs bots!");
    chessAudio.playGameOver(true);

    // Persist completed opening to player stats
    if (selectedOpening) {
      const openingId = selectedOpening.id;
      onUpdateStats(prev => {
        if (prev.completedOpenings.includes(openingId)) return prev;
        return {
          ...prev,
          completedOpenings: [...prev.completedOpenings, openingId]
        };
      });
    }
  };

  const handleShowHint = () => {
    setShowHint(true);
    if (!selectedVariation || !game) return;
    
    // Get the next expected move
    const expectedMoveSAN = selectedVariation.moves[currentStep];
    setFeedback({
      type: 'info',
      text: `Hint: The expected theory move is "${expectedMoveSAN}". Search for a way to play it!`
    });
  };

  const handleResetTrainer = () => {
    if (selectedOpening && selectedVariation) {
      startTraining(selectedOpening, selectedVariation);
    }
  };

  const handleExitTrainer = () => {
    setGame(null);
    setLastMove(null);
    setSelectedVariation(null);
    setShowMobileChecklist(false);
  };

  const getHintSquares = (): { from: string; to: string } | null => {
    if (!game || !selectedVariation) return null;
    const expectedMoveSAN = selectedVariation.moves[currentStep];
    if (!expectedMoveSAN) return null;
    
    // Create a clone to safely fetch coordinates from SAN move
    const tempChess = new Chess(game.fen());
    try {
      const moveObj = tempChess.move(expectedMoveSAN);
      if (moveObj) {
        return { from: moveObj.from, to: moveObj.to };
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const hintMove = showHint ? getHintSquares() : null;

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      
      {/* 1. SELECTION SCREEN */}
      {!game && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-2">
          {/* Header hero */}
          <div className="relative text-center py-4 px-4 rounded-3xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#E0E0E0] shadow-md overflow-hidden mb-4 shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#4CAF50]/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-center gap-4">
              <BookOpen className="w-8 h-8 text-[#4CAF50]" />
              <div className="text-left">
                <h2 className="font-sans font-bold text-2xl tracking-tight text-white leading-none">Chess Openings Coach</h2>
                <p className="text-[#888888] text-xs mt-1">
                  Master core opening principles and practice historical lines move-by-move.
                </p>
              </div>
            </div>
          </div>

          {/* Openings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 content-start pb-2">
            {openingsList.map((opening) => {
              const isLearned = stats.completedOpenings.includes(opening.id);
              return (
                <div
                  key={opening.id}
                  id={`opening-card-${opening.id}`}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-3 shadow-md flex flex-col justify-between transition duration-200"
                >
                  <div>
                    <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${opening.difficulty === 'Beginner' ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/30' : opening.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-900/30'}`}>
                        {opening.difficulty}
                      </span>
                      <span className="text-[9px] font-bold font-mono bg-[#121212] border border-[#2A2A2A] text-[#888888] px-1.5 py-0.5 rounded-full">
                        Play as: {opening.side === 'w' ? 'White ⚪' : 'Black ⚫'}
                      </span>
                      {isLearned && (
                        <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" /> Learned
                        </span>
                      )}
                    </div>
                    <h3 className="font-sans font-extrabold text-sm text-white leading-none mb-1">{opening.name}</h3>
                    <p className="text-[10px] text-[#888888] leading-tight line-clamp-2 mb-2">{opening.description}</p>
                  </div>

                  {/* Variations selector list */}
                  <div className="border-t border-[#2A2A2A] pt-2 space-y-1">
                    <span className="text-[9px] font-bold text-[#666666] uppercase tracking-wider mb-0.5 px-1 block">Variations</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {opening.variations.map((v, idx) => (
                        <button
                          key={idx}
                          id={`var-btn-${opening.id}-${idx}`}
                          onClick={() => startTraining(opening, v)}
                          className="w-full text-left p-1.5 rounded-lg text-[10px] font-semibold text-[#888888] hover:text-[#4CAF50] bg-[#121212] border border-[#2A2A2A] hover:bg-[#2A2A2A] flex items-center justify-between group transition cursor-pointer"
                        >
                          <span className="truncate pr-1">{v.name}</span>
                          <ChevronRight className="w-3 h-3 text-[#666666] group-hover:text-[#4CAF50] transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. INTERACTIVE TRAINING VIEW */}
      {game && selectedOpening && selectedVariation && (
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch flex-1 min-h-0 overflow-hidden md:overflow-y-auto pb-1 md:pb-2">
          
          {/* Left Side: Coach Speech Bubble & Chessboard Column */}
          <div className="flex-1 w-full max-w-md mx-auto flex flex-col items-center justify-center gap-1.5 md:gap-3 min-h-0 md:shrink-0">
            
            {/* Top exit and counter bar */}
            <div className="w-full flex justify-between items-center select-none">
              <button
                id="exit-trainer-btn"
                onClick={handleExitTrainer}
                className="text-xs font-bold text-[#888888] hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Exit Training
              </button>
              
              <div className="text-[10px] md:text-xs font-bold text-[#4CAF50] bg-[#4CAF50]/10 border border-[#388E3C]/20 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full">
                Theory Move: {currentStep} of {selectedVariation.moves.length}
              </div>
            </div>

            {/* Coach Speech Balloon Card */}
            <div className="w-full bg-[#1A1A1A] max-md:bg-transparent max-md:border-none max-md:shadow-none max-md:p-1 p-3.5 border border-[#2A2A2A] rounded-2xl shadow-md flex items-start gap-2 relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#4CAF50]/5 rounded-full blur-2xl pointer-events-none" />
              {/* Coach Avatar */}
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-[#121212] border border-[#388E3C]/30 flex items-center justify-center text-base md:text-2xl shrink-0 shadow-inner relative">
                🎓
                <span className="absolute bottom-0 right-0 w-2 h-2 md:w-3.5 md:h-3.5 bg-[#4CAF50] border-2 border-[#1A1A1A] rounded-full" />
              </div>
              {/* Speech Balloon Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5 md:mb-1.5">
                  <span className="font-sans font-black text-xs text-white">Grandmaster Coach</span>
                  <span className="text-[8px] md:text-[9px] text-[#4CAF50] font-bold uppercase tracking-wider bg-[#4CAF50]/10 px-1.5 py-0.5 rounded-sm">AI Tutor</span>
                </div>
                {/* Speech balloon styled text bubble */}
                <div className="relative bg-[#121212] border border-[#2A2A2A] rounded-xl p-1.5 md:p-2.5 text-[10px] md:text-xs text-[#E0E0E0] font-medium leading-relaxed">
                  <div className="absolute top-2 md:top-3 -left-1 w-2 h-2 md:w-3 md:h-3 bg-[#121212] border-l border-b border-[#2A2A2A] rotate-45" />
                  <p>{coachTip}</p>
                </div>
              </div>
            </div>

            {/* Dynamic Feedback Banner */}
            {feedback && (
              <div className={`w-full p-1.5 md:p-2.5 rounded-xl text-[10px] md:text-xs flex items-center gap-2 border select-none ${feedback.type === 'success' ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#388E3C]/30' : feedback.type === 'error' ? 'bg-red-950/20 text-red-400 border-red-900/30' : 'bg-[#121212] text-amber-400 border-amber-500/20'}`}>
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#4CAF50] shrink-0" />
                ) : (
                  <Lightbulb className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500 shrink-0" />
                )}
                <p className="font-semibold leading-none">{feedback.text}</p>
              </div>
            )}

            {/* Chessboard (With green coaching arrow support) */}
            <ChessBoard
              fen={fen}
              lastMove={lastMove}
              onMove={handleMoveAttempt}
              playerColor={selectedOpening.side}
              isInteractive={!isCompleted && game.turn() === selectedOpening.side}
              theme={boardTheme}
              hintMove={hintMove}
            />

            {/* Live Buttons - Desktop & Mobile version */}
            <div className="w-full max-w-md grid grid-cols-3 gap-2 mt-1 md:mt-3">
              <button
                onClick={handleShowHint}
                disabled={isCompleted}
                className="py-1.5 md:py-2 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[10px] md:text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-1 md:gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <Lightbulb className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" /> Hint
              </button>
              <button
                onClick={handleResetTrainer}
                className="py-1.5 md:py-2 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[10px] md:text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-1 md:gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" /> Restart
              </button>
              <button
                onClick={() => setShowMobileChecklist(true)}
                className="py-1.5 md:py-2 lg:hidden rounded-xl border border-[#4CAF50]/30 bg-[#4CAF50]/5 hover:bg-[#4CAF50]/10 text-[10px] md:text-xs font-bold text-[#4CAF50] flex items-center justify-center gap-1 md:gap-1.5 transition cursor-pointer"
              >
                <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5 animate-pulse" />
                Theory
              </button>
            </div>
          </div>

          {/* Right Side: Theoretical Moves List & Control Buttons (Desktop Only) */}
          <div className="hidden md:flex w-full md:w-80 flex-col justify-between bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 shadow-md h-full min-h-0">
            <div className="space-y-4 flex flex-col min-h-0">
              {/* Header */}
              <div className="border-b border-[#2A2A2A] pb-3 shrink-0">
                <span className="block text-[9px] font-bold text-[#4CAF50] uppercase tracking-wider">Opening Line</span>
                <h4 className="font-sans font-extrabold text-sm text-white">{selectedOpening.name}</h4>
                <p className="text-[10px] text-[#888888] italic truncate">{selectedVariation.name}</p>
              </div>

              {/* Theoretical moves checklist */}
              <div className="space-y-1.5 flex flex-col min-h-0 flex-1">
                <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider shrink-0">Theoretical Moves</span>
                <div className="overflow-y-auto border border-[#2A2A2A] rounded-xl p-2.5 space-y-1 bg-[#121212] flex-1">
                  {selectedVariation.moves.map((move, idx) => {
                    const isPlayed = idx < currentStep;
                    const isActive = idx === currentStep;
                    const isWhiteMove = idx % 2 === 0;
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-[#2A2A2A] text-[#4CAF50] border border-[#4CAF50]/35 font-extrabold shadow-sm' : isPlayed ? 'text-[#666]' : 'text-[#888]'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] opacity-60">
                            {isWhiteMove ? `${Math.floor(idx / 2) + 1}.W` : `${Math.floor(idx / 2) + 1}.B`}
                          </span>
                          <span>{move}</span>
                        </div>
                        {isPlayed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4CAF50]" />
                        ) : isActive ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-ping" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Buttons: Hint / Retry */}
            <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-[#2A2A2A] shrink-0">
              <button
                id="show-hint-btn"
                onClick={handleShowHint}
                disabled={isCompleted}
                className="py-2.5 rounded-xl border border-[#2A2A2A] hover:bg-[#2A2A2A] text-xs font-bold text-[#888888] hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <Lightbulb className="w-4 h-4 text-amber-500" /> Show Hint
              </button>
              <button
                id="retry-trainer-btn"
                onClick={handleResetTrainer}
                className="py-2.5 rounded-xl bg-[#2A2A2A] hover:bg-[#333333] border border-[#2A2A2A] text-[#E0E0E0] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Restart
              </button>
            </div>
          </div>

          {/* Mobile Overlay for Moves Checklist */}
          {showMobileChecklist && (
            <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col p-4 animate-fade-in lg:hidden">
              <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3 mb-4">
                <span className="font-sans font-bold text-sm text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#4CAF50]" />
                  Theoretical Moves Checklist
                </span>
                <button
                  onClick={() => setShowMobileChecklist(false)}
                  className="px-3 py-1 text-xs font-bold bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition"
                >
                  Back to Board
                </button>
              </div>

              <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 overflow-y-auto">
                <div className="border-b border-[#2A2A2A] pb-3 mb-4">
                  <span className="block text-[9px] font-bold text-[#4CAF50] uppercase tracking-wider">Opening Line</span>
                  <h4 className="font-sans font-extrabold text-sm text-white">{selectedOpening.name}</h4>
                  <p className="text-[10px] text-[#888888] italic truncate">{selectedVariation.name}</p>
                </div>

                <span className="block text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2">Theoretical Moves</span>
                <div className="space-y-1 bg-[#121212] p-2.5 border border-[#2A2A2A] rounded-xl">
                  {selectedVariation.moves.map((move, idx) => {
                    const isPlayed = idx < currentStep;
                    const isActive = idx === currentStep;
                    const isWhiteMove = idx % 2 === 0;
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-lg transition-colors ${isActive ? 'bg-[#2A2A2A] text-[#4CAF50] border border-[#4CAF50]/35 font-extrabold shadow-sm' : isPlayed ? 'text-[#666]' : 'text-[#888]'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] opacity-60">
                            {isWhiteMove ? `${Math.floor(idx / 2) + 1}.W` : `${Math.floor(idx / 2) + 1}.B`}
                          </span>
                          <span>{move}</span>
                        </div>
                        {isPlayed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4CAF50]" />
                        ) : isActive ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-ping" />
                        ) : (
                          <HelpCircle className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
