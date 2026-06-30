export type ChessColor = 'w' | 'b';

export type ChessMode = 'rapid' | 'blitz' | 'bullet';

export type RatingTier = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master' | 'Grandmaster';

export interface UserStats {
  elo: {
    rapid: number;
    blitz: number;
    bullet: number;
  };
  botRating: number;
  wins: number;
  losses: number;
  draws: number;
  completedOpenings: string[]; // list of opening IDs learned
  unlockedBots: string[]; // list of bot IDs unlocked
  gameHistory: GameRecord[];
}

export interface GameRecord {
  id: string;
  opponentName: string;
  opponentRating: number;
  mode: ChessMode | 'bot';
  playerColor: ChessColor;
  result: 'win' | 'loss' | 'draw';
  date: string;
  movesCount: number;
  moves?: string[];
  initialFen?: string;
}

export interface Bot {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  tier: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  personality: string;
  blunderRate: number; // 0 to 1
  depth: number; // search depth for AI
  greeting: string;
  winPhrase: string;
  lossPhrase: string;
}

export interface OpeningVariation {
  name: string;
  moves: string[]; // list of moves in algebraic notation (e.g. ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'])
  description: string;
  tips: string[];
}

export interface Opening {
  id: string;
  name: string;
  side: ChessColor;
  moves: string[]; // baseline moves
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  variations: OpeningVariation[];
}
