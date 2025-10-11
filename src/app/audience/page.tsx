'use client';

import React, { useState, useEffect } from 'react';
import { gameStateManager } from '@/lib/gameState';
import { soundPlayer } from '@/lib/sounds';
import type { GameState } from '@/lib/types';
import PrizeLadder from '@/components/audience/PrizeLadder';
import QuestionDisplay from '@/components/audience/QuestionDisplay';
import LivesDisplay from '@/components/audience/LivesDisplay';
import GameOverDisplay from '@/components/audience/GameOverDisplay';
import AllOrNothingDisplay from '@/components/audience/AllOrNothingDisplay';

export default function AudienceDisplay() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initialize = async () => {
      try {
        // Initialize game state
        await gameStateManager.initializeGame();
        
        // Initialize sound system
        await soundPlayer.preloadSounds();
        console.log('Sound system initialized on audience page');
        
        // Make soundPlayer available globally for testing
        if (typeof window !== 'undefined') {
          (window as any).soundPlayer = soundPlayer;
        }
        
        // Subscribe to real-time updates
        unsubscribe = gameStateManager.subscribeToGameState((state) => {
          setGameState(state);
          setLastUpdate(new Date().toLocaleTimeString());
          setLoading(false);
        });
        
      } catch (err) {
        console.error('Error initializing audience display:', err);
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (unsubscribe) unsubscribe();
      gameStateManager.cleanup();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading Show...</div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Judge Me If You Can</div>
          <div className="text-gray-300">Waiting for game to start...</div>
        </div>
      </div>
    );
  }

  // Show All or Nothing display
  if (gameState.allOrNothingActive) {
    return <AllOrNothingDisplay gameState={gameState} />;
  }

  // Show game over screen only when explicitly triggered by operator
  if (gameState.gameOver) {
    return <GameOverDisplay gameState={gameState} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-6xl font-bold text-white mb-2">Judge Me If You Can</h1>
        <p className="text-xl text-gray-300">Live Comedy Game Show</p>
        
        {/* Connection Status */}
        <div className="mt-4 text-sm text-gray-400">
          <span className="inline-flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Live • Last update: {lastUpdate}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Prize Ladder */}
          <div className="lg:col-span-1">
            <PrizeLadder gameState={gameState} />
          </div>

          {/* Center: Question Display */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              <QuestionDisplay gameState={gameState} />
              <LivesDisplay gameState={gameState} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}