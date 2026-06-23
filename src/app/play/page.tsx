'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth } from '@/lib/firebaseAuth';
import { playAlongResponsesRef } from '@/lib/firebase';
import { gameStateManager } from '@/lib/gameState';
import type { GameState, PlayAlongUser } from '@/lib/types';
import AuthScreen from '@/components/playAlong/AuthScreen';
import ProfileSetup from '@/components/playAlong/ProfileSetup';
import AnswerScreen from '@/components/playAlong/AnswerScreen';
import WaitingScreen from '@/components/playAlong/WaitingScreen';

type Phase = 'loading' | 'auth' | 'profile' | 'playing';

export default function PlayPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayAlongUser | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [existingAnswer, setExistingAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lastQuestionIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setFirebaseUser(user);
      if (!user) {
        setPhase('auth');
      }
      // Profile check happens in ProfileSetup; once profile is set, phase → 'playing'
    });
    return () => unsub();
  }, []);

  // Subscribe to game state (read-only; no initializeGame)
  useEffect(() => {
    unsubscribeRef.current = gameStateManager.subscribeToGameState((state) => {
      setGameState(state);
    });
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // When question changes, fetch existing answer for new question
  useEffect(() => {
    if (!profile || !gameState?.currentQuestion) return;

    const questionId = gameState.currentQuestion.id;
    if (questionId === lastQuestionIdRef.current) return;

    lastQuestionIdRef.current = questionId;
    setExistingAnswer(null);

    getDoc(doc(playAlongResponsesRef(questionId), profile.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExistingAnswer(data.answer as 'A' | 'B' | 'C' | 'D');
      }
    }).catch(() => {/* ignore */});
  }, [gameState?.currentQuestion?.id, profile]);

  const handleAuthSuccess = (user: User) => {
    setFirebaseUser(user);
    setPhase('profile');
  };

  const handleProfileComplete = (p: PlayAlongUser) => {
    setProfile(p);
    setPhase('playing');
  };

  const handleAnswerSubmit = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!profile || !gameState?.currentQuestion || submitting) return;

    // Optimistic update
    setExistingAnswer(answer);
    setSubmitting(true);

    try {
      const questionId = gameState.currentQuestion.id;
      await setDoc(
        doc(playAlongResponsesRef(questionId), profile.uid),
        {
          answer,
          timestamp: Date.now(),
          name: profile.name,
          phone: profile.phone,
          questionId,
          questionNumber: gameState.currentQuestionNumber
        },
        { merge: true }
      );
    } catch {
      // Revert optimistic update on failure
      setExistingAnswer(null);
    } finally {
      setSubmitting(false);
    }
  };

  // Auth phase
  if (phase === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Profile setup phase
  if (phase === 'profile' && firebaseUser) {
    return (
      <ProfileSetup
        user={firebaseUser}
        onProfileComplete={handleProfileComplete}
      />
    );
  }

  // Initial loading (auth check not yet complete, or game state loading)
  if (phase === 'loading' || !gameState) {
    return <WaitingScreen message="Connecting..." />;
  }

  // If auth loaded but still need profile (returning user path)
  if (!profile && firebaseUser) {
    return (
      <ProfileSetup
        user={firebaseUser}
        onProfileComplete={handleProfileComplete}
      />
    );
  }

  // No profile and no user — redirect to auth
  if (!profile) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Game over
  if (gameState.gameOver) {
    return (
      <WaitingScreen
        message="Game Over!"
        subMessage="Thanks for playing along."
      />
    );
  }

  // No active question or window closed before question set
  if (!gameState.currentQuestion) {
    return (
      <WaitingScreen
        message="Waiting for the next question..."
        subMessage={`Playing as ${profile.name}`}
      />
    );
  }

  // Answer window open or closed — show answer screen
  return (
    <AnswerScreen
      gameState={gameState}
      existingAnswer={existingAnswer}
      onAnswerSubmit={handleAnswerSubmit}
    />
  );
}
