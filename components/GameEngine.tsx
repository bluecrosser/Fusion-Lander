
import React, { useRef, useEffect } from 'react';
import { GameState, Player, Platform, Particle, LanderStats } from '../types';
import { 
  GRAVITY, COLORS, CANVAS_WIDTH, CANVAS_HEIGHT,
  MAX_LANDING_SPEED, MAX_LANDING_ANGLE, MAX_FALL_SPEED,
  FUEL_CONSUMPTION
} from '../constants';
import { audioService } from '../services/audioService';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  player: Player;
  setPlayer: React.Dispatch<React.SetStateAction<Player>>;
  platforms: Platform[];
  onLand: (platformId: number) => void;
  onCrash: () => void;
  landerStats: LanderStats;
}

const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, setGameState, player, setPlayer, platforms, onLand, onCrash, landerStats
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Array<{x: number, y: number, size: number, alpha: number}>>([]);
  const lastTimeRef = useRef<number>(0);
  const explodedRef = useRef<boolean>(false);
  const accumulatorRef = useRef<number>(0);
  const FIXED_TIME_STEP = 1000 / 60; // Target 60 physics steps per second

  // Input handling state refs (to avoid closure staleness in loop)
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const playerRef = useRef<Player>(player);

  // Initialize Stars randomly once
  useEffect(() => {
    const stars = [];
    for(let i=0; i<100; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.5 + 0.3
        });
    }
    starsRef.current = stars;
  }, []);

  // Sync ref with prop when prop changes (from external reset)
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Reset explosion state when playing
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        explodedRef.current = false;
        particlesRef.current = []; // Clear old particles
        lastTimeRef.current = 0; // Reset timer for new run
        accumulatorRef.current = 0;
    }
    
    // Trigger explosion sequence
    if (gameState === GameState.EXPLODING && !explodedRef.current) {
        explodedRef.current = true;
        audioService.playSound('crash');
        // Huge explosion
        for(let i=0; i<100; i++) { // More particles
             particlesRef.current.push({
              x: playerRef.current.position.x,
              y: playerRef.current.position.y,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: Math.random() * 1.0 + 1.0, // Lasts 1-2 seconds logic value (decay slower)
              color: Math.random() > 0.5 ? COLORS.thrust : COLORS.danger
            });
        }
    }
  }, [gameState]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Input listeners for custom events (touch controls)
  useEffect(() => {
    const handleTouchStart = (e: CustomEvent) => { keysRef.current[e.detail.code] = true; };
    const handleTouchEnd = (e: CustomEvent) => { keysRef.current[e.detail.code] = false; };
    
    window.addEventListener('game-input-start', handleTouchStart as EventListener);
    window.addEventListener('game-input-end', handleTouchEnd as EventListener);

    return () => {
      window.removeEventListener('game-input-start', handleTouchStart as EventListener);
      window.removeEventListener('game-input-end', handleTouchEnd as EventListener);
    }
  }, []);


  const updatePhysics = () => {
    if (gameState !== GameState.PLAYING) return;

    const p = playerRef.current;
    const keys = keysRef.current;

    // Rotation
    if (keys['ArrowLeft'] || keys['KeyA']) {
      p.angle -= landerStats.rotationSpeed;
      p.rotatingLeft = true;
    } else {
      p.rotatingLeft = false;
    }

    if (keys['ArrowRight'] || keys['KeyD']) {
      p.angle += landerStats.rotationSpeed;
      p.rotatingRight = true;
    } else {
      p.rotatingRight = false;
    }

    // Thrust
    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && p.fuel > 0) {
      p.thrusting = true;
      p.velocity.x += Math.cos(p.angle) * landerStats.thrustPower;
      p.velocity.y += Math.sin(p.angle) * landerStats.thrustPower;
      p.fuel = Math.max(0, p.fuel - FUEL_CONSUMPTION);

      // Generate particles
      for(let i=0; i<3; i++) {
        particlesRef.current.push({
          x: p.position.x - Math.cos(p.angle) * 10,
          y: p.position.y - Math.sin(p.angle) * 10,
          vx: p.velocity.x - Math.cos(p.angle) * (Math.random() * 2 + 1),
          vy: p.velocity.y - Math.sin(p.angle) * (Math.random() * 2 + 1),
          life: 0.5, // Short life for thrust
          color: Math.random() > 0.5 ? COLORS.thrust : '#ef4444'
        });
      }
      
      audioService.playThrust(true);
    } else {
      p.thrusting = false;
      audioService.playThrust(false);
    }

    // Passive Trail (Subtle movement trace)
    const speed = Math.sqrt(p.velocity.x**2 + p.velocity.y**2);
    if (speed > 1.0 && Math.random() < 0.3) { // Only if moving somewhat fast, 30% chance per tick
      particlesRef.current.push({
        x: p.position.x + (Math.random() - 0.5) * 6,
        y: p.position.y + (Math.random() - 0.5) * 6 + 5,
        vx: 0, // Stationary in space = trails behind
        vy: 0,
        life: 0.4 + Math.random() * 0.2, // Short fade
        color: 'rgba(14, 165, 233, 0.4)' // Faint blue
      });
    }

    // Gravity
    p.velocity.y += GRAVITY;
    // Cap falling speed
    p.velocity.y = Math.min(p.velocity.y, MAX_FALL_SPEED);

    p.position.x += p.velocity.x;
    p.position.y += p.velocity.y;

    // Screen wrapping (X-axis)
    if (p.position.x > CANVAS_WIDTH) p.position.x = 0;
    if (p.position.x < 0) p.position.x = CANVAS_WIDTH;

    // Screen wrapping (Y-axis) - No bouncing, just wrap
    if (p.position.y > CANVAS_HEIGHT) p.position.y = 0;
    if (p.position.y < 0) p.position.y = CANVAS_HEIGHT;

    // Check Collisions
    checkCollisions(p);
    
    // Update global state for UI
    setPlayer({...p});
  };

  const checkCollisions = (p: Player) => {
    // Ship size approximation (Wider due to legs)
    // Hitbox: roughly 30px wide, 25px tall centered on position
    const shipBottom = p.position.y + 14; // Legs extend down
    const shipLeft = p.position.x - 14;
    const shipRight = p.position.x + 14;

    for (const plat of platforms) {
      // Simple AABB check for landing
      if (shipRight > plat.x && shipLeft < plat.x + plat.width &&
          Math.abs(shipBottom - plat.y) < 15 && p.velocity.y > 0) { 
            
        // Check landing conditions
        const speed = Math.sqrt(p.velocity.x**2 + p.velocity.y**2);
        // Angle must be close to -PI/2 (Upright)
        const angleDiff = Math.abs(Math.atan2(Math.sin(p.angle - (-Math.PI/2)), Math.cos(p.angle - (-Math.PI/2))));
        
        if (speed < MAX_LANDING_SPEED && angleDiff < MAX_LANDING_ANGLE) {
          if (!plat.visited) {
             onLand(plat.id);
          } else {
             // Resting on visited pad
             p.velocity.y = 0;
             p.velocity.x = 0;
             p.position.y = plat.y - 15; 
          }
        } else {
          // TOO FAST or BAD ANGLE - BOUNCE
          p.velocity.y *= -0.6; 
          p.velocity.x *= 0.8;  
          p.position.y = plat.y - 20; 
          
          if (Math.abs(speed) > 1) {
             audioService.playSound('crash'); 
          }
        }
      }
    }
  };

  const updateParticles = () => {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const part = particlesRef.current[i];
      part.x += part.vx;
      part.y += part.vy;
      
      // Slower decay for explosion particles
      const decay = gameState === GameState.EXPLODING ? 0.01 : 0.05;
      part.life -= decay;
      
      if (part.life <= 0) {
        particlesRef.current.splice(i, 1);
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Stars
    starsRef.current.forEach(star => {
        ctx.fillStyle = '#ffffff';
        // Simple twinkle effect
        const twinkle = Math.sin(Date.now() * 0.003 + star.x) * 0.3 + 0.7;
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;

    // Draw Platforms
    platforms.forEach(plat => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = plat.visited ? COLORS.platformVisited : plat.color;
      ctx.fillStyle = plat.visited ? COLORS.platformVisited : plat.color;
      ctx.fillRect(plat.x, plat.y, plat.width, 10);
      
      // Platform ID Text
      ctx.fillStyle = '#000';
      ctx.font = '10px Share Tech Mono';
      // Draw Point value if not visited
      const label = plat.visited ? 'OFF' : `${plat.points} PTS`;
      ctx.fillText(label, plat.x + 5, plat.y + 8);
    });
    ctx.shadowBlur = 0;

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(p.life, 1); // cap alpha
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.random() * 3, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw Player (Only if not exploded/game over)
    const showPlayer = gameState !== GameState.GAME_OVER && gameState !== GameState.EXPLODING;

    if (showPlayer) {
        const p = playerRef.current;
        
        ctx.save();
        ctx.translate(p.position.x, p.position.y);
        ctx.rotate(p.angle + Math.PI / 2); 

        ctx.strokeStyle = COLORS.playerStroke; 
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = COLORS.playerStroke;
        ctx.shadowBlur = 10;

        // --- DOODLE SHIP DRAWING ---
        
        // 1. Antenna (Left side of top)
        ctx.beginPath();
        ctx.moveTo(-4, -8);
        ctx.lineTo(-4, -16);
        ctx.stroke();

        // 2. Main Body (Pod Shape)
        ctx.beginPath();
        ctx.fillStyle = '#000';
        // Top flat
        ctx.moveTo(-7, -8);
        ctx.lineTo(7, -8);
        // Sides widening
        ctx.lineTo(10, 4);
        // Bottom flat
        ctx.lineTo(-10, 4);
        ctx.lineTo(-7, -8);
        ctx.fill();
        ctx.stroke();

        // 3. Face / Eyes
        ctx.beginPath();
        // Left Eye
        ctx.moveTo(-6, -2);
        ctx.lineTo(-2, -2);
        // Right Eye
        ctx.moveTo(2, -2);
        ctx.lineTo(6, -2);
        ctx.stroke();

        // 4. Landing Gear
        // Left Leg
        ctx.beginPath();
        ctx.moveTo(-8, 4); // Connect to body
        ctx.lineTo(-13, 14); // Leg down/out
        ctx.lineTo(-9, 14); // Foot inward
        ctx.stroke();

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(8, 4); // Connect to body
        ctx.lineTo(13, 14); // Leg down/out
        ctx.lineTo(9, 14); // Foot inward
        ctx.stroke();

        // Engine Glow if thrusting
        if (p.thrusting) {
            ctx.fillStyle = COLORS.thrust;
            ctx.beginPath();
            ctx.moveTo(-4, 6);
            ctx.lineTo(0, 18 + Math.random() * 10);
            ctx.lineTo(4, 6);
            ctx.fill();
        }

        ctx.restore();
    }
  };

  const tick = (time: number) => {
    // Handle first frame initialization
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // Cap dt to prevent spiral of death if tab is backgrounded (max 100ms step)
    const safeDt = Math.min(dt, 100); 

    accumulatorRef.current += safeDt;

    // Fixed time step loop
    while (accumulatorRef.current >= FIXED_TIME_STEP) {
      updatePhysics();
      updateParticles();
      accumulatorRef.current -= FIXED_TIME_STEP;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioService.playThrust(false); // Safety stop
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, platforms]);

  return (
    <div className="relative w-full h-full flex justify-center items-center bg-black">
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="w-full h-auto max-w-4xl border border-sky-900 shadow-2xl shadow-sky-900/20"
        style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
      />
    </div>
  );
};

export default GameEngine;
