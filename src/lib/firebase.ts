import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import type { GameState } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyATZxvQOsml1OuAu36x682kvNLdQbY66l8",
  authDomain: "jmyic-ffc7a.firebaseapp.com",
  projectId: "jmyic-ffc7a",
  storageBucket: "jmyic-ffc7a.firebasestorage.app",
  messagingSenderId: "782936467903",
  appId: "1:782936467903:web:5467291d78cee96750190a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with optimized settings for real-time performance
export const db = getFirestore(app);

// Add connection verification and optimize for real-time sync
if (typeof window !== 'undefined') {
  console.log('Firebase initialized for project:', firebaseConfig.projectId);
  
  // Enable network for faster sync
  enableNetwork(db).catch(console.error);
}

// Document references
export const gameDocRef = doc(collection(db, "games"), "game1");
export const questionsDocRef = doc(collection(db, "questions"), "pool");

// Default game state  
export const defaultGameState: GameState = {
  currentQuestion: null,
  currentQuestionNumber: 1,
  panelGuess: '',
  panelGuessSubmitted: false,
  panelGuessChecked: false,
  lives: 2, // Start with 2 lives
  lifeUsed: false,
  questionsAnswered: 0,
  panelCorrectAnswers: 0,
  prize: 0,
  pendingAdvancement: false,
  gameOver: false,
  softEliminated: false,
  currentQuestionAnswerRevealed: false,
  needsManualReveal: false,
  allOrNothingActive: false,
  allOrNothingAttempt: 0,
  allOrNothingComplete: false,
  allOrNothingWon: false,
  allOrNothingLastGuess: '',
  allOrNothingLastGuessCorrect: false,
  allOrNothingAttempt1Guess: '',
  allOrNothingAttempt1Correct: false,
  allOrNothingAttempt2Guess: '',
  allOrNothingAttempt2Correct: false,
  lock: {
    placed: false,
    level: null,
  },
  lockedMoney: 0,
  usedQuestions: {},
  lastActivity: new Date().toISOString(),
  documentVersion: '3.0'
};

// Prize tiers
export const PRIZE_TIERS = [
  { level: 1, amount: 2000, displayText: '₹2K' },
  { level: 2, amount: 4000, displayText: '₹4K' },
  { level: 3, amount: 8000, displayText: '₹8K' },
  { level: 4, amount: 12000, displayText: '₹12K' },
  { level: 5, amount: 20000, displayText: '₹20K' },
  { level: 6, amount: 30000, displayText: '₹30K' },
  { level: 7, amount: 50000, displayText: '₹50K' },
] as const;