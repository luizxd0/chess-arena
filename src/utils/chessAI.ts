import { Chess } from 'chess.js';
import { Bot } from '../types';

// Custom Piece-Square Tables for evaluation
// Evaluates positions from White's perspective (mirrored for Black)
const pawnTable = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightTable = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopTable = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookTable = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenTable = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

// Middlegame King safety table
const kingTableMiddle = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

export const botsList: Bot[] = [
  {
    id: 'martin',
    name: 'Martin (Lvl 1)',
    avatar: '👴',
    rating: 250,
    tier: 'Beginner',
    personality: 'Friendly grandfather learning chess with his grandchildren. Frequently blunders but always cheerful.',
    blunderRate: 0.50,
    depth: 1,
    greeting: "Hey there! I'm just learning, so let's have a fun game!",
    winPhrase: "Oh, look at that! I somehow managed to win. Good game!",
    lossPhrase: "Well played! My grandkids would be proud of you."
  },
  {
    id: 'elspeth',
    name: 'Elspeth (Lvl 2)',
    avatar: '👩‍🎤',
    rating: 400,
    tier: 'Beginner',
    personality: 'A creative punk rocker who loves wild tactical jumps and quick moves.',
    blunderRate: 0.40,
    depth: 1,
    greeting: "Let's see what you got! I've been practicing my tactical patterns.",
    winPhrase: "Aha! That tactic worked perfectly!",
    lossPhrase: "Ouch! You completely outplayed me there. Let's play again!"
  },
  {
    id: 'sven',
    name: 'Sven (Lvl 3)',
    avatar: '🧔',
    rating: 600,
    tier: 'Beginner',
    personality: 'A friendly Viking who likes broad, simple attacks and hates defending.',
    blunderRate: 0.32,
    depth: 2,
    greeting: "To battle! I hope you brought your shield because I play to attack!",
    winPhrase: "Valhalla! Victory is mine today!",
    lossPhrase: "You defended valiantly. A good match, my friend."
  },
  {
    id: 'anya',
    name: 'Anya (Lvl 4)',
    avatar: '👩‍🎨',
    rating: 800,
    tier: 'Beginner',
    personality: 'An artistic soul who plays visually pleasing, balanced setups.',
    blunderRate: 0.25,
    depth: 2,
    greeting: "Hello. Let's create a beautiful game together. Chess is a canvas.",
    winPhrase: "The geometry of the board aligned beautifully for me.",
    lossPhrase: "A beautiful masterpiece on your part. Your combination was splendid."
  },
  {
    id: 'nelson',
    name: 'Nelson (Lvl 5)',
    avatar: '🕺',
    rating: 1000,
    tier: 'Beginner',
    personality: 'Infamous for bringing his Queen out early on move 2. Survive his early attacks to win.',
    blunderRate: 0.18,
    depth: 2,
    greeting: "Hope you're ready! Prepare to face the wrath of my favorite piece: the Queen!",
    winPhrase: "My Queen reigns supreme! Better luck next time.",
    lossPhrase: "No! My Queen got trapped... Excellent defense, you earned this."
  },
  {
    id: 'emir',
    name: 'Emir (Lvl 6)',
    avatar: '👳',
    rating: 1100,
    tier: 'Intermediate',
    personality: 'A wise merchant who calculates slowly but solidifies his center.',
    blunderRate: 0.15,
    depth: 3,
    greeting: "Greetings. Let us trade strategies. I value a strong center pawn above all.",
    winPhrase: "A successful transaction. My pawns held the line.",
    lossPhrase: "Ah, you drove a hard bargain and broke my defense. Well played."
  },
  {
    id: 'isabella',
    name: 'Isabella (Lvl 7)',
    avatar: '👸',
    rating: 1200,
    tier: 'Intermediate',
    personality: 'A royal tactician who loves sharp lines and royal pins.',
    blunderRate: 0.12,
    depth: 3,
    greeting: "Welcome. You are playing against royal strategy today. Let us begin.",
    winPhrase: "Checkmate is the law of the land.",
    lossPhrase: "A magnificent rebellion. You have won my deepest respect."
  },
  {
    id: 'david',
    name: 'David (Lvl 8)',
    avatar: '👨‍⚕️',
    rating: 1300,
    tier: 'Intermediate',
    personality: 'Diagnostic and analytical. He meticulously scans the board for structural weaknesses.',
    blunderRate: 0.10,
    depth: 3,
    greeting: "Let's perform a diagnostic check on your chess skills. No blunders, please.",
    winPhrase: "I diagnosed a weakness in your king safety and treated it.",
    lossPhrase: "Fascinating. You isolated my pawn structure perfectly. Clean win."
  },
  {
    id: 'beth',
    name: 'Beth (Lvl 9)',
    avatar: '👩‍💼',
    rating: 1450,
    tier: 'Intermediate',
    personality: 'Extremely patient, positional player who builds rock-solid defensive walls and waits for mistakes.',
    blunderRate: 0.08,
    depth: 4,
    greeting: "Hello. Let's have a clean, strategic battle. May the best planner win.",
    winPhrase: "Patience pays off. A satisfying positional victory.",
    lossPhrase: "Incredible positional squeeze. Your piece coordination was superior."
  },
  {
    id: 'zara',
    name: 'Zara (Lvl 10)',
    avatar: '👩‍🚀',
    rating: 1600,
    tier: 'Intermediate',
    personality: 'A bold, adventurous astronaut who launches unpredictable flank pawn storms.',
    blunderRate: 0.06,
    depth: 4,
    greeting: "Ignition sequence start! Ready to launch some aggressive flank attacks?",
    winPhrase: "Mission accomplished! My pawn storm reached orbit.",
    lossPhrase: "Houston, we have a problem. Your counterplay was absolutely astronomical."
  },
  {
    id: 'kenzo',
    name: 'Kenzo (Lvl 11)',
    avatar: '🥋',
    rating: 1700,
    tier: 'Intermediate',
    personality: 'A martial arts master who focuses on precise piece harmony and swift counter-attacks.',
    blunderRate: 0.05,
    depth: 4,
    greeting: "Focus and balance. Let us engage in a harmonious battle of minds.",
    winPhrase: "Perfect balance leads to victory. You lost your center.",
    lossPhrase: "A brilliant strike. Your attack bypassed my defensive stance."
  },
  {
    id: 'levy',
    name: 'Levy (Lvl 12)',
    avatar: '🎙️',
    rating: 1850,
    tier: 'Advanced',
    personality: 'Aggressive, talks dynamic chess terms. Loves double attacks, pins, and screaming "THE ROOOOK!"',
    blunderRate: 0.04,
    depth: 5,
    greeting: "Welcome back to the channel! Today we are dissecting your chess soul. Let's go!",
    winPhrase: "AND THAT IS HOW WE DO IT! You fell right into my opening prep!",
    lossPhrase: "Wait... did you just play that? That is brilliant. You are officially dangerous."
  },
  {
    id: 'sofia',
    name: 'Sofia (Lvl 13)',
    avatar: '👩‍💻',
    rating: 2000,
    tier: 'Advanced',
    personality: 'A brilliant software architect who optimizes open files and coordinates rook pairs with logic.',
    blunderRate: 0.03,
    depth: 5,
    greeting: "System boot complete. Running chess optimization algorithms on your position.",
    winPhrase: "Optimization successful. All structural loops closed in my favor.",
    lossPhrase: "An unhandled exception! You found a brilliant patch to bypass my logic."
  },
  {
    id: 'alexandra',
    name: 'Alexandra (Lvl 14)',
    avatar: '👩‍🎓',
    rating: 2150,
    tier: 'Advanced',
    personality: 'An academic champion who plays highly theory-heavy, sharp, tactical opening lines.',
    blunderRate: 0.02,
    depth: 6,
    greeting: "I hope you prepared your opening database today, because theory starts now.",
    winPhrase: "You deviated from book move 15, and my theoretical advantage was converted.",
    lossPhrase: "Unbelievable novelty! You completely busted my preparation."
  },
  {
    id: 'hikaru',
    name: 'Hikaru (Lvl 15)',
    avatar: '😎',
    rating: 2300,
    tier: 'Advanced',
    personality: 'Plays at lightning speed. Constantly evaluates positions out loud: "Let\'s keep moving, take take take, check, and we win."',
    blunderRate: 0.01,
    depth: 6,
    greeting: "Let's play. I literally don't even care, but let's see what you have.",
    winPhrase: "Yeah, so that was pretty easy, we just take and take and that's mate, let's keep moving.",
    lossPhrase: "Wait, actually you played well. Let's analyze. Wow, congrats."
  },
  {
    id: 'elena',
    name: 'Elena (Lvl 16)',
    avatar: '👩‍💼',
    rating: 2450,
    tier: 'Advanced',
    personality: 'Cold positional master who slowly chokes active play with microscopic, accurate king adjustments.',
    blunderRate: 0.01,
    depth: 8,
    greeting: "Let us skip the pleasantries. Try not to suffocate as I slowly restrict your active squares.",
    winPhrase: "A quiet, surgical constriction. No counterplay was permitted.",
    lossPhrase: "Superb tactical resourcefulness. You managed to slip away and counter-attack."
  },
  {
    id: 'vishy',
    name: 'Vishy (Lvl 17)',
    avatar: '🧠',
    rating: 2600,
    tier: 'Master',
    personality: 'The speed-calculating kid with deep intuitive comprehension of endgames and complex tactical files.',
    blunderRate: 0.00,
    depth: 8,
    greeting: "Let's play a fast, highly tactical game. Show me your depth of calculation.",
    winPhrase: "Calculated to mate in 8 moves. A sharp and satisfying combination.",
    lossPhrase: "Incredible. Your speed of calculation matched mine, and your endgame was perfect."
  },
  {
    id: 'magnus',
    name: 'Magnus (Lvl 18)',
    avatar: '👑',
    rating: 2800,
    tier: 'Master',
    personality: 'Plays near-perfect chess. Masterful endgame conversion, completely cold and calculating.',
    blunderRate: 0.00,
    depth: 10,
    greeting: "I am the world champion for a reason. Show me if you can handle the endgame.",
    winPhrase: "Just a standard squeeze. Good effort, but the crown remains.",
    lossPhrase: "I... lost? Incredible. You played like a true Grandmaster. My respects."
  },
  {
    id: 'garry',
    name: 'Garry (Lvl 19)',
    avatar: '🌋',
    rating: 2950,
    tier: 'Master',
    personality: 'Legendary aggressive champion with terrifying tactical outbursts and deep psychological pressure.',
    blunderRate: 0.00,
    depth: 12,
    greeting: "You face the beast of Baku! Prepare for maximum psychological and tactical pressure.",
    winPhrase: "I attacked with all my pieces, and your defenses collapsed! Tremble!",
    lossPhrase: "Astonishing defense! You weathered the storm and converted the counterplay. Bravo."
  },
  {
    id: 'stockfish_bot',
    name: 'Stockfish Supreme (Lvl 20)',
    avatar: '🐟',
    rating: 3200,
    tier: 'Master',
    personality: 'The ultimate, unbeatable open-source titan. Searches 15 plies deep using pure computer evaluation.',
    blunderRate: 0.00,
    depth: 15,
    greeting: "Hello. I am Stockfish. Operating at maximum strength Level 20. Good luck surviving.",
    winPhrase: "Calculation complete: mate. Victory is mine.",
    lossPhrase: "Analysis complete. You have played a brilliant game and defeated my network. Congratulations!"
  }
];

