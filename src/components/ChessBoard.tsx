import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { RenderPiece } from './ChessPieces';
import { chessAudio } from '../utils/audio';
import { getMaterialDifference } from '../utils/chessAI';

export type BoardTheme = 'elegant' | 'emerald' | 'wood' | 'cyber' | 'royal';

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string, promotion?: string) => void;
  playerColor?: 'w' | 'b';
  isInteractive?: boolean;
  theme?: BoardTheme;
  hintMove?: { from: string; to: string } | null;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  onMove,
  playerColor = 'w',
  isInteractive = true,
  theme = 'elegant',
  hintMove = null
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [draggedSquare, setDraggedSquare] = useState<string | null>(null);
  const [promoPending, setPromoPending] = useState<{ from: string; to: string } | null>(null);

  const chess = new Chess(fen);
  const board = chess.board();
  const turn = chess.turn();
  const activeColor = turn === 'w' ? 'White' : 'Black';

  // Helper to convert algebraic square (e.g. 'e2') to SVG coordinate percent (0-100)
  const getSquareCoords = (sq: string) => {
    if (!sq || sq.length !== 2) return { x: 0, y: 0 };
    const col = sq.charCodeAt(0) - 97; // 'a' = 0, 'h' = 7
    const row = 8 - parseInt(sq[1], 10); // '8' = 0, '1' = 7

    // Visual placement inside the 8x8 grid based on perspective
    const visualCol = playerColor === 'b' ? 7 - col : col;
    const visualRow = playerColor === 'b' ? 7 - row : row;

    // Center coordinates inside a 100x100 viewBox
    const x = (visualCol + 0.5) * (100 / 8);
    const y = (visualRow + 0.5) * (100 / 8);

    return { x, y };
  };

  const hintCoords = hintMove ? {
    from: getSquareCoords(hintMove.from),
    to: getSquareCoords(hintMove.to)
  } : null;

  // Find King in check for red highlighting
  let kingInCheckSquare: string | null = null;
  if (chess.inCheck()) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq && sq.type === 'k' && sq.color === turn) {
          kingInCheckSquare = `${String.fromCharCode(97 + c)}${8 - r}`;
          break;
        }
      }
      if (kingInCheckSquare) break;
    }
  }

  // Get last move squares from chess history to highlight
  const history = chess.history({ verbose: true });
  const lastMove = history[history.length - 1];
  const lastFrom = lastMove?.from;
  const lastTo = lastMove?.to;

  // Material evaluation and captures
  const materialData = getMaterialDifference(fen);

  // Themes mapping
  const themeClasses: Record<BoardTheme, { light: string; dark: string; border: string }> = {
    elegant: {
      light: 'bg-[#EAE9D2] text-[#4B7399]',
      dark: 'bg-[#4B7399] text-[#EAE9D2]',
      border: 'border-[#2A2A2A]'
    },
    emerald: {
      light: 'bg-[#eeeed2] text-[#769656]',
      dark: 'bg-[#769656] text-[#eeeed2]',
      border: 'border-[#4e6a32]'
    },
    wood: {
      light: 'bg-[#f0d9b5] text-[#b58863]',
      dark: 'bg-[#b58863] text-[#f0d9b5]',
      border: 'border-[#8e613c]'
    },
    cyber: {
      light: 'bg-[#334155] text-[#38bdf8]',
      dark: 'bg-[#0f172a] text-[#1e293b]',
      border: 'border-[#0284c7]'
    },
    royal: {
      light: 'bg-[#fafaf9] text-[#7c2d12]',
      dark: 'bg-[#7c2d12] text-[#fafaf9]',
      border: 'border-[#ea580c]'
    }
  };

  const currentTheme = themeClasses[theme];

  // Map indexes based on flipped state
  const getSquareName = (row: number, col: number): string => {
    const actualRow = playerColor === 'b' ? row + 1 : 8 - row;
    const actualCol = playerColor === 'b' ? 8 - col - 1 : col;
    return `${String.fromCharCode(97 + actualCol)}${actualRow}`;
  };

  const getSquareData = (squareName: string) => {
    const col = squareName.charCodeAt(0) - 97;
    const row = 8 - parseInt(squareName[1]);
    return board[row]?.[col] || null;
  };

  // Click handler
  const handleSquareClick = (squareName: string) => {
    if (!isInteractive) return;

    // Must match turn with player color if set
    if (chess.turn() !== playerColor) return;

    const piece = getSquareData(squareName);

    // If a possible move square is clicked, make the move
    if (possibleMoves.includes(squareName) && selectedSquare) {
      triggerMoveAttempt(selectedSquare, squareName);
      return;
    }

    // Select piece
    if (piece && piece.color === playerColor) {
      setSelectedSquare(squareName);
      const moves = chess.moves({ square: squareName as Square, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  // Standard or promotion move trigger
  const triggerMoveAttempt = (from: string, to: string) => {
    const piece = getSquareData(from);
    
    // Check if it's a promotion move (Pawn reaching 8th rank)
    const isPawn = piece && piece.type === 'p';
    const reachedEndRank = to.endsWith('8') || to.endsWith('1');
    
    if (isPawn && reachedEndRank) {
      setPromoPending({ from, to });
    } else {
      onMove(from, to);
      clearSelection();
    }
  };

  const handlePromotionSelect = (pieceType: string) => {
    if (promoPending) {
      onMove(promoPending.from, promoPending.to, pieceType);
      setPromoPending(null);
      clearSelection();
    }
  };

  const clearSelection = () => {
    setSelectedSquare(null);
    setPossibleMoves([]);
  };

  // Drag and drop handlers (for PC support)
  const handleDragStart = (e: React.DragEvent, squareName: string) => {
    if (!isInteractive || chess.turn() !== playerColor) {
      e.preventDefault();
      return;
    }
    const piece = getSquareData(squareName);
    if (!piece || piece.color !== playerColor) {
      e.preventDefault();
      return;
    }
    setDraggedSquare(squareName);
    const moves = chess.moves({ square: squareName as Square, verbose: true });
    setPossibleMoves(moves.map(m => m.to));
    setSelectedSquare(squareName);
  };

  const handleDragOver = (e: React.DragEvent, squareName: string) => {
    if (possibleMoves.includes(squareName)) {
      e.preventDefault(); // allow drop
    }
  };

  const handleDrop = (e: React.DragEvent, squareName: string) => {
    e.preventDefault();
    if (draggedSquare && possibleMoves.includes(squareName)) {
      triggerMoveAttempt(draggedSquare, squareName);
    }
    setDraggedSquare(null);
  };

  // Cancel promo when clicking backdrop
  const handlePromoCancel = () => {
    setPromoPending(null);
    clearSelection();
  };

  // Helper to render columns and rows indexes elegantly
  const renderRowLabel = (rowIdx: number) => {
    const label = playerColor === 'b' ? rowIdx + 1 : 8 - rowIdx;
    return (
      <span className="absolute top-1 left-1 text-[10px] md:text-[11px] font-semibold opacity-70">
        {label}
      </span>
    );
  };

  const renderColLabel = (colIdx: number) => {
    const label = String.fromCharCode(97 + (playerColor === 'b' ? 8 - colIdx - 1 : colIdx));
    return (
      <span className="absolute bottom-1 right-1 text-[10px] md:text-[11px] font-semibold opacity-70">
        {label}
      </span>
    );
  };

  return (
    <div id="chess-board-wrapper" className="flex flex-col w-full max-w-md mx-auto select-none">
      
      {/* Top Captured Bar (Black captured pieces if White is at bottom) */}
      <div className="flex items-center justify-between px-2 py-1 mb-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 min-h-[24px]">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Captured:</span>
          <div className="flex items-center gap-0.5 scale-90 origin-left">
            {(playerColor === 'w' ? materialData.capturedBlack : materialData.capturedWhite).map((piece, i) => (
              <span key={i} className="text-xl leading-none font-sans" title={piece}>
                {piece === 'p' || piece === 'P' ? '♟' : piece === 'n' || piece === 'N' ? '♞' : piece === 'b' || piece === 'B' ? '♝' : piece === 'r' || piece === 'R' ? '♜' : '♛'}
              </span>
            ))}
          </div>
        </div>
        {materialData.diff !== 0 && (
          <div className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
            {playerColor === 'w' 
              ? (materialData.diff > 0 ? `+${materialData.diff}` : materialData.diff)
              : (materialData.diff < 0 ? `+${Math.abs(materialData.diff)}` : -materialData.diff)}
          </div>
        )}
      </div>

      {/* Main Board Container */}
      <div className={`relative w-full aspect-square border-4 ${currentTheme.border} rounded-xl overflow-hidden shadow-2xl`}>
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
          {Array.from({ length: 8 }).map((_, rowIdx) => {
            return Array.from({ length: 8 }).map((_, colIdx) => {
              // Adjust rows/cols for flipped view
              const actualRow = playerColor === 'b' ? 7 - rowIdx : rowIdx;
              const actualCol = playerColor === 'b' ? 7 - colIdx : colIdx;
              const squareName = getSquareName(actualRow, actualCol);
              const isDark = (actualRow + actualCol) % 2 === 1;
              const piece = board[actualRow][actualCol];

              const isSelected = selectedSquare === squareName;
              const isPossible = possibleMoves.includes(squareName);
              const isLastMoveSrc = lastFrom === squareName;
              const isLastMoveDst = lastTo === squareName;
              const isKingInCheck = kingInCheckSquare === squareName;

              // Grid styling logic
              let squareBg = isDark ? currentTheme.dark : currentTheme.light;
              let squareContentColor = isDark ? 'text-gray-200' : 'text-gray-800';

              if (isLastMoveSrc || isLastMoveDst) {
                squareBg = theme === 'cyber' ? 'bg-[#0284c7]/40 border-2 border-[#38bdf8]/60' : 'bg-[#facc15]/30';
              }
              if (isSelected) {
                squareBg = 'bg-[#60a5fa]/50 border-2 border-blue-500';
              }

              return (
                <div
                  id={`square-${squareName}`}
                  key={squareName}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${squareBg} ${squareContentColor}`}
                  onClick={() => handleSquareClick(squareName)}
                  onDragOver={(e) => handleDragOver(e, squareName)}
                  onDrop={(e) => handleDrop(e, squareName)}
                >
                  {/* Row/Col Labels on Borders */}
                  {colIdx === 0 && renderRowLabel(actualRow)}
                  {rowIdx === 7 && renderColLabel(actualCol)}

                  {/* Red flashing overlay for King in Check */}
                  {isKingInCheck && (
                    <div className="absolute inset-0 bg-red-600/45 animate-pulse" />
                  )}

                  {/* Render Chess Piece */}
                  {piece && (
                    <div
                      id={`piece-${squareName}`}
                      draggable={isInteractive && chess.turn() === playerColor && piece.color === playerColor}
                      onDragStart={(e) => handleDragStart(e, squareName)}
                      className={`w-[85%] h-[85%] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10 drop-shadow-[0_3px_3px_rgba(0,0,0,0.5)]`}
                    >
                      <RenderPiece type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Render Possible Move Indicator */}
                  {isPossible && (
                    <div className="absolute flex items-center justify-center w-full h-full z-20 pointer-events-none">
                      {piece ? (
                        // Ring for captures
                        <div className="w-[82%] h-[82%] rounded-full border-[3.5px] border-amber-500/70" />
                      ) : (
                        // Dot for quiet moves
                        <div className="w-[28%] h-[28%] rounded-full bg-[#10b981]/80" />
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })}
        </div>

        {/* Draw Hint Arrow overlay */}
        {hintCoords && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 100 100">
            <defs>
              <marker
                id="hint-arrowhead"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 7.5 5 L 0 8 z" fill="#10B981" />
              </marker>
            </defs>
            {/* Draw a subtle highlighted line under the arrow for separation */}
            <line
              x1={hintCoords.from.x}
              y1={hintCoords.from.y}
              x2={hintCoords.to.x}
              y2={hintCoords.to.y}
              stroke="#064e3b"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.35"
            />
            {/* Main Green Arrow */}
            <line
              x1={hintCoords.from.x}
              y1={hintCoords.from.y}
              x2={hintCoords.to.x}
              y2={hintCoords.to.y}
              stroke="#10B981"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.92"
              markerEnd="url(#hint-arrowhead)"
            />
          </svg>
        )}

        {/* Promotion Modal Overlay */}
        {promoPending && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl max-w-xs text-center">
              <h3 className="font-sans font-bold text-lg mb-1 text-gray-900 dark:text-white">Promote Pawn</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose a piece to promote your pawn to:</p>
              
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'q', name: 'Queen' },
                  { id: 'r', name: 'Rook' },
                  { id: 'b', name: 'Bishop' },
                  { id: 'n', name: 'Knight' }
                ].map((option) => (
                  <button
                    key={option.id}
                    id={`promo-btn-${option.id}`}
                    onClick={() => handlePromotionSelect(option.id)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-100 hover:bg-amber-100 dark:bg-slate-700 dark:hover:bg-amber-950/40 border border-gray-200 dark:border-slate-600 transition"
                  >
                    <div className="w-12 h-12 flex items-center justify-center">
                      <RenderPiece type={option.id} color={playerColor} />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold text-gray-700 dark:text-gray-300">{option.name}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handlePromoCancel}
                className="mt-4 px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Captured Bar (White captured pieces if White is at bottom) */}
      <div className="flex items-center justify-between px-2 py-1 mt-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 min-h-[24px]">
          <span className="font-semibold text-gray-500 dark:text-gray-400">Captured:</span>
          <div className="flex items-center gap-0.5 scale-90 origin-left">
            {(playerColor === 'w' ? materialData.capturedWhite : materialData.capturedBlack).map((piece, i) => (
              <span key={i} className="text-xl leading-none font-sans" title={piece}>
                {piece === 'p' || piece === 'P' ? '♟' : piece === 'n' || piece === 'N' ? '♞' : piece === 'b' || piece === 'B' ? '♝' : piece === 'r' || piece === 'R' ? '♜' : '♛'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex justify-between items-center mt-3 text-xs px-1 text-gray-500 dark:text-gray-400 font-medium">
        <div>
          <span>Turn: </span>
          <span className={`font-bold px-1.5 py-0.5 rounded-md ${chess.turn() === 'w' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
            {activeColor}
          </span>
        </div>
        <div>
          <span>Flipped: </span>
          <span className="font-mono text-gray-600 dark:text-gray-300">{playerColor === 'w' ? 'White perspective' : 'Black perspective'}</span>
        </div>
      </div>
    </div>
  );
};
