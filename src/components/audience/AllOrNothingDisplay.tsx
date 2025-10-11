import React, { useEffect, useState } from 'react';
import type { GameState } from '@/lib/types';
import { soundPlayer } from '@/lib/sounds';
import { GameLogic } from '@/utils/gameLogic';

interface AllOrNothingDisplayProps {
  gameState: GameState;
}

export default function AllOrNothingDisplay({ gameState }: AllOrNothingDisplayProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Play audio when panel guess is checked during All or Nothing (synced with visual highlighting)
  useEffect(() => {
    if (gameState.panelGuessChecked && gameState.panelGuess && gameState.currentQuestion && gameState.allOrNothingActive) {
      const isCorrect = GameLogic.isPanelGuessCorrectWithContext(
        gameState.panelGuess,
        gameState.currentQuestion.guest_answer,
        gameState.currentQuestion
      );
      
      // Determine what sound to play based on who wins this attempt
      let soundToPlay: string;
      if (isCorrect) {
        // Panel correct = Panel wins = Play Correct.mp3
        soundToPlay = 'panelCorrect';
      } else {
        // Panel wrong - check if this results in guest winning
        if (gameState.allOrNothingComplete && gameState.allOrNothingWon) {
          // Guest wins (panel failed final attempt) = Play Correct.mp3
          soundToPlay = 'panelCorrect';
        } else {
          // Panel wrong but game continues = Play Wrong.mp3
          soundToPlay = 'panelWrong';
        }
      }
      
      soundPlayer.playSound(soundToPlay);
    }
  }, [gameState.panelGuessChecked, gameState.panelGuess, gameState.allOrNothingComplete, gameState.allOrNothingWon]);

  // Play audio when a new question appears during All or Nothing
  useEffect(() => {
    if (gameState.currentQuestion && gameState.allOrNothingActive && !gameState.panelGuessSubmitted) {
      console.log('🎵 Playing All or Nothing question selection audio');
      soundPlayer.playSound('questionSelection');
    }
  }, [gameState.currentQuestion?.id, gameState.allOrNothingActive]);

  // Play audio when panel selects an option during All or Nothing
  useEffect(() => {
    if (gameState.panelGuessSubmitted && gameState.panelGuess && !gameState.panelGuessChecked && gameState.allOrNothingActive) {
      console.log('🎵 Playing All or Nothing panel option selection audio');
      soundPlayer.playSound('questionSelection');
    }
  }, [gameState.panelGuessSubmitted, gameState.panelGuess, gameState.allOrNothingActive]);

  useEffect(() => {
    if (gameState.allOrNothingWon && gameState.allOrNothingComplete) {
      setShowConfetti(true);
    }
  }, [gameState.allOrNothingWon, gameState.allOrNothingComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti">
            {[...Array(100)].map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-6xl font-bold text-white mb-2 animate-pulse">
          🎰 ALL OR NOTHING 🎰
        </h1>
        <p className="text-2xl text-yellow-300 font-bold">
          FINAL GAMBLE - ₹50,000 FLAT!
        </p>
      </div>

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Left: Prize Display */}
          <div className="flex justify-center">
            <div className="bg-gradient-to-br from-yellow-600 to-orange-600 rounded-3xl p-8 shadow-2xl border-4 border-yellow-400 transform scale-110">
              <div className="text-center">
                <div className="text-yellow-100 text-lg font-semibold mb-2">PLAYING FOR</div>
                <div className="text-6xl font-bold text-white mb-2">₹50,000</div>
                <div className="text-yellow-100 text-sm">FLAT AMOUNT</div>
                
                {/* Attempt Indicator */}
                <div className="mt-6 flex justify-center space-x-4">
                  {[1, 2].map((attempt) => (
                    <div
                      key={attempt}
                      className={`px-4 py-2 rounded-full text-sm font-bold ${
                        attempt === gameState.allOrNothingAttempt
                          ? gameState.panelGuessChecked
                            ? 'bg-red-600 text-white'  // Checked
                            : 'bg-orange-500 text-white animate-pulse'  // Current
                          : attempt < gameState.allOrNothingAttempt
                          ? 'bg-gray-600 text-gray-300'  // Past
                          : 'bg-gray-400 text-gray-600'  // Future
                      }`}
                    >
                      Attempt {attempt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Question */}
          <div className="flex justify-center">
            <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md">
              {!gameState.currentQuestion ? (
                <div className="text-center py-12">
                  <div className="text-yellow-400 text-lg font-semibold mb-4">
                    ⏳ WAITING FOR FINAL QUESTION
                  </div>
                  <div className="text-gray-300 text-sm">
                    Operator is selecting the question for All or Nothing...
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="text-yellow-400 text-sm font-semibold mb-2">
                      FINAL QUESTION
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight">
                      {gameState.currentQuestion.question}
                    </h2>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {[
                      { letter: 'A', text: gameState.currentQuestion.option_a },
                      { letter: 'B', text: gameState.currentQuestion.option_b },
                      { letter: 'C', text: gameState.currentQuestion.option_c },
                      { letter: 'D', text: gameState.currentQuestion.option_d }
                    ].map((option) => (
                      <div
                        key={option.letter}
                        className={`p-3 rounded-lg border-2 transition-all duration-500 ${
                          (() => {
                            const correctAnswer = gameState.currentQuestion.guest_answer;
                            const isCorrectAnswer = option.letter === correctAnswer;
                            
                            // Check if this option was guessed in attempt 1
                            const isAttempt1Guess = gameState.allOrNothingAttempt1Guess === option.letter;
                            const attempt1Correct = gameState.allOrNothingAttempt1Correct;
                            
                            // Check if this option was guessed in attempt 2
                            const isAttempt2Guess = gameState.allOrNothingAttempt2Guess === option.letter;
                            const attempt2Correct = gameState.allOrNothingAttempt2Correct;
                            
                            // Check current attempt guess
                            const isCurrentGuess = gameState.panelGuess === option.letter;
                            
                            // Priority order for highlighting:
                            // 1. Current attempt (if in progress) - orange
                            // 2. Correct guesses - green
                            // 3. Wrong guesses - red
                            // 4. Correct answer (if revealed and no other highlighting) - green
                            // 5. Default - gray
                            
                            if (isCurrentGuess && gameState.panelGuessSubmitted && !gameState.panelGuessChecked) {
                              return 'bg-orange-600 border-orange-400 text-white'; // Current locked guess
                            }
                            
                            if (isAttempt1Guess && attempt1Correct) {
                              return 'bg-green-700 border-green-500 text-white'; // Attempt 1 correct
                            }
                            
                            if (isAttempt2Guess && attempt2Correct) {
                              return 'bg-green-700 border-green-500 text-white'; // Attempt 2 correct
                            }
                            
                            if (isAttempt1Guess && !attempt1Correct) {
                              return 'bg-red-700 border-red-500 text-white'; // Attempt 1 wrong
                            }
                            
                            if (isAttempt2Guess && !attempt2Correct) {
                              return 'bg-red-700 border-red-500 text-white'; // Attempt 2 wrong
                            }
                            
                            if (gameState.currentQuestionAnswerRevealed && isCorrectAnswer) {
                              return 'bg-green-700 border-green-500 text-white'; // Correct answer revealed
                            }
                            
                            return 'bg-gray-700 border-gray-600 text-gray-300'; // Default
                          })()
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="font-bold text-lg mr-3">{option.letter})</span>
                          <span className="text-sm">{option.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Result Display */}
                  {gameState.allOrNothingComplete && (
                    <div className="mt-6 text-center">
                      {gameState.allOrNothingWon ? (
                        <div className="bg-green-900 border-2 border-green-500 rounded-xl p-4">
                          <div className="text-green-400 text-2xl font-bold mb-2">
                            🎉 WINNER! 🎉
                          </div>
                          <div className="text-green-300 text-lg">
                            Guest wins ₹50,000!
                          </div>
                          <div className="text-green-200 text-sm mt-2">
                            Panel failed both attempts
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-900 border-2 border-red-500 rounded-xl p-4">
                          <div className="text-red-400 text-2xl font-bold mb-2">
                            💀 GAME OVER 💀
                          </div>
                          <div className="text-red-300 text-lg">
                            Guest gets ₹0
                          </div>
                          <div className="text-red-200 text-sm mt-2">
                            Panel got it right on attempt {gameState.allOrNothingAttempt}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        .confetti {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(45deg, #ffd700, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
          animation: confetti-fall linear infinite;
        }
        
        .confetti-piece:nth-child(odd) {
          background: linear-gradient(45deg, #ff6b6b, #ffd700);
          width: 8px;
          height: 8px;
          animation-duration: 3s;
        }
        
        .confetti-piece:nth-child(even) {
          background: linear-gradient(45deg, #4ecdc4, #45b7d1);
          width: 6px;
          height: 6px;
          animation-duration: 2.5s;
        }
        
        .confetti-piece:nth-child(3n) {
          background: linear-gradient(45deg, #96ceb4, #feca57);
          width: 4px;
          height: 4px;
          animation-duration: 4s;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}