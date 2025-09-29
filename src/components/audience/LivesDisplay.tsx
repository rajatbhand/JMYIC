import React from 'react';
import type { GameState } from '@/lib/types';
import { GameLogic } from '@/utils/gameLogic';

interface LivesDisplayProps {
  gameState: GameState;
}

export default function LivesDisplay({ gameState }: LivesDisplayProps) {
  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-2xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lives Status */}
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Lives</div>
          <div className={`text-4xl font-bold ${
            gameState.lives > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {gameState.lives}
          </div>
          <div className="flex justify-center mt-2">
            {[...Array(1)].map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full mx-1 ${
                  i < gameState.lives ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Immunity Status */}
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Immunity</div>
          <div className={`text-2xl font-bold ${
            gameState.lifeUsed ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {gameState.lifeUsed ? '❌ Used' : '🛡️ Available'}
          </div>
          <div className={`text-sm mt-1 ${
            gameState.lifeUsed ? 'text-red-300' : 'text-yellow-300'
          }`}>
            {gameState.lifeUsed 
              ? 'One-time immunity has been used'
              : 'Can survive one wrong answer'
            }
          </div>
        </div>

        {/* Lock Status */}
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Lock</div>
          {gameState.lock.placed ? (
            <div>
              <div className="text-2xl font-bold text-purple-400">🔒 Placed</div>
              <div className="text-sm text-purple-300 mt-1">
                ₹{gameState.lockedMoney.toLocaleString()} guaranteed
              </div>
            </div>
          ) : GameLogic.canPlaceLock(gameState) ? (
            <div>
              <div className="text-2xl font-bold text-yellow-400">🔓 Available</div>
              <div className="text-sm text-yellow-300 mt-1">
                Can secure current prize
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-gray-500">🚫 Not Available</div>
              <div className="text-sm text-gray-400 mt-1">
                Use immunity first
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning Messages */}
      {gameState.softEliminated && (
        <div className="mt-6 p-4 bg-red-900 bg-opacity-50 rounded-lg border border-red-500">
          <div className="text-center">
            <div className="text-red-300 text-lg font-bold">⚠️ Soft Elimination</div>
            <div className="text-red-200 text-sm">
              Guest is eliminated but can still win their locked money
            </div>
          </div>
        </div>
      )}

      {gameState.lifeUsed && !gameState.lock.placed && GameLogic.canPlaceLock(gameState) && (
        <div className="mt-6 p-4 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-500">
          <div className="text-center">
            <div className="text-yellow-300 text-lg font-bold">💡 Lock Available</div>
            <div className="text-yellow-200 text-sm">
              Guest can now place a lock to secure their current prize
            </div>
          </div>
        </div>
      )}
    </div>
  );
}