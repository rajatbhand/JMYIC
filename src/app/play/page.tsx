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

export default function PlayPage() {
  // authChecked: true once onAuthStateChanged fires (or 5s timeout elapses)
  const [authChecked, setAuthChecked] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayAlongUser | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [existingAnswer, setExistingAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastQuestionIdRef = useRef<string | null>(null);

  // Firebase Auth — 5s timeout so a slow/broken auth SDK never blocks the page forever
  useEffect(() => {
    const timeout = setTimeout(() => setAuthChecked(true), 5000);

    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
        clearTimeout(timeout);
        setFirebaseUser(user);
        setAuthChecked(true);
      });
    } catch (err) {
      console.error('Auth init error:', err);
      clearTimeout(timeout);
      setAuthChecked(true);
    }

    return () => {
      clearTimeout(timeout);
      unsub?.();
    };
  }, []);

  // RTDB game state — subscribe once, no initializeGame needed (read-only page)
  useEffect(() => {
    const unsub = gameStateManager.subscribeToGameState(setGameState);
    return () => unsub();
  }, []);

  // Fetch existing answer when question changes
  useEffect(() => {
    if (!profile || !gameState?.currentQuestion) return;
    const questionId = gameState.currentQuestion.id;
    if (questionId === lastQuestionIdRef.current) return;
    lastQuestionIdRef.current = questionId;
    setExistingAnswer(null);
    getDoc(doc(playAlongResponsesRef(questionId), profile.uid))
      .then(snap => {
        if (snap.exists()) {
          setExistingAnswer(snap.data().answer as 'A' | 'B' | 'C' | 'D');
        }
      })
      .catch(() => {});
  }, [gameState?.currentQuestion?.id, profile]);

  const handleAnswerSubmit = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!profile || !gameState?.currentQuestion || submitting) return;
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
          questionNumber: gameState.currentQuestionNumber,
        },
        { merge: true }
      );
    } catch {
      setExistingAnswer(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  // 1. Waiting for onAuthStateChanged (max 5s before timeout kicks in)
  if (!authChecked) {
    return <WaitingScreen message="Connecting..." />;
  }

  // 2. Not signed in
  if (!firebaseUser) {
    return <AuthScreen onAuthSuccess={user => setFirebaseUser(user)} />;
  }

  // 3. Signed in, no game profile yet — ProfileSetup auto-loads existing profiles from Firestore
  if (!profile) {
    return <ProfileSetup user={firebaseUser} onProfileComplete={p => setProfile(p)} />;
  }

  // 4. Profile ready, RTDB not loaded yet or game not started
  if (!gameState) {
    return (
      <WaitingScreen
        message="Waiting for the show to start..."
        subMessage={`Ready to play as ${profile.name}`}
      />
    );
  }

  // 5. Game over
  if (gameState.gameOver) {
    return (
      <WaitingScreen
        message="Game Over!"
        subMessage="Thanks for playing along."
      />
    );
  }

  // 6. Waiting for next question
  if (!gameState.currentQuestion) {
    return (
      <WaitingScreen
        message="Waiting for the next question..."
        subMessage={`Playing as ${profile.name}`}
      />
    );
  }

  // 7. Answer screen
  return (
    <AnswerScreen
      gameState={gameState}
      existingAnswer={existingAnswer}
      onAnswerSubmit={handleAnswerSubmit}
    />
  );
}
