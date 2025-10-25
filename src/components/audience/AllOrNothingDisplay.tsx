import React, { useEffect, useState } from "react";
import type { GameState } from "@/lib/types";
import { soundPlayer } from "@/lib/sounds";
import { GameLogic } from "@/utils/gameLogic";
import confetti from "canvas-confetti";

interface AllOrNothingDisplayProps {
  gameState: GameState;
}

export default function AllOrNothingDisplay({
  gameState,
}: AllOrNothingDisplayProps) {
  // Track processed attempts to prevent duplicate audio
  const [processedAttempts, setProcessedAttempts] = useState<Set<string>>(new Set());

  // Play audio when panel guess is checked during All or Nothing (synced with visual highlighting)
  useEffect(() => {
    console.log('🔍 Primary audio effect triggered with state:', {
      panelGuessChecked: gameState.panelGuessChecked,
      panelGuess: gameState.panelGuess,
      currentQuestion: !!gameState.currentQuestion,
      allOrNothingActive: gameState.allOrNothingActive,
      attempt: gameState.allOrNothingAttempt,
    });

    // DISABLED: Primary audio system disabled in favor of backup system
    // The backup system is more reliable and prevents duplicate audio
    console.log('🔇 Primary audio system disabled - using backup system only');
    
    /*
    if (
      gameState.panelGuessChecked &&
      gameState.panelGuess &&
      gameState.currentQuestion &&
      gameState.allOrNothingActive
    ) {
      // Create unique key for this attempt
      const attemptKey = `${gameState.allOrNothingAttempt}-${gameState.panelGuess}-${gameState.currentQuestion.id}`;
      
      // Skip if we already processed this attempt
      if (processedAttempts.has(attemptKey)) {
        console.log('🔇 Skipping duplicate audio for attempt:', attemptKey);
        return;
      }

      console.log('🎵 Playing All or Nothing audio for attempt:', attemptKey);
      
      const isCorrect = GameLogic.isPanelGuessCorrectWithContext(
        gameState.panelGuess,
        gameState.currentQuestion.guest_answer,
        gameState.currentQuestion
      );

      // Determine what sound to play based on who wins this attempt
      let soundToPlay: string;
      if (isCorrect) {
        // Panel correct = Panel wins = Play Correct.mp3
        soundToPlay = "panelCorrect";
        console.log('🎵 Panel correct - playing panelCorrect sound');
      } else {
        // Panel wrong - check if this results in guest winning
        if (gameState.allOrNothingComplete && gameState.allOrNothingWon) {
          // Guest wins (panel failed final attempt) = Play Correct.mp3
          soundToPlay = "panelCorrect";
          console.log('🎵 Guest wins - playing panelCorrect sound');
        } else {
          // Panel wrong but game continues = Play Wrong.mp3
          soundToPlay = "panelWrong";
          console.log('🎵 Panel wrong - playing panelWrong sound');
        }
      }

      soundPlayer.playSound(soundToPlay);
      
      // Mark this attempt as processed
      setProcessedAttempts(prev => new Set([...prev, attemptKey]));
    }
    */
  }, [
    gameState.panelGuessChecked,
    gameState.panelGuess,
    gameState.allOrNothingComplete,
    gameState.allOrNothingWon,
    gameState.allOrNothingAttempt,
    gameState.currentQuestion?.id,
    processedAttempts,
  ]);

  // Play audio when a new question appears during All or Nothing
  useEffect(() => {
    if (
      gameState.currentQuestion &&
      gameState.allOrNothingActive &&
      !gameState.panelGuessSubmitted
    ) {
      console.log("🎵 Playing All or Nothing question selection audio");
      soundPlayer.playSound("questionSelection");
    }
  }, [gameState.currentQuestion?.id, gameState.allOrNothingActive]);

  // Play audio when panel selects an option during All or Nothing
  useEffect(() => {
    if (
      gameState.panelGuessSubmitted &&
      gameState.panelGuess &&
      !gameState.panelGuessChecked &&
      gameState.allOrNothingActive
    ) {
      console.log("🎵 Playing All or Nothing panel option selection audio");
      soundPlayer.playSound("questionSelection");
    }
  }, [
    gameState.panelGuessSubmitted,
    gameState.panelGuess,
    gameState.allOrNothingActive,
  ]);

  // Reset processed attempts when All or Nothing starts fresh
  useEffect(() => {
    if (gameState.allOrNothingActive && gameState.allOrNothingAttempt === 1) {
      console.log('🔄 Resetting processed attempts for new All or Nothing phase');
      setProcessedAttempts(new Set());
    }
  }, [gameState.allOrNothingActive, gameState.currentQuestion?.id]);

  // Backup audio system - triggers on attempt-specific data changes
  useEffect(() => {
    if (!gameState.allOrNothingActive || !gameState.currentQuestion) return;

    // Check attempt 1
    if (gameState.allOrNothingAttempt1Guess && !processedAttempts.has(`attempt1-${gameState.allOrNothingAttempt1Guess}`)) {
      const attemptKey = `attempt1-${gameState.allOrNothingAttempt1Guess}`;
      console.log('🎵 Backup audio: Processing attempt 1', attemptKey);
      
      if (gameState.allOrNothingAttempt1Correct) {
        soundPlayer.playSound("panelCorrect");
        console.log('🎵 Backup: Attempt 1 correct');
      } else {
        soundPlayer.playSound("panelWrong");
        console.log('🎵 Backup: Attempt 1 wrong');
      }
      
      setProcessedAttempts(prev => new Set([...prev, attemptKey]));
    }

    // Check attempt 2
    if (gameState.allOrNothingAttempt2Guess && !processedAttempts.has(`attempt2-${gameState.allOrNothingAttempt2Guess}`)) {
      const attemptKey = `attempt2-${gameState.allOrNothingAttempt2Guess}`;
      console.log('🎵 Backup audio: Processing attempt 2', attemptKey);
      
      if (gameState.allOrNothingAttempt2Correct) {
        soundPlayer.playSound("panelCorrect");
        console.log('🎵 Backup: Attempt 2 correct');
      } else {
        // On second wrong attempt, play wrong sound first
        // Guest wins sound will be handled by modal system
        soundPlayer.playSound("panelWrong");
        console.log('🎵 Backup: Attempt 2 wrong');
      }
      
      setProcessedAttempts(prev => new Set([...prev, attemptKey]));
    }
  }, [
    gameState.allOrNothingAttempt1Guess,
    gameState.allOrNothingAttempt1Correct,
    gameState.allOrNothingAttempt2Guess,
    gameState.allOrNothingAttempt2Correct,
    gameState.allOrNothingActive,
    gameState.currentQuestion?.id,
    processedAttempts,
  ]);

  // Enhanced confetti animation when guest wins
  useEffect(() => {
    if (gameState.allOrNothingModalVisible && gameState.allOrNothingWon) {
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 1000,
      };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Multiple confetti bursts from different positions
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Cleanup interval if component unmounts or modal closes
      return () => clearInterval(interval);
    }
  }, [gameState.allOrNothingModalVisible, gameState.allOrNothingWon]);

  // Play audio when modal is shown
  useEffect(() => {
    if (gameState.allOrNothingModalVisible) {
      // Guest wins = play Correct.mp3
      // Panel wins = play Wrong.mp3
      const soundToPlay = gameState.allOrNothingWon ? 'panelCorrect' : 'panelWrong';
      console.log('🎵 All or Nothing modal shown - playing:', soundToPlay, 'Guest won:', gameState.allOrNothingWon);
      soundPlayer.playSound(soundToPlay);
    }
  }, [gameState.allOrNothingModalVisible]);

  return (
    <div
      className="min-h-screen bg-contain"
      style={{
        backgroundImage: "url('/images/backgrounds/BG-1.jpg')",
        backgroundColor: "#1a3a2e",
      }}
    >
      {/* Header */}
      <div className="text-center py-4 mb-6">
        <h1 className="text-6xl font-bebas text-white mb-2 animate-pulse font-bebas">
          🎰 ALL OR NOTHING 🎰
        </h1>
        <p className="text-2xl text-yellow-300 font-bebas tracking-wide">
          FINAL GAMBLE - GET RICH OR GO HOME!
        </p>
      </div>

      <div className="container mx-auto px-6">
        <div className="flex justify-around w-full mb-8 py-2 game-card-gradient rounded-lg">
          {/* Left: Prize Display */}
          <div className="text-center flex items-end">
            <div className="text-yellow-100 text-4xl font-bebas mr-4">
              PLAYING FOR
            </div>
            <div className="text-6xl font-bebas text-white">₹50,000</div>
          </div>

          {/* Attempt Indicator */}
          <div className="flex justify-center space-x-4 items-center">
            {[1, 2].map((attempt) => (
              <div
                key={attempt}
                className={`px-4 py-2 rounded-full text-2xl tracking-wide font-bebas text-center ${
                  attempt === gameState.allOrNothingAttempt
                    ? gameState.panelGuessChecked
                      ? "bg-red-600 text-white" // Checked
                      : "bg-orange-500 text-white animate-pulse" // Current
                    : attempt < gameState.allOrNothingAttempt
                    ? "bg-gray-600 text-gray-300" // Past
                    : "bg-gray-400 text-gray-600" // Future
                }`}
              >
                Attempt {attempt}
              </div>
            ))}
          </div>
        </div>
        {/* bottom: Question */}
        <div className="mx-auto w-full">
          <div className="game-card-gradient border-2 border-yellow-400 rounded-lg px-8 py-4 mb-6">
            {!gameState.currentQuestion ? (
              <div className="text-center py-12">
                <div className="text-yellow-400 text-lg font-bebas mb-4">
                  ⏳ WAITING FOR FINAL QUESTION
                </div>
                <div className="text-gray-300 text-sm">
                  Operator is selecting the question for All or Nothing...
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  {/* <div className="text-yellow-400 text-sm font-bebas mb-2">
                    FINAL QUESTION
                  </div> */}
                  <h2 className="text-yellow-400 text-5xl font-bebas leading-tight mb-6 text-center">
                    {gameState.currentQuestion.question}
                  </h2>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { letter: "A", text: gameState.currentQuestion.option_a },
                    { letter: "B", text: gameState.currentQuestion.option_b },
                    { letter: "C", text: gameState.currentQuestion.option_c },
                    { letter: "D", text: gameState.currentQuestion.option_d },
                  ].map((option) => (
                    <div
                      key={option.letter}
                      className={`border-2 rounded-lg transition-all duration-700 ${(() => {
                        const correctAnswer =
                          gameState.currentQuestion.guest_answer;
                        const isCorrectAnswer = option.letter === correctAnswer;

                        // Check if this option was guessed in attempt 1
                        const isAttempt1Guess =
                          gameState.allOrNothingAttempt1Guess === option.letter;
                        const attempt1Correct =
                          gameState.allOrNothingAttempt1Correct;

                        // Check if this option was guessed in attempt 2
                        const isAttempt2Guess =
                          gameState.allOrNothingAttempt2Guess === option.letter;
                        const attempt2Correct =
                          gameState.allOrNothingAttempt2Correct;

                        // Check current attempt guess
                        const isCurrentGuess =
                          gameState.panelGuess === option.letter;

                        // Priority order for highlighting:
                        // 1. Current attempt (if in progress) - orange
                        // 2. Correct guesses - green
                        // 3. Wrong guesses - red
                        // 4. Correct answer (if revealed and no other highlighting) - green
                        // 5. Default - gray

                        if (
                          isCurrentGuess &&
                          gameState.panelGuessSubmitted &&
                          !gameState.panelGuessChecked
                        ) {
                          return "bg-orange-600 border-orange-400 text-white"; // Current locked guess
                        }

                        if (isAttempt1Guess && attempt1Correct) {
                          return "bg-green-700 border-green-500 text-white"; // Attempt 1 correct
                        }

                        if (isAttempt2Guess && attempt2Correct) {
                          return "bg-green-700 border-green-500 text-white"; // Attempt 2 correct
                        }

                        if (isAttempt1Guess && !attempt1Correct) {
                          return "bg-red-700 border-red-500 text-white"; // Attempt 1 wrong
                        }

                        if (isAttempt2Guess && !attempt2Correct) {
                          return "bg-red-700 border-red-500 text-white"; // Attempt 2 wrong
                        }

                        if (
                          gameState.currentQuestionAnswerRevealed &&
                          isCorrectAnswer
                        ) {
                          return "bg-green-700 border-green-500 text-white"; // Correct answer revealed
                        }

                        return "bg-yellow-400 border-yellow-600 text-green-900"; // Default
                      })()}`}
                    >
                      <div className="flex items-start m-1 p-4 rounded-sm">
                        <span className="text-4xl font-bebas font-bold mr-4">
                          {option.letter}.
                        </span>
                        <span className="text-4xl font-bebas tracking-wide">{option.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* All or Nothing Result Modals */}
      {gameState.allOrNothingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          {gameState.allOrNothingWon ? (
            /* Guest Win Modal - ₹50,000 + Confetti */
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl p-8 max-w-4xl mx-4 text-center shadow-2xl border-4 border-green-400 animate-bounce">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl lg:text-5xl font-bebas text-white mb-4 animate-pulse">
                CONGRATULATIONS!
              </h2>
              <div className="text-yellow-300 text-2xl lg:text-3xl font-bebas mb-4">
                GUEST WINS
              </div>
              <div className="text-6xl lg:text-7xl font-bebas text-white mb-4">
                ₹50,000
              </div>
              <div className="text-green-200 text-lg lg:text-xl">
                Panel failed both attempts! 🎊
              </div>
            </div>
          ) : (
            /* Panel Win Modal - Simple Bouncing Card */
            <div className="bg-gradient-to-br from-red-700 to-red-900 rounded-3xl p-12 max-w-2xl mx-4 text-center shadow-2xl border-4 border-red-500 animate-bounce">
              <div className="text-8xl mb-6">💀</div>
              <h2 className="text-6xl font-bebas text-white mb-4">GAME OVER</h2>
              <div className="text-red-300 text-3xl font-bebas mb-4">
                PANEL WINS
              </div>
              <div className="text-8xl font-bebas text-white mb-4">₹0</div>
              <div className="text-red-200 text-xl">
                Panel answered correctly! 😭
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
