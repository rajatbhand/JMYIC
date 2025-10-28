import React from 'react';
import type { GameState } from '@/lib/types';
import { PRIZE_TIERS } from '@/lib/firebase';
import { GameLogic } from '@/utils/gameLogic';

interface PrizeLadderProps {
  gameState: GameState;
}

export default function PrizeLadder({ gameState }: PrizeLadderProps) {
  return (
    <div className="game-card-gradient rounded-lg p-3 h-full flex flex-col">

      {/* Bottom Info Row */}
      <div className="flex justify-between items-start mb-2 flex-shrink-0">
        {/* Current Prize Highlight */}
        <div className="text-center">
          <div className="text-yellow-100 text-lg xl:text-xl uppercase tracking-wide font-bebas">Playing For</div>
          <div className="text-white text-3xl xl:text-4xl font-bold font-bebas">
            ₹{GameLogic.getPrizeForLevel(gameState.currentQuestionNumber).toLocaleString()}
          </div>
        </div>

        <h2 className="text-3xl xl:text-4xl text-center text-white font-bebas">Prize Ladder</h2>

        {/* Lock Status */}
        {gameState.lock.placed ? (
          <div className="text-center">
            <div className="text-purple-300 text-lg xl:text-xl uppercase tracking-wide font-bebas">Lock Placed</div>
            <div className="text-white text-3xl xl:text-4xl font-bold font-bebas">
              ₹{gameState.lockedMoney.toLocaleString()} Guaranteed
            </div>
          </div>
        ) : (
          <div></div>
        )}
      </div>
      
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
              className={`relative px-3 py-2 rounded-lg transition-all duration-500 w-[180px] h-[80px] text-center flex items-center justify-center ${
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

              {/* Level number */}
              {/* <div className={`text-2xl font-bold mb-1 font-bebas ${
                isCurrent ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-400'
              }`}>
                {tier.level}
              </div> */}
              
              {/* Prize amount */}
              <div className={`text-3xl xl:text-4xl font-bold font-bebas ${
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