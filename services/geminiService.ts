
import { MathQuestion } from "../types";

interface MathProblem {
  a: number;
  b: number;
  product: number;
}

// Generate all possible problems 1x1 to 9x9
const ALL_PROBLEMS: MathProblem[] = [];
for (let i = 1; i <= 9; i++) {
  for (let j = 1; j <= 9; j++) {
    ALL_PROBLEMS.push({ a: i, b: j, product: i * j });
  }
}

export const generateMathQuestion = (
  difficulty: 'EASY' | 'MEDIUM' | 'HARD', 
  excludeAnswers: number[]
): MathQuestion => {
  
  let min, max;
  // Ranges specified by user
  switch (difficulty) {
    case 'EASY': min = 1; max = 5; break;
    case 'MEDIUM': min = 3; max = 7; break;
    case 'HARD': min = 5; max = 9; break;
    default: min = 1; max = 9;
  }

  // Filter based on difficulty criteria (both factors must be in range)
  let candidates = ALL_PROBLEMS.filter(p => 
    p.a >= min && p.a <= max && 
    p.b >= min && p.b <= max
  );

  // Filter exclusions (unique answers)
  let available = candidates.filter(p => !excludeAnswers.includes(p.product));

  // Fallback if exclusions leave us empty (unlikely unless maxed out)
  if (available.length === 0) {
    available = candidates; 
  }

  // Pick random
  const problem = available[Math.floor(Math.random() * available.length)];
  
  // Generate Options
  const answer = problem.product;
  const options = new Set<number>();
  options.add(answer);

  // Try to generate plausible distractors close to the answer
  let attempts = 0;
  while(options.size < 4 && attempts < 50) {
    attempts++;
    const offset = Math.floor(Math.random() * 11) - 5; // -5 to +5
    const val = answer + offset;
    
    if (val > 0 && val !== answer) {
        options.add(val);
    }
  }

  // If still not enough (e.g. answer is 1 or 2), fill with small random numbers
  while(options.size < 4) {
    const r = Math.floor(Math.random() * 20) + 1;
    if (r !== answer) options.add(r);
  }

  return {
    question: `${problem.a} x ${problem.b} = ?`,
    answer: answer,
    options: Array.from(options).sort(() => Math.random() - 0.5)
  };
};
