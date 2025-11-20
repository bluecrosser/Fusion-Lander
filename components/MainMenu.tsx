
import React from 'react';
import { HighScore } from '../types';
import { audioService } from '../services/audioService';

interface MainMenuProps {
  onStart: (mode: 'LIGHT' | 'HEAVY') => void;
  highScores: HighScore[];
  lastScore?: number;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, highScores, lastScore }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white z-50 p-4">
      
      {/* Title */}
      <h1 className="text-5xl md:text-7xl font-black text-cyan-400 tracking-tighter mb-12 neon-text uppercase drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
        FUSION LANDER
      </h1>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* Left Panel: Flight Controls */}
        <div className="bg-slate-900/90 border border-slate-700 p-6 rounded-xl shadow-2xl flex flex-col">
          <h3 className="text-xl text-sky-400 font-bold mb-6 uppercase tracking-widest border-b border-slate-800 pb-4">
            Flight Controls
          </h3>
          
          <div className="space-y-4 text-sm text-slate-300 font-mono flex-1">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500 font-bold">THRUST</span>
              <span className="text-white tracking-wider">W / UP / SPACE</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500 font-bold">ROTATE</span>
              <span className="text-white tracking-wider">A / D / ARROWS</span>
            </div>
            
            <div className="mt-6 text-xs text-amber-400 leading-relaxed border border-amber-900/30 bg-amber-900/10 p-3 rounded">
              <span className="font-bold">WARNING:</span> LANDING GEAR IS SHOCK ABSORBENT BUT FUEL IS LIMITED.
              LAND SOFTLY FOR REFUELING (Speed &lt; 1.5).
            </div>
          </div>

          <div className="mt-8 flex gap-4 pt-4 border-t border-slate-800">
            <button 
              onClick={() => {
                audioService.playSound('click');
                onStart('LIGHT');
              }}
              className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded shadow-lg hover:shadow-sky-500/50 transition-all transform hover:translate-y-[-2px] active:translate-y-[0px] flex flex-col items-center justify-center"
            >
              <span className="uppercase tracking-wider text-sm">Light Lander</span>
              <span className="text-[10px] text-sky-200 mt-1 font-mono">AGILE / FAST</span>
            </button>

            <button 
              onClick={() => {
                audioService.playSound('click');
                onStart('HEAVY');
              }}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded border-2 border-slate-600 hover:border-slate-500 transition-all transform hover:translate-y-[-2px] active:translate-y-[0px] flex flex-col items-center justify-center"
            >
              <span className="uppercase tracking-wider text-sm">Heavy Lander</span>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">STABLE / SLOW</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Flight Logs */}
        <div className="bg-slate-900/90 border border-slate-700 p-6 rounded-xl shadow-2xl flex flex-col h-full">
          <h3 className="text-xl text-green-400 font-bold mb-6 uppercase tracking-widest border-b border-slate-800 pb-4">
            Flight Logs
          </h3>
          
          {/* Last Attempt Box */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6 mb-6 text-center shadow-inner">
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-2">Last Attempt</div>
            <div className="text-4xl text-white font-mono font-bold drop-shadow-md">
              {lastScore !== undefined ? lastScore : 0} <span className="text-lg text-slate-500">pts</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 max-h-64">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 text-left font-normal">Date</th>
                  <th className="pb-3 text-right font-normal">Score</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {highScores.length === 0 ? (
                  <tr><td colSpan={2} className="text-center py-4 text-slate-600 italic">No records found</td></tr>
                ) : (
                  highScores.map((hs, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 text-slate-400">{hs.date}</td>
                      <td className="py-3 text-right text-sky-400 font-bold">{hs.score}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MainMenu;
