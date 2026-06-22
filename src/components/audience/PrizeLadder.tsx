import React from 'react';
import type { GameState } from '@/lib/types';
import { PRIZE_TIERS } from '@/lib/firebase';

interface PrizeLadderProps {
  gameState: GameState;
}

export default function PrizeLadder({ gameState }: PrizeLadderProps) {
  return (
    <div className="game-card-gradient rounded-lg p-3 h-full flex flex-col">

      {/* Lock Status Row - only shown when lock is placed */}
      {gameState.lock.placed && (
        <div className="flex justify-end mb-2 flex-shrink-0">
          <div className="text-center">
            <div className="text-purple-300 text-lg xl:text-xl uppercase tracking-wide font-bebas">Lock Placed</div>
            <div className="text-white text-3xl xl:text-4xl font-bold font-bebas">
              ₹{gameState.lockedMoney.toLocaleString()} Guaranteed
            </div>
          </div>
        </div>
      )}
      
      {/* Horizontal Prize Tier */}
      <div className="flex flex-wrap justify-center gap-3 flex-1 items-center">
        {PRIZE_TIERS.map((tier) => {
          const isCurrent = tier.level === gameState.currentQuestionNumber;
          const isCompleted = tier.level < gameState.currentQuestionNumber;
          const isLocked = gameState.lock.placed && tier.level === gameState.lock.level;
          
          // Check if guest won the current round (should show green)
          const guestWonCurrentRound = isCurrent && 
            gameState.currentQuestionAnswerRevealed && 
            gameState.pendingAdvancement;
          
          return (
            <div
              key={tier.level}
              className={`relative px-3 py-2 rounded-lg transition-all duration-500 w-[180px] h-[80px] text-center flex flex-col items-center justify-center ${
                guestWonCurrentRound
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-xl shadow-green-500/50 scale-105'
                  : isCurrent
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-xl shadow-yellow-500/50 scale-105'
                  : isCompleted
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white'
                  : 'game-card-gradient text-gray-300'
              } ${
                isLocked ? 'ring-4 ring-purple-400 ring-opacity-75' : ''
              }`}
            >
              {/* Lock indicator */}
              {isLocked && (
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  🔒
                </div>
              )}

              {/* "Playing For" label — only on the active tier */}
              {isCurrent && (
                <div className="text-xs xl:text-sm uppercase tracking-widest font-bebas leading-none mb-0.5 opacity-80">
                  Playing For
                </div>
              )}

              {/* Prize amount */}
              <div className={`text-3xl xl:text-4xl font-bold font-bebas leading-none ${
                isCurrent ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-300'
              }`}>
                {tier.displayText}
              </div>
            </div>
          );
        })}
      </div>

      
    </div>
  );
}