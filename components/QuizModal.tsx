
import React, { useState, useEffect } from 'react';
import { MathQuestion } from '../types';
import { audioService } from '../services/audioService';

interface QuizModalProps {
  question: MathQuestion | null;
  onCorrect: () => void;
  onTimeUp: () => void;
  currentFuel: number;
  initialTime: number;
}

const QuizModal: React.FC<QuizModalProps> = ({ question, onCorrect, onTimeUp, currentFuel, initialTime }) => {
  const [timer, setTimer] = useState(initialTime);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!question) return;
    
    setTimer(initialTime);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question, onTimeUp, initialTime]);

  const handleAnswer = (ans: number) => {
    if (selected !== null) return; // Prevent double click
    setSelected(ans);

    if (question && ans === question.answer) {
      audioService.playSound('success');
      setTimeout(onCorrect, 500);
    } else {
      audioService.playSound('crash'); // Fail sound
      setTimeout(onTimeUp, 500); // Wrong answer = failure
    }
  };

  if (!question) return <div className="text-white">Loading Fusion Data...</div>;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="bg-slate-900 border-2 border-sky-500 rounded-lg max-w-lg w-full shadow-[0_0_30px_rgba(14,165,233,0.5)] flex overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Left Section: Quiz */}
        <div className="flex-1 p-8">
          <h2 className="text-2xl text-sky-400 mb-4 font-bold text-center">FUEL RECHARGE</h2>
          
          <div className="mb-6">
            <p className="text-gray-300 text-sm mb-2">Solve:</p>
            <p className="text-3xl text-white font-mono text-center border-y border-slate-700 py-4 bg-slate-800">
              {question.question}
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-sky-200 text-sm">Time:</span>
            <span className={`text-2xl font-bold ${timer < 4 ? 'text-red-500 animate-pulse' : 'text-sky-400'}`}>
              {timer}s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                disabled={selected !== null}
                className={`p-3 rounded text-lg font-bold transition-all
                  ${selected === opt 
                    ? (opt === question.answer ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400')
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-sky-400 text-sky-100'
                  }
                  ${selected !== null && selected !== opt ? 'opacity-50' : ''}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Fuel Gauge */}
        <div className="w-24 bg-slate-950 border-l border-sky-900 p-4 flex flex-col items-center justify-center">
          <span className="text-xs text-sky-500 mb-2 tracking-wider">LEVEL</span>
          <div className="relative w-8 h-48 bg-slate-900 rounded-full border border-slate-700 overflow-hidden">
            {/* Fill */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-700 to-amber-400 transition-all duration-500"
              style={{ height: `${currentFuel}%` }}
            />
            {/* Markers */}
            <div className="absolute top-1/4 left-0 right-0 h-px bg-slate-800/50"></div>
            <div className="absolute top-2/4 left-0 right-0 h-px bg-slate-800/50"></div>
            <div className="absolute top-3/4 left-0 right-0 h-px bg-slate-800/50"></div>
          </div>
          <span className="text-lg font-bold text-amber-500 mt-2 font-mono">{Math.round(currentFuel)}%</span>
        </div>

      </div>
    </div>
  );
};

export default QuizModal;
