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
          const isGuestAnswer = gameState.currentQuestionAnswerRevealed && question.guest_answer === option.key;
          const showResult = gameState.panelGuessChecked;

          return (
            <div
              key={option.key}
              className={`p-6 rounded-xl transition-all duration-700 ${
                isGuestAnswer && showResult
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-xl shadow-green-500/50 scale-105'
                  : isPanelGuess && showResult && !isGuestAnswer
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-xl shadow-red-500/50'
                  : isPanelGuess && !showResult
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-500/50'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  isGuestAnswer && showResult
                    ? 'bg-green-800 text-green-100'
                    : isPanelGuess && showResult && !isGuestAnswer
                    ? 'bg-red-800 text-red-100'
                    : isPanelGuess && !showResult
                    ? 'bg-blue-800 text-blue-100'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {option.key}
                </div>
                
                <div className="flex-1">
                  <div className={`text-lg font-medium ${
                    isGuestAnswer && showResult || (isPanelGuess && showResult && !isGuestAnswer) || (isPanelGuess && !showResult)
                      ? 'text-white'
                      : 'text-gray-300'
                  }`}>
                    {option.text}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center space-x-2">
                  {isPanelGuess && !showResult && (
                    <span className="text-blue-200 text-xl">🎯</span>
                  )}
                  {isGuestAnswer && showResult && (
                    <span className="text-green-200 text-xl">✅</span>
                  )}
                  {isPanelGuess && showResult && !isGuestAnswer && (
                    <span className="text-red-200 text-xl">❌</span>
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
          <div className="text-blue-400 text-lg font-semibold">
            🎯 Panel guessed: {gameState.panelGuess}
          </div>
        )}

        {gameState.panelGuessChecked && gameState.needsManualReveal && (
          <div className="text-orange-400 text-lg font-semibold animate-pulse">
            🔍 Revealing guest answer...
          </div>
        )}

        {gameState.currentQuestionAnswerRevealed && (
          <div className="text-green-400 text-lg font-semibold">
            🎉 Guest answer revealed: {question.guest_answer}
          </div>
        )}
      </div>
    </div>
  );
}