'use client';

import React, { useState, useEffect } from 'react';
import { db, questionsDocRef } from '@/lib/firebase';
import { getDoc } from 'firebase/firestore';
import { gameStateManager } from '@/lib/gameState';
import { soundPlayer } from '@/lib/sounds';
import type { GameState, Question } from '@/lib/types';
import GameControls from '@/components/operator/GameControls';
import QuestionPool from '@/components/operator/QuestionPool';
import CSVUpload from '@/components/operator/CSVUpload';

export default function OperatorPanel() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let keepAliveCleanup: (() => void) | null = null;

    const initialize = async () => {
      try {
        setLoading(true);
        
        // Initialize game state
        await gameStateManager.initializeGame();
        
        // Subscribe to real-time updates
        unsubscribe = gameStateManager.subscribeToGameState((state) => {
          setGameState(state);
          setLoading(false);
        });

        // Start keep-alive for long discussions
        keepAliveCleanup = gameStateManager.startKeepAlive();

        // Load questions (we'll implement this in next step)
        await loadQuestions();
        
      } catch (err) {
        console.error('Error initializing operator panel:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (unsubscribe) unsubscribe();
      if (keepAliveCleanup) keepAliveCleanup();
      gameStateManager.cleanup();
    };
  }, []);

  const loadQuestions = async () => {
    try {
      // Fetch questions directly from Firebase
      const questionsRef = collection(db, 'questions');
      const questionsQuery = query(questionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(questionsQuery);
      
      const questionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];
      
      setQuestions(questionsData);
    } catch (err) {
      console.error('Error loading questions:', err);
    }
  };

  const handleError = (error: string) => {
    setError(error);
    setTimeout(() => setError(null), 5000); // Auto-clear after 5 seconds
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Operator Panel...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Failed to load game state</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-10 py-6 justify-center">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Judge Me If You Can</h1>
        <p className="text-gray-300">Operator Control Panel</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500 text-white rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* 3-Column Layout: CSV Upload (30%) | Question Pool (30%) | Game Controls (30%) */}
      <div className="flex gap-6 h-full justify-center">
        
        {/* Left Column: CSV Upload (20%) */}
        <div className="w-[30%] flex-shrink-0">
          <CSVUpload 
            onSuccess={loadQuestions}
            onError={handleError}
          />
        </div>

        {/* Center Column: Question Pool (50%) */}
        <div className="w-[30%] flex-shrink-0">
          <QuestionPool 
            questions={questions}
            gameState={gameState}
            onError={handleError}
            onQuestionSelected={loadQuestions}
          />
        </div>

        {/* Right Column: Game Controls (30%) */}
        <div className="w-[30%] flex-shrink-0">
          <GameControls 
            gameState={gameState} 
            onError={handleError}
            onQuestionUsed={loadQuestions}
          />
        </div>
      </div>
    </div>
  );
}