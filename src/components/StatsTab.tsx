import React, { useState } from 'react';
import { UserStats, RatingTier, ChessMode, GameRecord } from '../types';
import { Award, Trophy, Zap, Shield, BookOpen, Clock, Calendar, Check, Edit2, CheckSquare, Target } from 'lucide-react';

interface StatsTabProps {
  stats: UserStats;
  onUpdateStats: (updater: (prev: UserStats) => UserStats) => void;
  username: string;
  onUpdateUsername: (name: string) => void;
  onSelectGameToReview?: (game: GameRecord) => void;
}

const AVATARS = ['👑', '🏆', '♟', '♞', '♝', '♜', '♛', '🦁', '🦊', '🦅', '☯', '⚡', '🔥', '🧠'];

export const StatsTab: React.FC<StatsTabProps> = ({ 
  stats, 
  onUpdateStats, 
  username, 
  onUpdateUsername,
  onSelectGameToReview 
}) => {
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(username);
  const [selectedAvatar, setSelectedAvatar] = useState('👑');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const getRatingTier = (elo: number): RatingTier => {
    if (elo < 250) return 'Novice';
    if (elo < 800) return 'Beginner';
    if (elo < 1200) return 'Intermediate';
    if (elo < 1800) return 'Advanced';
    if (elo < 2200) return 'Master';
    return 'Grandmaster';
  };

  const getTierColor = (tier: RatingTier) => {
    switch (tier) {
      case 'Novice': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
      case 'Beginner': return 'text-[#4CAF50] bg-[#4CAF50]/10 border-[#388E3C]/30';
      case 'Intermediate': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Advanced': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Expert': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
      case 'Master': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Grandmaster': return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
  };

  const maxElo = Math.max(stats.elo.bullet, stats.elo.blitz, stats.elo.rapid, stats.botRating);
  const playerTitle = maxElo >= 2200 ? ' GM' : (maxElo >= 1800 ? ' M' : '');
  const displayUsername = username + playerTitle;

  const handleSaveUsername = () => {
    if (usernameInput.trim()) {
      onUpdateUsername(usernameInput.trim());
      setIsEditingUsername(false);
    }
  };

  const handleSelectAvatar = (av: string) => {
    setSelectedAvatar(av);
    setShowAvatarPicker(false);
  };

  // Compute stats metrics
  const totalGames = stats.wins + stats.losses + stats.draws;
  const winPercent = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;

  // Achievement rules calculation
  const achievementsList = [
    {
      id: 'scholar',
      title: 'Opening Scholar',
      desc: 'Master your first chess opening variation.',
      unlocked: stats.completedOpenings.length > 0,
      icon: BookOpen,
      color: 'bg-[#4CAF50]/10 text-[#4CAF50]'
    },
    {
      id: 'bot_slayer',
      title: 'Bot Slayer',
      desc: 'Climb above 600 ELO vs computer bots.',
      unlocked: stats.botRating >= 600,
      icon: CpuIcon,
      color: 'bg-purple-500/10 text-purple-400'
    },
    {
      id: 'centurion',
      title: 'Chess Centurion',
      desc: 'Complete at least 5 games of chess.',
      unlocked: totalGames >= 5,
      icon: Trophy,
      color: 'bg-amber-500/10 text-amber-400'
    },
    {
      id: 'grandmaster',
      title: 'Master Tactician',
      desc: 'Reach 1400 ELO in any 1v1 arena mode.',
      unlocked: stats.elo.bullet >= 1400 || stats.elo.blitz >= 1400 || stats.elo.rapid >= 1400,
      icon: Shield,
      color: 'bg-red-500/10 text-red-400'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-3 min-h-0">
      
      {/* 1. PLAYER PROFILE CARD */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-center gap-4 shrink-0">
        
        {/* Avatar Selectable */}
        <div className="relative">
          <button
            id="avatar-picker-btn"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="w-20 h-20 rounded-full bg-linear-to-br from-[#2A2A2A] to-[#333333] border border-[#2A2A2A] flex items-center justify-center text-4xl shadow-md hover:scale-105 transition cursor-pointer select-none"
            title="Click to change avatar"
          >
            {selectedAvatar}
          </button>
          
          {/* Popover Avatar grid picker */}
          {showAvatarPicker && (
            <div className="absolute top-22 left-1/2 -translate-x-1/2 bg-[#121212] border border-[#2A2A2A] p-3 rounded-2xl shadow-xl z-50 grid grid-cols-7 gap-1.5 w-56 text-white">
              {AVATARS.map((av, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAvatar(av)}
                  className="w-7 h-7 flex items-center justify-center text-base hover:bg-[#2A2A2A] rounded-md transition cursor-pointer"
                >
                  {av}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
            {isEditingUsername ? (
              <div className="flex items-center gap-2 max-w-xs mx-auto md:mx-0">
                <input
                  type="text"
                  id="username-edit-input"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  maxLength={15}
                  className="px-3 py-1 text-sm font-sans font-bold bg-[#121212] border border-[#2A2A2A] rounded-lg focus:outline-hidden text-white"
                />
                <button
                  id="save-username-btn"
                  onClick={handleSaveUsername}
                  className="p-1.5 rounded-lg bg-[#4CAF50] hover:bg-[#388E3C] text-[#121212] transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h2 className="font-sans font-black text-2xl text-white leading-none">{displayUsername}</h2>
                <button
                  id="edit-username-btn"
                  onClick={() => setIsEditingUsername(true)}
                  className="text-[#888888] hover:text-white transition p-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
            {['bullet', 'blitz', 'rapid'].map((m) => {
              const elo = stats.elo[m as ChessMode];
              const tier = getRatingTier(elo);
              return (
                <span
                  key={m}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider ${getTierColor(tier)}`}
                >
                  {m}: {elo}
                </span>
              );
            })}
          </div>
        </div>

        {/* General Win-Ratio Gauge */}
        <div className="w-28 flex flex-col items-center border-l border-[#2A2A2A] pl-6 shrink-0">
          <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-1">Win Ratio</span>
          <span className="font-mono font-black text-3xl text-[#4CAF50] leading-none">{winPercent}%</span>
          <span className="text-[10px] text-[#888888] mt-2 font-mono">{stats.wins}W / {stats.losses}L / {stats.draws}D</span>
        </div>

      </div>

      {/* 2. RATING CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {[
          { label: 'Bullet 1v1', elo: stats.elo.bullet, icon: Zap, color: 'text-amber-400 bg-amber-500/10' },
          { label: 'Blitz 1v1', elo: stats.elo.blitz, icon: Zap, color: 'text-red-400 bg-red-500/10' },
          { label: 'Rapid 1v1', elo: stats.elo.rapid, icon: Clock, color: 'text-[#4CAF50] bg-[#4CAF50]/10' },
          { label: 'Bot Rating', elo: stats.botRating, icon: Target, color: 'text-purple-400 bg-purple-500/10' }
        ].map((card, i) => {
          const tier = getRatingTier(card.elo);
          return (
            <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] p-3 rounded-2xl shadow-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-[#888888] leading-none">{card.label}</span>
                <card.icon className={`w-3.5 h-3.5 ${card.color.split(' ')[0]}`} />
              </div>
              <div className="font-mono font-black text-xl text-white leading-none">{card.elo}</div>
              <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-sm border mt-1.5 w-fit ${getTierColor(tier)}`}>
                {tier}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. TWO COLUMN LOWER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        
        {/* Left 2 Columns: Achievements & Openings checklist */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          
          {/* Achievements Grid */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 shadow-md flex-1 min-h-0 flex flex-col">
            <h3 className="font-sans font-bold text-sm text-white mb-2 flex items-center gap-1.5 shrink-0">
              <Trophy className="w-4 h-4 text-amber-500" />
              Accomplishments & Badges
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 overflow-y-auto">
              {achievementsList.map((ach) => {
                const Icon = ach.icon;
                return (
                  <div
                    key={ach.id}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition ${ach.unlocked ? 'bg-[#121212] border-[#2A2A2A]' : 'border-dashed border-[#2A2A2A] opacity-50'}`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${ach.unlocked ? ach.color : 'bg-[#2A2A2A] text-[#666666]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] text-white leading-none">{ach.title}</h4>
                      <p className="text-[9px] text-[#888888] mt-1 leading-tight line-clamp-2">{ach.desc}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md font-mono ${ach.unlocked ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/20' : 'bg-[#2A2A2A] text-[#666666]'}`}>
                          {ach.unlocked ? '✓ Unlocked' : 'Locked'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Learned Openings checklist */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 shadow-md shrink-0">
            <h3 className="font-sans font-bold text-sm text-white mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#4CAF50]" />
              Mastered Openings Theory
            </h3>
            <div className="space-y-1.5 overflow-y-auto max-h-[100px]">
              {[
                { id: 'italian-game', name: 'Italian Game (White) - Development Focus' },
                { id: 'caro-kann', name: 'Caro-Kann Defense (Black) - Solid Structure' },
                { id: 'sicilian-defense', name: 'Sicilian Defense (Black) - Sharp Asymmetry' },
                { id: 'queens-gambit', name: "Queen's Gambit (White) - Central Command" }
              ].map((op) => {
                const completed = stats.completedOpenings.includes(op.id);
                return (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-[#2A2A2A] bg-[#121212]/50 text-[10px] font-semibold"
                  >
                    <span className={completed ? 'text-white font-bold' : 'text-[#666666]'}>{op.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-1 ${completed ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/20' : 'bg-[#2A2A2A] text-[#666666]'}`}>
                      {completed ? <Check className="w-3 h-3" /> : null}
                      {completed ? 'Learned' : 'Not Mastered'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 1 Column: Match History feed */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 shadow-md lg:col-span-1 flex flex-col min-h-0 h-full">
          <h3 className="font-sans font-bold text-sm text-white mb-2 flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-indigo-500" />
            Match History Logs
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {stats.gameHistory.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center text-[#888888] py-12">
                <Calendar className="w-8 h-8 text-[#2A2A2A] mb-2" />
                <span className="text-xs font-semibold">No matches recorded yet.</span>
                <span className="text-[10px] text-[#666666] mt-1">Play 1v1 or Bot matches to see logs.</span>
              </div>
            ) : (
              stats.gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="p-3 bg-[#121212] border border-[#2A2A2A] rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="block font-bold text-white truncate max-w-[120px]">{game.opponentName}</span>
                      <span className="block text-[9px] text-[#888888] font-mono">Opponent rating: {game.opponentRating}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${game.result === 'win' ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#388E3C]/20' : game.result === 'loss' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[#2A2A2A] text-[#888888] border border-[#2A2A2A]'}`}>
                      {game.result}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[9px] text-[#888888] font-mono pt-1.5 border-t border-[#2A2A2A]">
                    <span>{game.mode.toUpperCase()} ({game.playerColor === 'w' ? 'White' : 'Black'})</span>
                    <div className="flex items-center gap-1.5">
                      <span>{game.movesCount} moves • {game.date}</span>
                      {onSelectGameToReview && (
                        <button
                          onClick={() => onSelectGameToReview(game)}
                          className="px-1.5 py-0.5 rounded bg-[#4CAF50]/15 hover:bg-[#4CAF50]/30 border border-[#388E3C]/30 text-[#4CAF50] font-bold text-[8px] uppercase tracking-wider transition cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

// Inline helper for CPU Icon to prevent import issue
const CpuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
);