// Helper to evaluate static position for WHITE
export function evaluateBoard(chess: Chess, botId?: string): number {
  let score = 0;
  const board = chess.board();

  // Nelson loves his Queen! Let's inflate Queen value if bot is Nelson
  const queenWeightMultiplier = botId === 'nelson' ? 1.2 : 1.0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (!square) continue;

      const type = square.type;
      const color = square.color;

      let val = 0;
      switch (type) {
        case 'p':
          val = 100 + pawnTable[color === 'w' ? r : 7 - r][c];
          break;
        case 'n':
          val = 320 + knightTable[color === 'w' ? r : 7 - r][c];
          break;
        case 'b':
          val = 330 + bishopTable[color === 'w' ? r : 7 - r][c];
          break;
        case 'r':
          val = 500 + rookTable[color === 'w' ? r : 7 - r][c];
          break;
        case 'q':
          val = (900 * queenWeightMultiplier) + queenTable[color === 'w' ? r : 7 - r][c];
          break;
        case 'k':
          val = 20000 + kingTableMiddle[color === 'w' ? r : 7 - r][c];
          break;
      }

      if (color === 'w') {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  // Positional bonuses: slightly penalize early queen moves except for Nelson!
  if (botId !== 'nelson' && chess.history().length < 8) {
    // Penalize queen moves before move 4
    const history = chess.history({ verbose: true });
    const earlyQueenMoves = history.filter(m => m.piece === 'q' && m.color === 'w').length;
    score -= earlyQueenMoves * 30;
  }

  return score;
}

// Alpha-Beta Minimax
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  botId?: string
): { score: number; move: any } {
  // Terminal nodes
  if (depth === 0 || chess.isGameOver()) {
    let score = evaluateBoard(chess, botId);
    if (chess.isCheckmate()) {
      // Checkmate is a huge win or huge loss
      score = isMaximizing ? -150000 + (4 - depth) : 150000 - (4 - depth);
    } else if (chess.isDraw()) {
      score = 0;
    }
    return { score, move: null };
  }

  const moves = chess.moves({ verbose: true });

  // MVV-LVA (Most Valuable Victim - Least Valuable Aggressor) move ordering for pruning speedup
  moves.sort((a, b) => {
    const aScore = (a.captured ? getPieceValue(a.captured) * 10 - getPieceValue(a.piece) : 0) + (a.san.includes('+') ? 10 : 0);
    const bScore = (b.captured ? getPieceValue(b.captured) * 10 - getPieceValue(b.piece) : 0) + (b.san.includes('+') ? 10 : 0);
    return bScore - aScore;
  });

  let bestMove: any = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      const evaluation = minimax(chess, depth - 1, alpha, beta, false, botId).score;
      chess.undo();

      if (evaluation > maxEval) {
        maxEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Prune
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      const evaluation = minimax(chess, depth - 1, alpha, beta, true, botId).score;
      chess.undo();

      if (evaluation < minEval) {
        minEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Prune
    }
    return { score: minEval, move: bestMove };
  }
}

