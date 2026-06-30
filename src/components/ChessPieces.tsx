import React from 'react';

interface PieceProps {
  color: 'w' | 'b';
  className?: string;
}

export const Pawn: React.FC<PieceProps> = React.memo(({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#fff' : '#000';
  const stroke = isWhite ? '#000' : '#fff';
  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M 22.5,9 C 20.29,9 18.5,10.79 18.5,13 C 18.5,13.89 18.79,14.71 19.28,15.38 C 17.33,16.5 16,18.59 16,21 C 16,23.03 16.94,24.84 18.41,26.03 C 15.41,27.09 11,31.58 11,39.5 L 34,39.5 C 34,31.58 29.59,27.09 26.59,26.03 C 28.06,24.84 29,23.03 29,21 C 29,18.59 27.67,16.5 25.72,15.38 C 26.21,14.71 26.5,13.89 26.5,13 C 26.5,10.79 24.71,9 22.5,9 z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
});

export const Knight: React.FC<PieceProps> = React.memo(({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#fff' : '#000';
  const stroke = isWhite ? '#000' : '#fff';
  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
        fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.96,30.84 6.5,27.75 6,26 C 10,28 11.5,27.25 11.5,27.25 C 10.5,25 10.5,23.5 10.5,23.5 C 9.5,24 8.5,24.5 8.5,24.5 C 9.5,22 10,21.5 10,21.5 C 8,20.5 7.5,19.5 7.5,19.5 C 9.5,18 10,17 10,17 C 8.5,15.5 7.5,14 7.5,14 C 11,14.5 13,15.5 13,15.5 C 13,14 13.5,12 13.5,12 C 16,13 18,14 18,14 C 18,12 19,10 19,10 C 20,10.5 21,11 21,11 C 21,10.5 22,10 22,10 C 22,10 24,10 24,18 Z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="miter" />
      <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill={stroke} stroke={stroke} />
      <path d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" fill={stroke} stroke={stroke} />
    </svg>
  );
});

export const Bishop: React.FC<PieceProps> = React.memo(({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#fff' : '#000';
  const stroke = isWhite ? '#000' : '#fff';
  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill={fill} strokeLinecap="butt">
          <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z" />
          <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
          <path d="M 25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8 z" />
        </g>
        <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" strokeLinejoin="miter" />
      </g>
    </svg>
  );
});

export const Rook: React.FC<PieceProps> = React.memo(({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#fff' : '#000';
  const stroke = isWhite ? '#000' : '#fff';
  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" strokeLinecap="butt" />
        <path d="M 12.5,32 L 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 z" strokeLinecap="butt" />
        <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" strokeLinecap="butt" />
        <path d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z" strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z" strokeLinecap="butt" />
        <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 z" strokeLinecap="butt" />
        <path d="M 12,35.5 L 33,35.5 M 13,31.5 L 32,31.5 M 14,29.5 L 31,29.5 M 14,16.5 L 31,16.5 M 11,14 L 34,14" fill="none" stroke={stroke} strokeWidth="1" strokeLinejoin="miter" />
      </g>
    </svg>
  );
});

export const Queen: React.FC<PieceProps> = React.memo(({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#fff' : '#000';
  const stroke = isWhite ? '#000' : '#fff';
  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill={fill} fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g fill={fill} stroke={stroke} strokeLinecap="butt">
          <path d="M 9 26 C 17.5 24.5 30 24.5 36 26 L 38 14 L 31 25 L 27 11 L 22.5 24.5 L 18 11 L 14 25 L 7 14 L 9 26 z" />
          <path d="M 9 26 C 9 28 10.5 28 11.5 30 C 12.5 31.5 12.5 31 12 33.5 C 10.5 34.5 10.5 36 10.5 36 C 9 37.5 11 38.5 11 38.5 C 17.5 39.5 27.5 39.5 34 38.5 C 34 38.5 35.5 37.5 34 36 C 34 36 34.5 34.5 33 33.5 C 32.5 31 32.5 31.5 33.5 30 C 34.5 28 36 28 36 26 C 27.5 24.5 17.5 24.5 9 26 z" />
          <path d="M 11.5 30 C 15 29 30 29 33.5 30" fill="none" />
          <path d="M 12 33.5 C 18 32.5 27 32.5 33 33.5" fill="none" />
        </g>
        <path d="M 11 38.5 A 2 2 0 1 1 11 38.5" fill="none" strokeLinecap="butt" />
        <path d="M 34 38.5 A 2 2 0 1 1 34 38.5" fill="none" strokeLinecap="butt" />
        <path d="M 8.5 13 A 1.5 1.5 0 1 1 8.5 13" fill={stroke} strokeLinecap="butt" />
        <path d="M 15.5 10 A 1.5 1.5 0 1 1 15.5 10" fill={stroke} strokeLinecap="butt" />
        <path d="M 22.5 10 A 1.5 1.5 0 1 1 22.5 10" fill={stroke} strokeLinecap="butt" />
        <path d="M 29.5 10 A 1.5 1.5 0 1 1 29.5 10" fill={stroke} strokeLinecap="butt" />
        <path d="M 36.5 13 A 1.5 1.5 0 1 1 36.5 13" fill={stroke} strokeLinecap="butt" />
      </g>
    </svg>
  );
});

export const King: React.FC<PieceProps> = React.memo(({ color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#fff' : '#000';
  const stroke = isWhite ? '#000' : '#fff';
  return (
    <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" strokeLinejoin="miter" />
        <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" fill={fill} strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 L 33.5,30 C 33.5,30 42.5,25.5 39.5,19.5 C 35.5,13 26,16 23.5,23.5 L 23.5,23.5 L 21.5,23.5 L 21.5,23.5 C 19,16 9.5,13 5.5,19.5 C 2.5,25.5 11.5,30 11.5,30 L 11.5,37 z" fill={fill} strokeLinecap="butt" strokeLinejoin="miter" />
        <path d="M 11.5,30 C 17,27 28,27 33.5,30 M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5 M 11.5,37 C 17,34 28,34 33.5,37" />
      </g>
    </svg>
  );
});

export const RenderPiece: React.FC<{ type: string; color: 'w' | 'b'; className?: string }> = React.memo(({ type, color, className }) => {
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
});

RenderPiece.displayName = 'RenderPiece';
