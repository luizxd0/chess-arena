import { Opening } from '../types';

export const openingsList: Opening[] = [
  {
    id: 'italian-game',
    name: 'Italian Game',
    side: 'w',
    difficulty: 'Beginner',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    description: 'One of the oldest and most popular openings in chess. It focuses on rapid development, controlling the center with the e4 pawn, and targeting Black\'s weakest point: the f7 pawn, which is guarded only by the King.',
    variations: [
      {
        name: 'Main Line',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
        description: 'The standard starting position for the Italian Game, establishing early center control and piece development.',
        tips: [
          'Move 1: Control the center with your e-pawn.',
          'Move 2: Develop your knight and attack the center.',
          'Move 3: Bring out your bishop to an active square targeting f7.'
        ]
      },
      {
        name: 'Giuoco Piano (The Quiet Game)',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4'],
        description: 'Black mirrors White\'s bishop to challenge the diagonal. White responds by building a strong pawn center with c3 and d4.',
        tips: [
          'Move 1-3: Develop your Knight and Bishop early to target the f7 square.',
          'Move 4 (Bc5): Black plays solid. Prepare to stake your claim in the center.',
          'Move 5 (c3): This supports your next pawn push to d4, helping White gain space.',
          'Move 6 (Nf6): Black attacks your e4 pawn. Keep up the pressure!',
          'Move 7 (d4): Strike at the center! If Black captures, you will establish a massive pawn duo.'
        ]
      },
      {
        name: 'Two Knights Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5'],
        description: 'Black develops their Knight to attack e4 immediately. White can launch an aggressive counter-attack on f7 with Ng5.',
        tips: [
          'Move 4 (Nf6): Black aggressively counters by attacking e4.',
          'Move 5 (Ng5): The Knight Attack! Join forces with your Bc4 to double-attack f7.',
          'Move 6 (d5): Black blocks your bishop\'s diagonal. This is their best defensive try.',
          'Move 7 (exd5): Capture the pawn to reopen lines. Black will likely play Na5 to harass your bishop.'
        ]
      },
      {
        name: 'Evans Gambit',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3'],
        description: 'White sacrifices a wing pawn (b4) to lure Black\'s bishop away, allowing White to build a rapid center with c3 and d4 with tempo.',
        tips: [
          'Move 4 (Bc5): The setup is ready for a highly tactical gambit.',
          'Move 5 (b4): Offer the b4 pawn! Black almost must accept this sacrifice.',
          'Move 6 (Bxb4): Black takes. Now push c3 with tempo to kick the bishop and prepare a rapid d4 push.',
          'Move 7 (c3): Gain full speed and initiative in the center. Black\'s king will soon feel the heat!'
        ]
      }
    ]
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    side: 'w',
    difficulty: 'Advanced',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    description: 'Also known as the Spanish Game, it is one of the most complex and heavily analyzed openings. White immediately puts pressure on the knight defending the e5 pawn.',
    variations: [
      {
        name: 'Morphy Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
        description: 'Black immediately questions the bishop with a6. White typically retreats to a4 to maintain the pin.',
        tips: [
          'Move 3 (Bb5): Attack the defender of the e5 pawn.',
          'Move 4 (a6): Black attacks your bishop.',
          'Move 5 (Ba4): Retreat the bishop but keep the pressure along the diagonal.',
          'Move 6 (O-O): Secure the king early.',
          'Move 7 (Be7): Black prepares to castle.'
        ]
      },
      {
        name: 'Berlin Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8'],
        description: 'Known as the "Berlin Wall", it leads to an early queen exchange and a very solid, hard-to-crack endgame for Black.',
        tips: [
          'Move 4 (Nf6): Black attacks the e4 pawn instead of playing a6.',
          'Move 5 (O-O): Ignore the pawn and castle!',
          'Move 6 (Nxe4): Black takes the pawn. Strike in the center with d4.'
        ]
      }
    ]
  },
  {
    id: 'london-system',
    name: 'London System',
    side: 'w',
    difficulty: 'Beginner',
    moves: ['d4', 'd5', 'Bf4'],
    description: 'A solid, universal system for White that can be played against almost anything Black does. It focuses on rapid development, a solid pawn structure, and avoiding sharp tactical pitfalls early on.',
    variations: [
      {
        name: 'Main Line',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
        description: 'The standard setup where White builds a pyramid pawn structure and develops comfortably.',
        tips: [
          'Move 1: Claim the center with d4.',
          'Move 2: Bring the dark-squared bishop out early to f4 before playing e3.',
          'Move 3 (e3): Solidify the center.',
          'Move 4 (Nf3): Develop the knight.',
          'Move 5 (Bg3): If Black challenges the bishop with Bd6, drop it back to g3 to open the h-file if captured.'
        ]
      }
    ]
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    side: 'b',
    difficulty: 'Intermediate',
    moves: ['e4', 'e6', 'd4', 'd5'],
    description: 'A robust and counter-attacking defense. Black solidifies the center with e6 and challenges White immediately with d5, leading to closed and strategic positions.',
    variations: [
      {
        name: 'Advance Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6'],
        description: 'White closes the center with e5. Black immediately attacks the pawn chain base with c5.',
        tips: [
          'Move 1 (e6): Prepare to challenge the center safely.',
          'Move 2 (d5): Strike at the center.',
          'Move 3 (e5): White locks the structure.',
          'Move 4 (c5): Attack the pawn chain base at d4 immediately!',
          'Move 5 (Nc6) & Move 6 (Qb6): Pile up pressure on White\'s d4 pawn.'
        ]
      },
      {
        name: 'Exchange Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'exd5', 'exd5', 'Nf3', 'Nf6', 'Bd3', 'Bd6'],
        description: 'White resolves the tension by exchanging on d5, leading to a symmetrical and relatively quiet position.',
        tips: [
          'Move 3 (exd5): White exchanges, opening the e-file.',
          'Develop your pieces symmetrically and maintain solid central control.'
        ]
      }
    ]
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    side: 'b',
    difficulty: 'Beginner',
    moves: ['e4', 'c6', 'd4', 'd5'],
    description: 'A solid and extremely reliable defensive system for Black. Black prepares the d5 push with c6, ensuring a robust pawn structure that doesn\'t trap the light-squared bishop, unlike the French Defense.',
    variations: [
      {
        name: 'Classical Variation',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
        description: 'White develops a knight to defend e4. Black captures on e4 and develops their light-squared bishop to active squares immediately.',
        tips: [
          'Move 1 (c6): Prepare the d5 push while keeping your bishop\'s path open.',
          'Move 2 (d5): Challenge White\'s central e4 pawn.',
          'Move 3 (Nc3): White defends e4 with a knight. Capture it to open lines!',
          'Move 4 (dxe4): Trade in the center to secure a reliable pawn structure.',
          'Move 5 (Bf5): Develop your bishop immediately to attack White\'s knight and gain an active outpost.',
          'Move 6 (Ng3): White\'s knight retreats and kicks your bishop. Simply slide back to g6 for safety.'
        ]
      },
      {
        name: 'Advance Variation',
        moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5'],
        description: 'White locks the center by pushing e5. Black develops their bishop outside the pawn chain before sealing it with e6, then strikes back with c5.',
        tips: [
          'Move 3 (e5): White gains spatial advantage. Your light-squared bishop must escape before playing e6.',
          'Move 4 (Bf5): Position the bishop actively. This is the main benefit of Caro-Kann over the French Defense.',
          'Move 5 (e6): Seal the solid pawn chain. Now your dark-squared bishop and queen are ready to roll.',
          'Move 6 (c5): Undermine White\'s central d4 pawn! This is a typical counter-striking theme.'
        ]
      }
    ]
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    side: 'b',
    difficulty: 'Advanced',
    moves: ['e4', 'c5'],
    description: 'The most popular and high-scoring response to e4. Instead of mirroring e4 with e5, Black fights for the center asymmetrically with c5, creating unbalanced, sharp, and highly tactical positions.',
    variations: [
      {
        name: 'Najdorf Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        description: 'The "Rolls-Royce of Chess Openings." Favored by Kasparov and Fischer, Black plays a6 to prevent White\'s pieces from occupying b5, preparing an expansion on the queenside.',
        tips: [
          'Move 1 (c5): Fight for control of d4 using a flank pawn, creating asymmetrical tension.',
          'Move 2 (d6): Open pathways for your light-squared bishop and control e5/c5.',
          'Move 3 (cxd4): Capture White\'s pawn to open the c-file for your future rook.',
          'Move 4 (Nf6): Strike at White\'s unprotected e4 pawn with your knight.',
          'Move 5 (a6): The signature Najdorf move! Restricts White\'s pieces on b5 and prepares a b5 queenside pawn push.'
        ]
      },
      {
        name: 'Dragon Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7'],
        description: 'Named because Black\'s pawn structure resembles the Draco constellation. Black fianchettos their bishop to g7 to put massive pressure along the long diagonal.',
        tips: [
          'Move 4 (g6): Prepare to fianchetto your dark-squared bishop to g7.',
          'Move 5 (Bg7): Position your bishop on the long diagonal (h8-a1), pointing directly at White\'s queenside.',
          'Key Theme: Black\'s g7 bishop is a defensive monster and an offensive powerhouse. Watch out for White\'s f3-g4-h4 pawn storms!'
        ]
      }
    ]
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    side: 'w',
    difficulty: 'Intermediate',
    moves: ['d4', 'd5', 'c4'],
    description: 'One of the most classical openings. White offers a side pawn (c4) to temporarily divert Black\'s d5 pawn, allowing White to take full command of the central squares with e4.',
    variations: [
      {
        name: 'Accepted Variation',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4'],
        description: 'Black accepts the pawn. White develops a knight to prevent e5, then pushes e3 to recapture the c4 pawn with the light-squared bishop.',
        tips: [
          'Move 1-2 (c4): Offer the wing pawn to undermine Black\'s central hold.',
          'Move 3 (dxc4): Black takes! Don\'t panic, you will regain this pawn soon.',
          'Move 4 (Nf3): Stop Black from striking the center with e5 immediately.',
          'Move 5 (e3): Open your bishop\'s diagonal to take back the c4 pawn.',
          'Move 6 (Bxc4): You have successfully captured the pawn and developed your bishop with excellent center control.'
        ]
      },
      {
        name: 'Declined (Orthodox Defense)',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
        description: 'Black refuses to take, defending d5 with e6. White develops pressure on d5 by bringing a knight to c3 and pinning Black\'s f6 knight.',
        tips: [
          'Move 3 (e6): Black declines, keeping a solid hold on the d5 square.',
          'Move 4 (Nc3): Put pressure on Black\'s d5 pawn with your knight.',
          'Move 5 (Bg5): Pin Black\'s knight on f6 to undermine their defensive core.',
          'Move 6 (Be7): Black unpins the knight. Prepare to castle and dominate the center.'
        ]
      }
    ]
  }
];
