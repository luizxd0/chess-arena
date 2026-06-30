import React from 'react';
import { pieceUrls } from '../utils/pieceUrls';

interface PieceProps {
  type: string;
  color: 'w' | 'b';
  className?: string;
}

export const RenderPiece: React.FC<PieceProps> = React.memo(({ type, color, className }) => {
  const char = type.toLowerCase();
  const key = `${color}${char}`;
  const svgUrl = pieceUrls[key];

  if (!svgUrl) {
    return null;
  }

  return (
    <div className={`w-full h-full flex items-center justify-center select-none pointer-events-none drop-shadow-md ${className || ''}`}>
      <img 
        src={svgUrl} 
        alt={key} 
        className="w-[90%] h-[90%] object-contain select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        draggable="false" 
      />
    </div>
  );
});

RenderPiece.displayName = 'RenderPiece';
