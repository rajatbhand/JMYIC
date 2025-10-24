import React, { useEffect, useRef } from 'react';
import type { GameState } from '@/lib/types';
import { soundPlayer } from '@/lib/sounds';
import { GameLogic } from '@/utils/gameLogic';

interface QuestionDisplayProps {
  gameState: GameState;
}

export default function QuestionDisplay({ gameState }: QuestionDisplayProps) {
  const lastAudioPlayedRef = useRef<string>('');

  // Play audio when panel guess is checked (synced with visual highlighting)
  useEffect(() => {
    if (gameState.panelGuessChecked && gameState.panelGuess && gameState.currentQuestion) {
      // Create a unique key for this guess to prevent duplicate audio
      const guessKey = `${gameState.currentQuestion.id}-${gameState.panelGuess}-${gameState.panelGuessChecked}`;
      
      // Only play audio if we haven't already played it for this specific guess
      if (lastAudioPlayedRef.current !== guessKey) {
        const isCorrect = GameLogic.isPanelGuessCorrectWithContext(
          gameState.panelGuess,
          gameState.currentQuestion.guest_answer,
          gameState.currentQuestion
        );
        console.log('🔊 Playing panel result audio:', isCorrect ? 'Correct.mp3' : 'Wrong.mp3');
        soundPlayer.playSound(isCorrect ? 'panelCorrect' : 'panelWrong');
        lastAudioPlayedRef.current = guessKey;
      }
    }
    
    // Reset when a new question is selected
    if (!gameState.panelGuessChecked) {
      lastAudioPlayedRef.current = '';
    }
  }, [gameState.panelGuessChecked, gameState.panelGuess, gameState.currentQuestion]);

  // Play audio when guest answer is revealed (synced with visual reveal)
  useEffect(() => {
    if (gameState.currentQuestionAnswerRevealed && gameState.currentQuestion) {
      console.log('Playing reveal answer audio');
      soundPlayer.playSound('revealAnswer');
    }
  }, [gameState.currentQuestionAnswerRevealed, gameState.currentQuestion]);

  // Play audio when a new question appears (synced with question display)
  useEffect(() => {
    if (gameState.currentQuestion && !gameState.panelGuessSubmitted) {
      console.log('🎵 Playing question selection audio');
      soundPlayer.playSound('questionSelection');
    }
  }, [gameState.currentQuestion?.id]);

  // Play audio when panel selects an option (synced with option selection)
  useEffect(() => {
    if (gameState.panelGuessSubmitted && gameState.panelGuess && !gameState.panelGuessChecked) {
      console.log('🎵 Playing panel option selection audio');
      soundPlayer.playSound('questionSelection');
    }
  }, [gameState.panelGuessSubmitted, gameState.panelGuess]);

  if (!gameState.currentQuestion) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🎭</div>
        <div className="text-white text-4xl mb-4 font-bebas tracking-wider">WELCOME TO JUDGE ME IF YOU CAN!</div>
        <div className="text-yellow-400 text-xl font-bebas tracking-wide">
          THE MOST HILARIOUS GAME SHOW
        </div>
        <div className="text-gray-300 text-lg mt-4">
          Waiting for the first question...
        </div>
      </div>
    );
  }

  const question = gameState.currentQuestion;

  return (
    <div className="space-y-8">
      <div className="w-full mx-auto">
        {/* Question Card with Golden Border */}
        <div className="bg-transparent border-2 border-yellow-400 rounded-lg p-8 mb-8">
          {/* Header with Question Number and Lives */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-yellow-400 text-2xl font-bebas tracking-wider">
              QUESTION-{gameState.currentQuestionNumber}
            </div>
            <div className="flex space-x-2">
              {[1, 2, 3].map((life, index) => (
                <div 
                  key={index}
                  className="w-6 h-6 rounded-full border-2 border-yellow-400"
                />
              ))}
            </div>
          </div>
          
          {/* Question Text */}
          <div className="text-yellow-400 text-4xl md:text-5xl lg:text-6xl font-bebas leading-tight mb-8 text-center">
            {question.question}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: 'A', text: question.option_a },
              { key: 'B', text: question.option_b },
              { key: 'C', text: question.option_c },
              { key: 'D', text: question.option_d }
            ].map((option) => {
              const isPanelGuess = gameState.panelGuess === option.key;

              // Handle guest answer comparison
              const guestAnswerText = question.guest_answer?.toString().toUpperCase().trim();
              const optionText = option.text?.toUpperCase().trim();

              const isGuestAnswer = 
                guestAnswerText === option.key || // Letter format (A, B, C, D)
                guestAnswerText === optionText;   // Text format (actual answer text)

              const guestAnswerRevealed = gameState.currentQuestionAnswerRevealed;
              const panelGuessChecked = gameState.panelGuessChecked;

              // Determine styling based on game state
              let optionClasses = '';
              let textColor = 'text-white';

              if (guestAnswerRevealed) {
                if (isGuestAnswer) {
                  // Guest answer - always show as correct (green with glow)
                  optionClasses = `bg-green-500 border-green-600 shadow-lg shadow-green-500/50 scale-105`;
                  textColor = 'text-white';
                } else if (isPanelGuess && !isGuestAnswer) {
                  // Panel guess that was wrong - red with glow
                  optionClasses = `bg-red-500 border-red-600 shadow-lg shadow-red-500/50`;
                  textColor = 'text-white';
                } else {
                  // Other options - dark green dimmed
                  optionClasses = `bg-green-900 border-green-800 opacity-75`;
                  textColor = 'text-gray-300';
                }
              } else if (panelGuessChecked && isPanelGuess) {
                if (isGuestAnswer) {
                  // Panel guessed correctly - green with glow
                  optionClasses = `bg-green-500 border-green-600 shadow-lg shadow-green-500/50 scale-105`;
                  textColor = 'text-white';
                } else {
                  // Panel guessed wrong - red glow
                  optionClasses = `bg-red-500 border-red-600 shadow-lg shadow-red-500/50`;
                  textColor = 'text-white';
                }
              } else if (isPanelGuess && gameState.panelGuessSubmitted) {
                // Panel selected this option - yellow with glow
                optionClasses = `bg-blue-400 border-blue-500 shadow-lg shadow-blue-500/50 scale-105`;
                textColor = 'text-blue-900';
              } else {
                // Default state - dark green
                optionClasses = 'border-yellow-400 bg-yellow-400';
                textColor = 'text-green-900';
              }

              return (
                <div
                  key={option.key}
                  className={`border-2 rounded-lg transition-all duration-700 ${optionClasses}`}
                >
                  <div className="flex items-start m-1 p-4 rounded-sm">
                    <span className={`text-4xl font-bebas font-bold mr-4 ${textColor}`}>
                      {option.key}.
                    </span>
                    <span className={`text-4xl font-bebas tracking-wide ${textColor}`}>
                      {option.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        
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