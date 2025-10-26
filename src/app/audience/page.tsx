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
import { GameLogic } from '@/utils/gameLogic';


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
      <div className="min-h-screen bg-cover" 
           style={{ backgroundImage: "url('/images/backgrounds/BG-1.jpg')", backgroundColor: "#1a3a2e" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-xl font-bebas">Loading Show...</div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-cover flex items-center justify-center" 
           style={{ backgroundImage: "url('/images/backgrounds/BG-1.jpg')", backgroundColor: "#1a3a2e" }}>
        <div className="text-center">
          <div className="text-white text-2xl mb-4 font-bebas">Judge Me If You Can</div>
          <div className="text-gray-300 font-bebas">Waiting for game to start...</div>
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
    <div className="h-screen overflow-hidden bg-cover flex flex-col" 
         style={{ backgroundImage: "url('/images/backgrounds/BG-1.jpg')", backgroundColor: "#1a3a2e" }}>
      
      <div className="container mx-auto px-6 py-3 flex flex-col h-full">
        {/* Header - Fixed Height */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          {/* Left: Lives */}
          <div className="w-1/4 text-center">
            <LivesDisplay gameState={gameState} />
          </div>

          {/* Center: Title */}
          <div className="w-2/4 text-center">
            <h1 className="text-4xl font-bold text-white mb-1 font-bebas">Judge Me If You Can</h1>
            <p className="text-md text-gray-300 font-bebas">Live Comedy Game Show</p>
          </div>

          {/* Right: Lock Status */}
          <div className="w-1/4 text-right flex flex-row justify-center items-center">
            {/* Add your lock available component here */}
                      <div className="text-gray-400 text-2xl uppercase tracking-wide mr-3 font-bebas">Lock</div>
                      {gameState.lock.placed ? (
                        <div>
                          <div className="text-2xl font-bold text-purple-400 font-bebas">Placed 🔒</div>
                        </div>
                      ) : GameLogic.canPlaceLock(gameState) ? (
                        <div>
                          <div className="text-2xl font-bold text-yellow-400 font-bebas">Available 🔓</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-bold text-gray-500 font-bebas">Not Available 🚫</div>
                        </div>
                      )}
          </div>
        </div>

        {/* Prize Tier - Fixed Height */}
        <div className="mb-3 flex-shrink-0">
          <PrizeLadder gameState={gameState} />
        </div>

        {/* Question Box - Flexible Height */}
        <div className="flex-1 min-h-0">
          <QuestionDisplay gameState={gameState} />
        </div>
      </div>
    </div>
  );
}