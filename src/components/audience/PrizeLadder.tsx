import React from 'react';
import type { GameState } from '@/lib/types';
import { PRIZE_TIERS } from '@/lib/firebase';
import { GameLogic } from '@/utils/gameLogic';

interface PrizeLadderProps {
  gameState: GameState;
}

export default function PrizeLadder({ gameState }: PrizeLadderProps) {
  return (
    <div className="bg-black/20 rounded-2xl p-2">

      {/* Bottom Info Row */}
      <div className="flex justify-between items-center mx-2">
        {/* Current Prize Highlight */}
        <div className="text-center">
          <div className="text-gray-400 text-xs uppercase tracking-wide font-bebas">Playing For</div>
          <div className="text-white text-2xl font-bold font-bebas">
            ₹{GameLogic.getPrizeForLevel(gameState.currentQuestionNumber).toLocaleString()}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-4 font-bebas">Prize Ladder</h2>

        {/* Lock Status */}
        {gameState.lock.placed ? (
          <div className="text-center">
            <div className="text-purple-300 text-xs uppercase tracking-wide font-bebas">Lock Placed</div>
            <div className="text-white text-lg font-bold font-bebas">
              ₹{gameState.lockedMoney.toLocaleString()} Guaranteed
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
      
      {/* Horizontal Prize Tier */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
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
              className={`relative px-4 py-4 rounded-lg transition-all duration-500 min-w-[120px] text-center ${
                guestWonCurrentRound
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-xl shadow-green-500/50 scale-105'
                  : isCurrent
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-black shadow-xl shadow-yellow-500/50 scale-105'
                  : isCompleted
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } ${
                isLocked ? 'ring-4 ring-purple-400 ring-opacity-75' : ''
              }`}
            >
              {/* Lock indicator */}
              {isLocked && (
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  🔒
                </div>
              )}

              {/* Level number */}
              {/* <div className={`text-2xl font-bold mb-1 font-bebas ${
                isCurrent ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-400'
              }`}>
                {tier.level}
              </div> */}
              
              {/* Prize amount */}
              <div className={`text-2xl font-bold font-bebas ${
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