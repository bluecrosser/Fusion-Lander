
import React, { useState, useEffect, useCallback } from 'react';
import GameEngine from './components/GameEngine';
import ControlsOverlay from './components/ControlsOverlay';
import QuizModal from './components/QuizModal';
import MainMenu from './components/MainMenu';
import { GameState, Player, Platform, MathQuestion, HighScore, LanderStats } from './types';
import { 
  INITIAL_PLAYER_STATE, CANVAS_WIDTH, CANVAS_HEIGHT, 
  INITIAL_FUEL, FUEL_REWARD, PLATFORM_CONFIG, LANDER_TYPES 
} from './constants';
import { generateMathQuestion } from './services/geminiService';
import { audioService } from './services/audioService';

const MIN_PLATFORM_DIST = 150;
const GAME_OVER_TEXTS = ["WASTED", "KABOOM", "GAME OVER"];
const SHIP_SAFE_ZONE_RADIUS = 100; // No platforms within this radius of spawn

const generatePlatforms = (count: number, score: number, currentPlatforms: Platform[] = []): Platform[] => {
  // 1. Clean up existing platforms based on score rules
  let validPlatforms = currentPlatforms.filter(p => {
    if (score >= 750) return p.type === 'HARD'; // Only Red
    if (score >= 500) return p.type !== 'EASY'; // No Green
    return true; // All allowed
  });

  const plats: Platform[] = [...validPlatforms];
  
  if (plats.length === 0 && score === 0) {
    // Empty start logic if needed
  }

  // 2. Determine what we need to add to reach count (5)
  while (plats.length < 5) {
    // Only consider UNVISITED platforms for variety checks.
    const existingActiveTypes = plats.filter(p => !p.visited).map(p => p.type);
    
    let nextType: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
    let config = PLATFORM_CONFIG.EASY;

    if (score >= 750) {
      nextType = 'HARD';
      config = PLATFORM_CONFIG.HARD;
    } else if (score >= 500) {
      if (!existingActiveTypes.includes('MEDIUM')) {
        nextType = 'MEDIUM';
        config = PLATFORM_CONFIG.MEDIUM;
      } else if (!existingActiveTypes.includes('HARD')) {
        nextType = 'HARD';
        config = PLATFORM_CONFIG.HARD;
      } else {
        const isMed = Math.random() > 0.5;
        nextType = isMed ? 'MEDIUM' : 'HARD';
        config = isMed ? PLATFORM_CONFIG.MEDIUM : PLATFORM_CONFIG.HARD;
      }
    } else {
      if (!existingActiveTypes.includes('EASY')) {
        nextType = 'EASY';
        config = PLATFORM_CONFIG.EASY;
      } else if (!existingActiveTypes.includes('MEDIUM')) {
        nextType = 'MEDIUM';
        config = PLATFORM_CONFIG.MEDIUM;
      } else if (!existingActiveTypes.includes('HARD')) {
        nextType = 'HARD';
        config = PLATFORM_CONFIG.HARD;
      } else {
        const r = Math.random();
        if (r < 0.33) { nextType = 'EASY'; config = PLATFORM_CONFIG.EASY; }
        else if (r < 0.66) { nextType = 'MEDIUM'; config = PLATFORM_CONFIG.MEDIUM; }
        else { nextType = 'HARD'; config = PLATFORM_CONFIG.HARD; }
      }
    }

    // Generate coordinates
    let attempts = 0;
    let placed = false;
    while (attempts < 50 && !placed) {
      const width = Math.random() * 60 + 60;
      const x = Math.random() * (CANVAS_WIDTH - width);
      const y = Math.random() * (CANVAS_HEIGHT - 150) + 50; // Use mostly full height
      
      // 1. Check distance from other platforms
      let tooClose = false;
      for (const p of plats) {
        const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
        if (dist < MIN_PLATFORM_DIST) {
          tooClose = true;
          break;
        }
      }

      // 2. Check distance from Ship Spawn (Safe Zone)
      const spawnX = INITIAL_PLAYER_STATE.position.x;
      const spawnY = INITIAL_PLAYER_STATE.position.y;
      const platCenterX = x + width / 2;
      const platCenterY = y;
      const distFromSpawn = Math.sqrt(Math.pow(platCenterX - spawnX, 2) + Math.pow(platCenterY - spawnY, 2));
      
      if (distFromSpawn < SHIP_SAFE_ZONE_RADIUS) {
        tooClose = true;
      }

      if (!tooClose) {
        plats.push({
          x, y, width,
          visited: false,
          id: Math.random() + Date.now(),
          type: nextType,
          color: config.color,
          points: config.minPoints,
          difficultyLevel: config.difficulty,
          isLoadingQuestion: false
        });
        placed = true;
      }
      attempts++;
    }
    if (!placed) break; 
  }
  return plats;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER_STATE);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [activePlatformId, setActivePlatformId] = useState<number | null>(null);
  const [landerStats, setLanderStats] = useState<LanderStats>(LANDER_TYPES.LIGHT);
  const [lastAnswer, setLastAnswer] = useState<number | undefined>(undefined);
  const [gameOverMessage, setGameOverMessage] = useState("GAME OVER");
  const [musicOn, setMusicOn] = useState(false);
  
  // Load scores
  useEffect(() => {
    const saved = localStorage.getItem('fusion_scores');
    if (saved) {
      try {
        setHighScores(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Toggle Music
  useEffect(() => {
    audioService.toggleMusic(musicOn);
  }, [musicOn]);

  // Preload questions effect - Synchronous local generation
  useEffect(() => {
    if (gameState === GameState.MENU) return;

    const platformsNeedingQuestions = platforms.filter(p => 
      !p.question && !p.visited && p.id !== 0
    );

    if (platformsNeedingQuestions.length === 0) return;

    const knownAnswers = platforms
      .map(p => p.question?.answer)
      .filter((a): a is number => a !== undefined);
    
    if (lastAnswer !== undefined) knownAnswers.push(lastAnswer);
    
    let newPlatforms = [...platforms];
    let updated = false;

    newPlatforms = newPlatforms.map(p => {
      if (!p.question && !p.visited && p.id !== 0) {
        const q = generateMathQuestion(p.type, knownAnswers);
        knownAnswers.push(q.answer);
        updated = true;
        return { ...p, question: q, isLoadingQuestion: false };
      }
      return p;
    });

    if (updated) {
      setPlatforms(newPlatforms);
    }
  }, [platforms, gameState, lastAnswer]);

  // Transition Effect for Explosion -> Game Over -> Menu
  useEffect(() => {
    if (gameState === GameState.EXPLODING) {
        const timer = setTimeout(() => {
            setGameState(GameState.GAME_OVER);
        }, 3000);
        return () => clearTimeout(timer);
    }

    if (gameState === GameState.GAME_OVER) {
        const timer = setTimeout(() => {
            setGameState(GameState.MENU);
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [gameState]);


  const startGame = (mode: 'LIGHT' | 'HEAVY') => {
    setLanderStats(LANDER_TYPES[mode]);
    setPlayer({ ...INITIAL_PLAYER_STATE });
    setPlatforms(generatePlatforms(5, 0));
    setScore(0);
    setLastAnswer(undefined);
    setGameState(GameState.PLAYING);
  };

  const handleLand = useCallback((platformId: number) => {
    const plat = platforms.find(p => p.id === platformId);
    if (!plat) return;

    setGameState(GameState.LANDED);
    audioService.playSound('land');
    setActivePlatformId(platformId);
    
    if (plat.question) {
      setCurrentQuestion(plat.question);
    } else {
      const excludes = lastAnswer !== undefined ? [lastAnswer] : [];
      const q = generateMathQuestion(plat.type, excludes);
      setCurrentQuestion(q);
    }
  }, [platforms, lastAnswer]);

  const handleQuizResult = (success: boolean) => {
    if (success) {
      if (currentQuestion) {
        setLastAnswer(currentQuestion.answer);
      }

      const plat = platforms.find(p => p.id === activePlatformId);
      const pointsReward = plat ? plat.points : 10; 
      const newScore = score + pointsReward;
      setScore(newScore);
      
      // Fuel Calculation
      let fuelAmount = FUEL_REWARD;
      if (landerStats.name === 'HEAVY LANDER') {
        fuelAmount *= 2; 
      }

      setPlayer(prev => ({
        ...prev,
        fuel: Math.min(prev.fuel + fuelAmount, 100),
        position: { ...prev.position, y: prev.position.y - 10 },
        velocity: { x: 0, y: -0.5 }
      }));

      const remainingPlats = platforms.filter(p => p.id !== activePlatformId);
      setPlatforms(generatePlatforms(5, newScore, remainingPlats));

      setGameState(GameState.PLAYING);
    } else {
      handleGameOver();
    }
    setCurrentQuestion(null);
    setActivePlatformId(null);
  };

  const handleCrash = () => {
    // Handled in game engine (bouncing)
  };

  const handleGameOver = () => {
    setGameOverMessage(GAME_OVER_TEXTS[Math.floor(Math.random() * GAME_OVER_TEXTS.length)]);
    
    const newEntry: HighScore = {
      score: score,
      date: new Date().toLocaleDateString()
    };
    const newScores = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setHighScores(newScores);
    localStorage.setItem('fusion_scores', JSON.stringify(newScores));

    setGameState(GameState.EXPLODING);
  };

  useEffect(() => {
      if (player.fuel <= 0 && gameState === GameState.PLAYING) {
          const timer = setTimeout(() => {
              if (gameState === GameState.PLAYING) handleGameOver();
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [player.fuel, gameState]);

  const getQuizDuration = () => {
    if (score >= 750) return 5;
    if (score >= 500) return 7;
    return 10;
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col items-center justify-center">
      
      {/* Music Toggle - Top Right Corner */}
      <button 
        onClick={() => setMusicOn(!musicOn)}
        className={`absolute top-4 right-4 z-50 w-10 h-10 rounded-full border flex items-center justify-center transition-all ${musicOn ? 'bg-sky-600 border-sky-400 shadow-[0_0_10px_#0ea5e9]' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
        title="Toggle Music"
      >
        {musicOn ? (
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
             <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.08-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" clipRule="evenodd" />
           </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 2.485.735 4.817 2.007 6.793.204.322.504.595.87.733.934.35 1.632.32 1.913.02l5.77-5.769c.944-.945 2.56-.276 2.56 1.06V4.06zM18.594 5.406a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.938 7.531a.75.75 0 011.06 0 4.5 4.5 0 010 6.364.75.75 0 01-1.06-1.06 3 3 0 000-4.243.75.75 0 010-1.06z" />
            </svg>
        )}
      </button>

      {/* HUD: Sit above game, constrained to game width */}
      {gameState === GameState.PLAYING && (
        <div className="w-full max-w-4xl flex justify-between items-end px-4 md:px-0 pb-2 z-10">
            
            {/* Left: Fuel */}
             <div className="bg-slate-900/80 p-2 border border-sky-900 rounded backdrop-blur-sm shadow-lg w-28 md:w-40">
                <div className="flex justify-between items-end mb-1">
                     <span className="text-[10px] md:text-xs text-sky-400 font-bold">FUEL</span>
                     <span className={`text-xs md:text-sm font-bold ${player.fuel < 20 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                       {Math.floor(player.fuel)}%
                     </span>
                </div>
                <div className="w-full h-1.5 md:h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${player.fuel < 20 ? 'bg-red-500' : 'bg-amber-500'}`} 
                    style={{ width: `${player.fuel}%` }} 
                  />
                </div>
             </div>

            {/* Center: Title */}
            <div className="flex flex-col items-center justify-end mb-1 gap-2">
                 <h1 className="hidden md:block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 neon-text tracking-tighter drop-shadow-lg opacity-90">
                    FUSION LANDER
                 </h1>
            </div>

            {/* Right: Score */}
             <div className="bg-slate-900/80 p-2 border border-sky-900 rounded backdrop-blur-sm shadow-lg w-28 md:w-40 flex justify-between items-center">
                <span className="text-[10px] md:text-xs text-sky-400 font-bold">SCORE</span>
                <span className="text-lg md:text-xl text-white font-mono">{score}</span>
             </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center">
        <GameEngine 
            gameState={gameState}
            setGameState={setGameState}
            player={player}
            setPlayer={setPlayer}
            platforms={platforms}
            onLand={handleLand}
            onCrash={handleCrash}
            landerStats={landerStats}
        />
      </div>

      {/* Mobile Controls */}
      {gameState === GameState.PLAYING && (
        <ControlsOverlay />
      )}

      {/* Menus & Modals */}
      {gameState === GameState.MENU && (
        <MainMenu 
          onStart={startGame} 
          highScores={highScores}
          lastScore={score > 0 ? score : undefined}
        />
      )}

      {gameState === GameState.LANDED && (
        <QuizModal 
          question={currentQuestion}
          onCorrect={() => handleQuizResult(true)}
          onTimeUp={() => handleQuizResult(false)}
          currentFuel={player.fuel}
          initialTime={getQuizDuration()}
        />
      )}

       {/* Game Over Screen - Only show text AFTER explosion animation */}
       {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40 pointer-events-none animate-in fade-in duration-500">
           <h1 className="text-4xl font-mono text-red-500 font-bold animate-pulse tracking-widest transform scale-150">{gameOverMessage}</h1>
        </div>
      )}

    </div>
  );
};

export default App;
