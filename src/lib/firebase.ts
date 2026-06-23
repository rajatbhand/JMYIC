import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, enableNetwork } from 'firebase/firestore';
import type { GameState } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

// Initialize Firebase — exported so firebaseAuth.ts can reuse it
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with optimized settings for real-time performance
export const db = getFirestore(app);

// Add connection verification and optimize for real-time sync
if (typeof window !== 'undefined') {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown';
  console.log(`🔥 Firebase initialized for ${environment}:`, firebaseConfig.projectId);

  // Enable network for faster sync
  enableNetwork(db).catch(console.error);
}

// Document references
export const gameDocRef = doc(collection(db, "games"), "game1");
export const questionsDocRef = doc(collection(db, "questions"), "pool");

// Play Along collection references
export const playAlongUsersRef = collection(db, 'playAlongUsers');
export function playAlongResponsesRef(questionId: string) {
  return collection(db, 'playAlongAnswers', questionId, 'responses');
}

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
  pendingGameOver: false,
  softEliminated: false,
  currentQuestionAnswerRevealed: false,
  needsManualReveal: false,

  // Hide Option Feature
  hiddenOption: null,
  hideOptionUsed: false,

  // Option Reveal Feature
  revealedOptions: [],
  aonRevealedOptions: [],

  allOrNothingActive: false,
  allOrNothingAttempt: 0,
  allOrNothingComplete: false,
  allOrNothingWon: false,
  allOrNothingPendingPanelWin: false,
  allOrNothingPendingGuestWin: false,
  allOrNothingModalVisible: false,
  allOrNothingLastGuess: '',
  allOrNothingLastGuessCorrect: false,
  allOrNothingAttempt1Guess: '',
  allOrNothingAttempt1Correct: false,
  allOrNothingAttempt2Guess: '',
  allOrNothingAttempt2Correct: false,
  guestVictoryPending: false,
  guestVictoryModalVisible: false,
  guestLostPending: false,
  guestLostModalVisible: false,
  lock: {
    placed: false,
    level: null,
  },
  lockedMoney: 0,
  usedQuestions: {},
  buzzerTrigger: 0,
  show75_25Banner: false,
  showLogo: false,
  currentQuestionStartTime: null,
  playAlongAnswerWindowOpen: false,
  playAlongDisplayMode: 'none',
  playAlongDisplayEntries: [],
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