function getPieceValue(piece: string): number {
  switch (piece) {
    case 'p': return 1;
    case 'n': return 3;
    case 'b': return 3;
    case 'r': return 5;
    case 'q': return 9;
    default: return 0;
  }
}

// Generate the best move for a bot
export function getBotMove(fen: string, bot: Bot, openingMoveStack?: string[]): { from: string; to: string; promotion?: string; phrase?: string } {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });

  if (legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }

  // 1. Opening Stack Helper: If practicing an opening, play the matching opening move if available!
  if (openingMoveStack && openingMoveStack.length > 0) {
    const nextExpectedMoveStr = openingMoveStack[0];
    // Find if the expected move is legal
    const matchedMove = legalMoves.find(m => m.san === nextExpectedMoveStr);
    if (matchedMove) {
      return { from: matchedMove.from, to: matchedMove.to, promotion: matchedMove.promotion };
    }
  }

  // 2. Blunder Simulator: Roll blunder percentage
  if (Math.random() < bot.blunderRate && legalMoves.length > 1) {
    // Pick a suboptimal or random legal move to simulate beginner mistakes
    // Filter out checkmate-in-one blocks if rating is > 500, to make them humanly realistic
    const sortedMoves = [...legalMoves];
    // Shuffle the move list slightly so they don't always pick the absolute worst
    sortedMoves.sort(() => Math.random() - 0.5);
    // Return a random or median move
    const selected = sortedMoves[0];
    return { from: selected.from, to: selected.to, promotion: selected.promotion };
  }

  // 3. AI search: Maximizing for White, Minimizing for Black
  const isMaximizing = chess.turn() === 'w';
  const result = minimax(chess, bot.depth, -Infinity, Infinity, isMaximizing, bot.id);

  if (result.move) {
    return {
      from: result.move.from,
      to: result.move.to,
      promotion: result.move.promotion || 'q'
    };
  }

  // Fallback to random legal move
  const fallback = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return {
    from: fallback.from,
    to: fallback.to,
    promotion: fallback.promotion || 'q'
  };
}

