import React from 'react';
import type { GameState } from '@/lib/types';
import { GameLogic } from '@/utils/gameLogic';

interface LivesDisplayProps {
  gameState: GameState;
}

export default function LivesDisplay({ gameState }: LivesDisplayProps) {
  return (
    <div className="bg-transparent">
      <div className="flex items-center justify-between">
        {/* Lives Status */}
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2 font-bebas">Lives</div>
          {/*<div className={`text-4xl font-bold font-bebas ${
            gameState.lives > 0 ? 'text-red-400' : 'text-gray-500'
          }`}>
            {gameState.lives}/2
          </div>*/}
          <div className="flex justify-center mt-2 space-x-1">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className={`text-3xl transition-all duration-500 ${
                  i < gameState.lives 
                    ? 'text-red-500 drop-shadow-lg' 
                    : 'text-gray-600 opacity-50'
                }`}
              >
                ❤️
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {gameState.lives > 0 
              ? `${gameState.lives === 2 ? 'Full health' : `${gameState.lives} life remaining`}`
              : 'No lives left'
            }
          </div>
        </div>

        {/* Game Status */}
        {/*<div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2 font-bebas">Game Status</div>
          <div className={`text-2xl font-bold font-bebas ${
            gameState.gameOver 
              ? 'text-red-400' 
              : gameState.lives === 2 
              ? 'text-green-400' 
              : gameState.lives === 1 
              ? 'text-yellow-400' 
              : 'text-red-400'
          }`}>
            {gameState.gameOver 
              ? '💀 Game Over' 
              : gameState.lives === 2 
              ? '💪 Strong' 
              : gameState.lives === 1 
              ? '⚠️ Danger' 
              : '� Eliminated'
            }
          </div>
          <div className={`text-sm mt-1 ${
            gameState.gameOver 
              ? 'text-red-300' 
              : gameState.lives === 2 
              ? 'text-green-300' 
              : gameState.lives === 1 
              ? 'text-yellow-300' 
              : 'text-red-300'
          }`}>
            {gameState.gameOver 
              ? 'The game has ended'
              : gameState.lives === 2 
              ? 'All lives intact'
              : gameState.lives === 1 
              ? 'One mistake away from elimination'
              : 'No lives remaining'
            }
          </div>
        </div>*/}

        {/* Lock Status */}
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-wide mb-2 font-bebas">Lock</div>
          {gameState.lock.placed ? (
            <div>
              <div className="text-2xl font-bold text-purple-400 font-bebas">🔒 Placed</div>
              <div className="text-sm text-purple-300 mt-1">
                ₹{gameState.lockedMoney.toLocaleString()} guaranteed
              </div>
            </div>
          ) : GameLogic.canPlaceLock(gameState) ? (
            <div>
              <div className="text-2xl font-bold text-yellow-400 font-bebas">🔓 Available</div>
              <div className="text-sm text-yellow-300 mt-1">
                Can secure current prize
              </div>
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-gray-500 font-bebas">🚫 Not Available</div>
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