import React from 'react';
import type { GameState } from '@/lib/types';

interface QuestionDisplayProps {
  gameState: GameState;
}

export default function QuestionDisplay({ gameState }: QuestionDisplayProps) {
  if (!gameState.currentQuestion) {
    return (
      <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-2xl p-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🎭</div>
          <div className="text-white text-2xl mb-4">Welcome to Judge Me If You Can!</div>
          <div className="text-gray-300 text-lg">
            The most hilarious game show where we test how well you know our guest!
          </div>
          <div className="text-gray-400 text-base mt-4">
            Waiting for the first question...
          </div>
        </div>
      </div>
    );
  }

  const question = gameState.currentQuestion;

  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-2xl p-8">
      {/* Question Header */}
      <div className="text-center mb-8">
        <div className="text-yellow-400 text-lg uppercase tracking-wide font-semibold">
          Question {gameState.currentQuestionNumber}
        </div>
        <div className="text-white text-3xl md:text-4xl font-bold mt-2 leading-tight">
          {question.question}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { key: 'A', text: question.option_a },
          { key: 'B', text: question.option_b },
          { key: 'C', text: question.option_c },
          { key: 'D', text: question.option_d }
        ].map((option) => {
          const isPanelGuess = gameState.panelGuess === option.key;
          
          // Handle guest answer comparison - check both letter format and text format
          const guestAnswerText = question.guest_answer?.toString().toUpperCase().trim();
          const optionText = option.text?.toUpperCase().trim();
          
          const isGuestAnswer = 
            guestAnswerText === option.key || // Letter format (A, B, C, D)
            guestAnswerText === optionText;   // Text format (actual answer text)
          
          const guestAnswerRevealed = gameState.currentQuestionAnswerRevealed;
          const panelGuessChecked = gameState.panelGuessChecked;
          
          // Debug logging for guest answer highlighting
          if (guestAnswerRevealed && option.key === 'A') {
            console.log('Guest answer debug (updated):', {
              guestAnswerRaw: question.guest_answer,
              guestAnswerText,
              optionKey: option.key,
              optionText,
              isGuestAnswer,
              guestAnswerRevealed
            });
          }
          
          // Determine styling based on game state
          let optionStyle = '';
          let iconStyle = '';
          let statusIcon = '';

          if (guestAnswerRevealed) {
            // Step 3: Guest answer revealed - show final colors
            if (isGuestAnswer) {
              // Guest answer is always green when revealed
              optionStyle = 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-xl shadow-green-500/50 scale-105';
              iconStyle = 'bg-green-800 text-green-100';
              statusIcon = '✅';
            } else if (isPanelGuess && gameState.panelGuess !== question.guest_answer) {
              // Panel guess that is wrong (not the guest answer) stays red
              optionStyle = 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-xl shadow-red-500/50';
              iconStyle = 'bg-red-800 text-red-100';
              statusIcon = '❌';
            } else {
              // Other options remain neutral
              optionStyle = 'bg-gray-700 text-gray-300';
              iconStyle = 'bg-gray-600 text-gray-300';
            }
          } else if (panelGuessChecked && isPanelGuess) {
            // Step 2: Panel guess checked - show green if correct, red if wrong
            if (gameState.panelGuess === question.guest_answer) {
              // Panel = Guest (2-step flow) - green
              optionStyle = 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-xl shadow-green-500/50 scale-105';
              iconStyle = 'bg-green-800 text-green-100';
              statusIcon = '✅';
            } else {
              // Panel ≠ Guest (3-step flow) - red
              optionStyle = 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-xl shadow-red-500/50';
              iconStyle = 'bg-red-800 text-red-100';
              statusIcon = '❌';
            }
          } else if (isPanelGuess && gameState.panelGuessSubmitted) {
            // Step 1: Panel guess submitted but not checked yet - orange
            optionStyle = 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-xl shadow-orange-500/50';
            iconStyle = 'bg-orange-800 text-orange-100';
            statusIcon = '🎯';
          } else {
            // Default neutral styling
            optionStyle = 'bg-gray-700 hover:bg-gray-600 text-gray-300';
            iconStyle = 'bg-gray-600 text-gray-300';
          }

          return (
            <div
              key={option.key}
              className={`p-6 rounded-xl transition-all duration-700 ${optionStyle}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${iconStyle}`}>
                  {option.key}
                </div>
                
                <div className="flex-1">
                  <div className={`text-lg font-medium ${
                    guestAnswerRevealed || (isPanelGuess && gameState.panelGuessSubmitted)
                      ? 'text-white'
                      : 'text-gray-300'
                  }`}>
                    {option.text}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center space-x-2">
                  {statusIcon && (
                    <span className="text-2xl">{statusIcon}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Game Status Messages */}
      <div className="text-center space-y-3">
        {!gameState.panelGuessSubmitted && (
          <div className="text-yellow-400 text-lg font-semibold animate-pulse">
            🎤 Panel is discussing...
          </div>
        )}

        {gameState.panelGuessSubmitted && !gameState.panelGuessChecked && (
          <div className="text-orange-400 text-lg font-semibold">
            🎯 Panel guessed: {gameState.panelGuess} • Waiting to check panel guess...
          </div>
        )}

        {gameState.panelGuessChecked && !gameState.currentQuestionAnswerRevealed && (
          <div className="space-y-2">
            {gameState.panelGuess === question.guest_answer ? (
              <div className="text-green-400 text-lg font-semibold">
                ✅ Panel got it right! Round complete.
              </div>
            ) : (
              <div className="text-red-400 text-lg font-semibold">
                ❌ Panel was wrong! Waiting for guest answer reveal...
              </div>
            )}
          </div>
        )}

        {gameState.currentQuestionAnswerRevealed && (
          <div className="space-y-2">
            <div className="text-green-400 text-lg font-semibold">
              🎉 Guest answer revealed: {question.guest_answer}
            </div>
            {gameState.panelGuess === question.guest_answer ? (
              <div className="text-green-300 text-base">
                ✅ Panel got it right!
              </div>
            ) : (
              <div className="text-gray-300 text-base">
                Panel: {gameState.panelGuess} (❌) • Guest: {question.guest_answer} (✅) • Guest advances!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}