// Helper to calculate material balance (White value - Black value)
export function getMaterialDifference(fen: string): { whiteScore: number; blackScore: number; diff: number; capturedWhite: string[]; capturedBlack: string[] } {
  const chess = new Chess(fen);
  const board = chess.board();

  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let whiteScore = 0;
  let blackScore = 0;

  const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const currentWhiteCounts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const currentBlackCounts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      if (sq.color === 'w') {
        whiteScore += pieceValues[sq.type];
        if (sq.type !== 'k') currentWhiteCounts[sq.type]++;
      } else {
        blackScore += pieceValues[sq.type];
        if (sq.type !== 'k') currentBlackCounts[sq.type]++;
      }
    }
  }

  // Calculate captured pieces
  const capturedWhite: string[] = [];
  const capturedBlack: string[] = [];

  for (const piece of ['p', 'n', 'b', 'r', 'q']) {
    const lostWhite = initialCounts[piece] - currentWhiteCounts[piece];
    const lostBlack = initialCounts[piece] - currentBlackCounts[piece];
    for (let i = 0; i < lostWhite; i++) capturedWhite.push(piece.toUpperCase());
    for (let i = 0; i < lostBlack; i++) capturedBlack.push(piece);
  }

  return {
    whiteScore,
    blackScore,
    diff: whiteScore - blackScore,
    capturedWhite, // white pieces captured by black
    capturedBlack  // black pieces captured by white
  };
}

export async function getStockfishMove(fen: string, depth: number): Promise<{ from: string; to: string; promotion?: string }> {
  try {
    const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${depth}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Stockfish API HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (data.success && data.data) {
      // Stockfish online returns data format: "bestmove e2e4 ponder e7e6"
      const match = data.data.match(/^bestmove\s+([a-h][1-8])([a-h][1-8])([qrbn])?/);
      if (match) {
        return {
          from: match[1],
          to: match[2],
          promotion: match[3] || undefined
        };
      }
    }
    throw new Error('Invalid Stockfish API response payload');
  } catch (err) {
    console.warn('Stockfish.online API call failed, falling back to local minimax AI:', err);
    // Fallback to local minimax bot with moderate search depth (max 3 to ensure fast response)
    const fallbackBot = {
      id: 'stockfish_fallback',
      name: 'Stockfish Fallback',
      blunderRate: 0,
      depth: Math.min(3, depth)
    };
    return getBotMove(fen, fallbackBot as any);
  }
}

