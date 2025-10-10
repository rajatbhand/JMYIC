export interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  guest_answer: 'A' | 'B' | 'C' | 'D';
}

export interface GameState {
  // Current question data
  currentQuestion: Question | null;
  currentQuestionNumber: number;
  
  // Panel interaction
  panelGuess: 'A' | 'B' | 'C' | 'D' | '';
  panelGuessSubmitted: boolean;
  panelGuessChecked: boolean;
  
  // Game progression  
  lives: number;
  lifeUsed: boolean;
  questionsAnswered: number;
  panelCorrectAnswers: number; // Track panel correct guesses for game end
  prize: number;
  pendingAdvancement: boolean; // Guest won round, waiting for next question to advance
  
  // Game status
  gameOver: boolean;
  softEliminated: boolean;
  currentQuestionAnswerRevealed: boolean;
  needsManualReveal: boolean;
  
  // All or Nothing phase
  allOrNothingActive: boolean;
  allOrNothingAttempt: number; // 0 = not started, 1 = first attempt, 2 = second attempt
  allOrNothingComplete: boolean;
  allOrNothingWon: boolean;
  
  // All or Nothing attempt tracking
  allOrNothingLastGuess: string; // Track last guess for highlighting
  allOrNothingLastGuessCorrect: boolean; // Track if last guess was correct
  allOrNothingAttempt1Guess: string; // Track attempt 1 guess
  allOrNothingAttempt1Correct: boolean; // Track if attempt 1 was correct
  allOrNothingAttempt2Guess: string; // Track attempt 2 guess
  allOrNothingAttempt2Correct: boolean; // Track if attempt 2 was correct
  
  // Lock system
  lock: {
    placed: boolean;
    level: number | null;
  };
  lockedMoney: number;
  
  // Question management
  usedQuestions: Record<string, boolean>;
  
  // Metadata
  lastActivity: string;
  documentVersion: string;
}

export interface PrizeTier {
  level: number;
  amount: number;
  displayText: string;
}

export interface SoundEffect {
  name: string;
  file: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QuestionPool {
  questions: Question[];
  lastUpdated: string;
}