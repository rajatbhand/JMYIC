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
import GuestVictoryDisplay from '@/components/audience/GuestVictoryDisplay';
import GuestLostDisplay from '@/components/audience/GuestLostDisplay';
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

  // Buzzer sound effect listener
  useEffect(() => {
    if (gameState && gameState.buzzerTrigger > 0) {
      console.log('🔔 Buzzer triggered, playing sound');
      soundPlayer.playSound('buzzer');
    }
  }, [gameState?.buzzerTrigger]);

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

  // Show Guest Victory display
  if (gameState.guestVictoryModalVisible) {
    return <GuestVictoryDisplay gameState={gameState} />;
  }

  // Show Guest Lost display
  if (gameState.guestLostModalVisible) {
    return <GuestLostDisplay gameState={gameState} />;
  }

  // Show game over screen only when explicitly triggered by operator
  if (gameState.gameOver) {
    return <GameOverDisplay gameState={gameState} />;
  }

  return (
    <div className="bg-cover flex flex-col h-screen overflow-hidden" 
         style={{ backgroundImage: "url('/images/backgrounds/BG-1.jpg')", backgroundColor: "#1a3a2e" }}>
      
      <div className="px-4 py-2 flex flex-col h-full max-h-screen">
        {/* Header - Fixed Height with viewport units */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0" style={{ height: '12vh' }}>
          {/* Left: Lives */}
          <div className="w-1/4 text-center">
            <LivesDisplay gameState={gameState} />
          </div>

          {/* Center: Title */}
          <div className="w-2/4 text-center">
            <h1 className="text-6xl xl:text-7xl font-bold text-white font-bebas leading-tight">Judge Me If You Can</h1>
            <p className="text-xl xl:text-2xl text-gray-300 font-bebas">Live Comedy Game Show</p>
          </div>

          {/* Right: Lock Status */}
          <div className="w-1/4 text-right flex flex-row justify-center items-center">
            <div className="text-gray-400 text-3xl xl:text-4xl uppercase tracking-wide mr-2 font-bebas">Lock</div>
            {gameState.lock.placed ? (
              <div className="flex items-center gap-1">
                <div className="text-3xl xl:text-4xl font-bold text-purple-400 font-bebas">Placed</div>
                <div className="text-3xl xl:text-4xl font-bold text-yellow-400 font-bebas">🔓</div>
              </div>
            ) : GameLogic.canPlaceLock(gameState) ? (
              <div className="flex items-center gap-1">
                <div className="text-3xl xl:text-4xl font-bold text-yellow-400 font-bebas">Available</div>
                <div className="text-3xl xl:text-4xl font-bold text-yellow-400 font-bebas">🔓</div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="text-3xl xl:text-4xl font-bold text-gray-500 font-bebas">Not Available</div>
                <div className="text-3xl xl:text-4xl font-bold text-yellow-400 font-bebas">🚫</div>
              </div>
            )}
          </div>
        </div>

        {/* Prize Tier - Fixed viewport height */}
        <div className="mb-3 flex-shrink-0" style={{ height: '20vh' }}>
          <PrizeLadder gameState={gameState} />
        </div>

        {/* Question Box - Remaining viewport height */}
        <div className="flex-1 min-h-0" style={{ maxHeight: '65vh' }}>
          <QuestionDisplay gameState={gameState} />
        </div>
      </div>
    </div>
  );
}