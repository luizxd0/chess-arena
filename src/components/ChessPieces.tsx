import React from 'react';

interface PieceProps {
  color: 'w' | 'b';
  className?: string;
}

export const Pawn: React.FC<PieceProps> = ({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const stroke = isWhite ? '#151515' : '#ffffff';
  const fill = isWhite ? '#ffffff' : '#1e1e1e';
  const highlight = isWhite ? '#f3f4f6' : '#2e2e2e';

  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 9c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill={fill} />
        <path d="M22.5 30c-5.5 0-8 3-8 8h16c0-5-2.5-8-8-8z" />
        <path d="M22.5 17c-4 0-5 3.5-5 7h10c0-3.5-1-7-5-7z" fill={highlight} />
        <path d="M19 30h7M17 33h11M16 36h13" strokeWidth="1" />
      </g>
    </svg>
  );
};

export const Knight: React.FC<PieceProps> = ({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const stroke = isWhite ? '#151515' : '#ffffff';
  const fill = isWhite ? '#ffffff' : '#1e1e1e';

  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,21 16,20 C 18,19 20,20 20,20 C 20,20 18,21 17,24 C 16,27 16,30 16,30 C 16,30 18,28 21,28 C 24,28 25,32 25,32 C 25,32 26,29 28,29 C 30,29 31,31 31,31 C 31,31 31,27 30,24 C 29,21 27,18 27,18 C 27,18 29,18 31,20 C 33,22 34,25 34,25 C 34,25 35,22 34,18 C 33,14 30,11 27,10 C 24,9 22,10 22,10 z" />
        <path d="M 9,38 L 36,38 C 36,34 32,31 27,31 L 18,31 C 13,31 9,34 9,38 z" />
        <circle cx="18" cy="16" r="1.5" fill={isWhite ? '#151515' : '#ffffff'} stroke="none" />
      </g>
    </svg>
  );
};

export const Bishop: React.FC<PieceProps> = ({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const stroke = isWhite ? '#151515' : '#ffffff';
  const fill = isWhite ? '#ffffff' : '#1e1e1e';

  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 38h27c0-4-3-8-8-9h-11c-5 1-8 5-8 9z" />
        <path d="M22.5 10c-3 0-5.5 2.5-5.5 5.5 0 2 1.5 4.5 4 6.5l1.5 5 1.5-5c2.5-2 4-4.5 4-6.5 0-3-2.5-5.5-5.5-5.5z" />
        <path d="M19 16l7 4M21 21.5h3" stroke={stroke} strokeWidth="1.2" />
        <circle cx="22.5" cy="7.5" r="2" fill={fill} stroke={stroke} />
      </g>
    </svg>
  );
};

export const Rook: React.FC<PieceProps> = ({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const stroke = isWhite ? '#151515' : '#ffffff';
  const fill = isWhite ? '#ffffff' : '#1e1e1e';

  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 38h27v-5H9v5z" />
        <path d="M12 33h21V19H12v14z" />
        <path d="M10 19h25l1.5-5h-28l1.5 5z" />
        <path d="M12 14v-4h4v2h5v-2h4v2h5v-2h4v4H12z" />
        <path d="M14 22h17M14 26h17M14 30h17" strokeWidth="1" />
      </g>
    </svg>
  );
};

export const Queen: React.FC<PieceProps> = ({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const stroke = isWhite ? '#151515' : '#ffffff';
  const fill = isWhite ? '#ffffff' : '#1e1e1e';

  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 38h27c0-4-3-7-8-8h-11c-5 1-8 4-8 8z" />
        <path d="M9 30l3-14 8 10 2.5-16 2.5 16 8-10 3 14H9z" />
        <circle cx="9" cy="15" r="1.5" />
        <circle cx="17" cy="10" r="1.5" />
        <circle cx="22.5" cy="4" r="1.5" />
        <circle cx="28" cy="10" r="1.5" />
        <circle cx="36" cy="15" r="1.5" />
      </g>
    </svg>
  );
};

export const King: React.FC<PieceProps> = ({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const stroke = isWhite ? '#151515' : '#ffffff';
  const fill = isWhite ? '#ffffff' : '#1e1e1e';

  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Base */}
        <path d="M9 38h27c0-4-3-7-8-8h-11c-5 1-8 4-8 8z" />
        {/* Crown Body */}
        <path d="M11.5 30C11.5 30 9 20 16.5 21C24 22 22.5 14 22.5 14C22.5 14 21 22 28.5 21C36 20 33.5 30 33.5 30H11.5z" />
        {/* Cross on Top */}
        <path d="M22.5 6v8M18.5 10h8" stroke={stroke} strokeWidth="2" />
        <circle cx="11.5" cy="30" r="1" />
        <circle cx="33.5" cy="30" r="1" />
      </g>
    </svg>
  );
};

export const RenderPiece: React.FC<{ type: string; color: 'w' | 'b'; className?: string }> = ({ type, color, className }) => {
  const [useFallback, setUseFallback] = React.useState(false);
  const pieceCode = `${color}${type.toUpperCase()}`; // e.g., wP, bN, wQ

  if (useFallback) {
    switch (type.toLowerCase()) {
      case 'p':
        return <Pawn color={color} className={className} />;
      case 'n':
        return <Knight color={color} className={className} />;
      case 'b':
        return <Bishop color={color} className={className} />;
      case 'r':
        return <Rook color={color} className={className} />;
      case 'q':
        return <Queen color={color} className={className} />;
      case 'k':
        return <King color={color} className={className} />;
      default:
        return null;
    }
  }

  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/cburnett/${pieceCode}.svg`}
      alt={pieceCode}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        // Fallback to lichess1.org if jsdelivr fails, then to local SVGs if both fail
        setUseFallback(true);
      }}
      draggable={false}
    />
  );
};
