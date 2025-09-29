import React from 'react';
import type { GameState } from '@/lib/types';
import { PRIZE_TIERS } from '@/lib/firebase';
import { GameLogic } from '@/utils/gameLogic';

interface PrizeLadderProps {
  gameState: GameState;
}

export default function PrizeLadder({ gameState }: PrizeLadderProps) {
  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-2xl p-6">
      <h2 className="text-3xl font-bold text-center text-white mb-6">Prize Ladder</h2>
      
      <div className="space-y-3">
        {PRIZE_TIERS.map((tier) => {
          const isCurrent = tier.level === gameState.currentQuestionNumber;
          const isCompleted = tier.level < gameState.currentQuestionNumber;
          const isLocked = gameState.lock.placed && tier.level === gameState.lock.level;
          
          return (
            <div
              key={tier.level}
              className={`relative p-4 rounded-lg transition-all duration-500 ${
                isCurrent
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
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  🔒
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCurrent
                      ? 'bg-yellow-800 text-yellow-100'
                      : isCompleted
                      ? 'bg-green-800 text-green-100'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {tier.level}
                  </div>
                  
                  <div className={`text-2xl font-bold ${
                    isCurrent ? 'text-black' : isCompleted ? 'text-white' : 'text-gray-300'
                  }`}>
                    {tier.displayText}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center space-x-2">
                  {isCompleted && (
                    <span className="text-green-200 text-lg">✓</span>
                  )}
                  {isCurrent && (
                    <span className="text-yellow-800 text-lg animate-pulse">⭐</span>
                  )}
                </div>
              </div>

              {/* Full amount display */}
              <div className={`text-sm mt-1 ${
                isCurrent ? 'text-yellow-800' : isCompleted ? 'text-green-200' : 'text-gray-400'
              }`}>
                ₹{tier.amount.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lock Status */}
      {gameState.lock.placed && (
        <div className="mt-6 p-4 bg-purple-900 bg-opacity-50 rounded-lg border border-purple-500">
          <div className="text-center">
            <div className="text-purple-300 text-sm uppercase tracking-wide">Lock Placed</div>
            <div className="text-white text-xl font-bold">
              ₹{gameState.lockedMoney.toLocaleString()} Guaranteed
            </div>
          </div>
        </div>
      )}

      {/* Current Prize Highlight */}
      <div className="mt-6 text-center">
        <div className="text-gray-400 text-sm uppercase tracking-wide">Playing For</div>
        <div className="text-white text-3xl font-bold">
          ₹{GameLogic.getPrizeForLevel(gameState.currentQuestionNumber).toLocaleString()}
        </div>
      </div>
    </div>
  );
}