import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, connectFirestoreEmulator } from 'firebase/firestore';
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
export const db = getFirestore(app);

// Add connection verification
if (typeof window !== 'undefined') {
  console.log('Firebase initialized for project:', firebaseConfig.projectId);
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
  lives: 1,
  lifeUsed: false,
  questionsAnswered: 0,
  panelCorrectAnswers: 0,
  prize: 0,
  gameOver: false,
  softEliminated: false,
  currentQuestionAnswerRevealed: false,
  needsManualReveal: false,
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