// src/components/AudienceDisplay.js

import React, { useEffect, useState } from 'react';
import socket from './socket';
import soundEffects from './soundEffects';

function AudienceDisplay() {
  const [gameState, setGameState] = useState(null);
  const [prevState, setPrevState] = useState(null);

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);
    });
    return () => {
      socket.off('game_state');
    };
  }, []);

  // Sound effects for state changes (no changes needed here)
  useEffect(() => {
    if (!gameState || !prevState) {
      setPrevState(gameState);
      return;
    }
    // ... your existing sound logic remains the same
    setPrevState(gameState);
  }, [gameState, prevState]);

  const getCurrentQuestion = () => {
    return gameState.currentQuestion || null;
  };

  const renderLives = () => {
    const lives = gameState.lives !== undefined ? gameState.lives : 1;
    return (
      <div className="absolute top-5 left-5 flex items-center z-50">
        <span className="text-white font-bold mr-2 drop-shadow-lg text-[clamp(0.9rem,1.8vw,1.5rem)]"> {/* Adjusted */}
          Mystery Guest Life:
        </span>
        <div 
          className="transition-all duration-500 text-[clamp(2.5rem,5vw,5rem)]" /* Adjusted */
          style={{
            color: lives >= 1 ? '#ff4757' : '#2f3542',
            textShadow: lives >= 1 ? '0 0 15px rgba(255,71,87,0.8), 0 0 30px rgba(255,71,87,0.4)' : 'none',
            transform: lives >= 1 ? 'scale(1)' : 'scale(0.8)',
            filter: lives >= 1 ? 'brightness(1)' : 'brightness(0.3)'
          }}>
          {lives >= 1 ? '❤️' : '🖤'}
        </div>
      </div>
    );
  };

  const renderGameOver = () => {
    const lives = gameState.lives || 0;
    const lifeUsed = gameState.lifeUsed || false;
    const isSecondMatch = lifeUsed && lives === 0;
    const finalPrize = gameState.lockedMoney || gameState.prize || 0;
    return (
      <div className="text-center text-white py-16 px-5">
        <div className="font-bold text-red-500 drop-shadow-2xl mb-10 text-[clamp(3rem,8vw,10rem)]"> {/* Adjusted */}
          💀 GAME OVER 💀
        </div>
        <div className="drop-shadow-lg mb-10 text-[clamp(1.8rem,4vw,4.5rem)]"> {/* Adjusted */}
          {isSecondMatch ? 'Second Match After Life Lost!' : 'Mystery Guest Eliminated!'}
        </div>
        <div className="font-bold text-green-500 drop-shadow-2xl mb-5 text-[clamp(2.2rem,5vw,6rem)]"> {/* Adjusted */}
          🔒 Final Prize: ₹{finalPrize.toLocaleString()}
        </div>
        <div className="flex justify-center mt-10">
          <div className="filter brightness-50 text-[clamp(4rem,10vw,12rem)]">🖤</div> {/* Adjusted */}
        </div>
      </div>
    );
  };

  const renderMainGame = () => {
    if (gameState.gameOver || gameState.round === 'game_over') {
      return renderGameOver();
    }
    
    const currentQuestion = getCurrentQuestion() || { text: 'No question selected', options: [] };
    const lock = gameState.lock || {};
    const prize = gameState.prize || 0;
    const panelGuesses = gameState.panelGuesses || [];
    const guestAnswers = gameState.guestAnswers || [];
    const currentQuestionIndex = gameState.questionsAnswered - 1;
    const lastPanelGuess = panelGuesses[currentQuestionIndex];
    const lastGuestAnswer = guestAnswers[currentQuestionIndex];
    const guestAnswerRevealed = gameState.guestAnswerRevealed && gameState.guestAnswerRevealed[currentQuestionIndex];
    const isAnswered = Boolean(lastPanelGuess && lastGuestAnswer && guestAnswerRevealed);

    const prizeTiers = [
      { amount: 2000, label: '₹2K', question: 1 },
      { amount: 4000, label: '₹4K', question: 2 },
      { amount: 8000, label: '₹8K', question: 3 },
      { amount: 12000, label: '₹12K', question: 4 },
      { amount: 20000, label: '₹20K', question: 5 },
      { amount: 30000, label: '₹30K', question: 6 },
      { amount: 50000, label: '₹50K', question: 7 }
    ];

    const renderPrizeLadder = (currentQuestionNumber) => (
      <div className="mb-[clamp(3rem,6vw,8rem)]"> {/* Adjusted */}
        <div className="bg-gradient-to-r from-[#1976D2] via-[#42A5F5] to-[#1976D2] rounded-full
                        p-[clamp(1rem,2vw,2.5rem)] my-[clamp(1.5rem,3vw,4rem)] mx-auto /* Adjusted */
                        max-w-[1200px] w-[90vw] lg:max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] /* Using fixed max-width for very large screens */
                        border-2 border-[#2196F3] shadow-blue-500/60 shadow-lg relative">
          <div className="font-bold text-white drop-shadow-md text-center text-[clamp(1.5rem,3vw,3.5rem)]"> {/* Adjusted */}
            Current Prize: ₹{prize.toLocaleString()}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 3xl:grid-cols-7 place-items-center
                        gap-[clamp(0.8rem,1.5vw,2rem)] mx-auto max-w-[1500px] w-[95vw] lg:max-w-[1700px] xl:max-w-[2000px]"> {/* Adjusted */}
          {prizeTiers.map((tier, index) => {
            const isCurrentQuestion = tier.question === currentQuestionNumber;
            const isLocked = lock.placed && lock.level === tier.question;
            const isMoneyLocked = gameState.lockedMoney >= tier.amount;
            
            let borderColor = 'border-[#6c2eb7]';
            let backgroundColor = 'bg-black/70';
            let glowColor = 'shadow-[#6c2eb7]/30';
            
            if (isMoneyLocked) {
              borderColor = 'border-green-500';
              backgroundColor = 'bg-green-500/30';
              glowColor = 'shadow-green-500/60';
            }
            if (isCurrentQuestion) {
              borderColor = 'border-orange-500';
              backgroundColor = 'bg-orange-500/30';
              glowColor = 'shadow-orange-500/80';
            }
            if (isLocked) {
              borderColor = 'border-red-500';
              backgroundColor = 'bg-red-500/30';
              glowColor = 'shadow-red-500/80';
            }

            return (
              <div key={index} className={`
                w-[clamp(4.5rem,9vw,9rem)] h-[clamp(4.5rem,9vw,9rem)] /* Adjusted */
                ${backgroundColor} ${borderColor} border-4 rounded-xl
                flex items-center justify-center
                shadow-xl ${glowColor} relative
                transform rotate-45 m-[clamp(0.4rem,1vw,1.25rem)]`}> {/* Adjusted */}
                <div className="transform -rotate-45 font-bold text-white text-center leading-none text-[clamp(1rem,2.2vw,2rem)]"> {/* Adjusted */}
                  {tier.label}
                </div>
                {isLocked && (
                  <div className="absolute -top-1 -right-1 transform -rotate-45 text-[clamp(1.8rem,3vw,3rem)]"> {/* Adjusted */}
                    🔒
                  </div>
                )}
                {isMoneyLocked && !isLocked && (
                  <div className="absolute -bottom-1 -right-1 transform -rotate-45 text-[clamp(1.5rem,2.5vw,2.5rem)]"> {/* Adjusted */}
                    💰
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="text-center p-[clamp(1rem,2vw,3rem)] relative w-full max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[2000px]"> {/* Adjusted */}
        {renderPrizeLadder(gameState.currentQuestionNumber)}
        
        <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-full
                        py-[clamp(1.8rem,4vw,5rem)] px-[clamp(1.8rem,5vw,7rem)] mx-auto /* Adjusted */
                        mb-[clamp(3rem,6vw,8rem)] w-full max-w-[1200px] lg:max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] /* Using fixed max-width for very large screens */
                        border-4 border-gray-400 shadow-lg shadow-black/30 relative">
          <div className="font-bold text-white drop-shadow-md text-[clamp(2.5rem,5.5vw,6.5rem)]"> {/* Adjusted */}
            {currentQuestion.text && currentQuestion.text !== 'No question selected' 
              ? currentQuestion.text 
              : 'Waiting for question selection...'}
          </div>
        </div>

        {currentQuestion.text && currentQuestion.text !== 'No question selected' && currentQuestion.options.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2
                          gap-[clamp(0.8rem,1.5vw,2rem)] max-w-[1400px] w-full mx-auto /* Adjusted */
                          mt-[clamp(2rem,4vw,5rem)]"> {/* Adjusted */}
            {currentQuestion.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isPanelGuess = lastPanelGuess === opt;
              const isGuestAnswer = lastGuestAnswer === opt;
              
              const isPanelGuessSubmitted = isPanelGuess && !lastGuestAnswer;
              const isPanelCorrect = isPanelGuess && lastPanelGuess === lastGuestAnswer;
              const isPanelIncorrect = isPanelGuess && lastPanelGuess !== lastGuestAnswer;
              
              const isCorrect = isAnswered && lastPanelGuess === lastGuestAnswer && opt === lastPanelGuess;
              const isPanelWrong = isAnswered && lastPanelGuess !== lastGuestAnswer && opt === lastPanelGuess;
              const isGuestCorrect = isAnswered && lastPanelGuess !== lastGuestAnswer && opt === lastGuestAnswer;

              let backgroundColor = 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]';
              let borderColor = 'border-gray-400';
              let boxShadow = 'shadow-lg shadow-black/30';
              
              if (isCorrect || isGuestCorrect) {
                  backgroundColor = 'bg-gradient-to-br from-green-500 via-green-600 to-green-700';
                  borderColor = 'border-green-500';
              } else if (isPanelWrong) {
                  backgroundColor = 'bg-gradient-to-br from-red-500 via-red-600 to-red-700';
                  borderColor = 'border-red-500';
              } else if (isPanelGuessSubmitted) {
                  backgroundColor = 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700';
                  borderColor = 'border-white';
                  boxShadow = 'shadow-lg shadow-orange-500/40';
              } else if (isPanelCorrect && lastGuestAnswer && !isAnswered) {
                  backgroundColor = 'bg-gradient-to-br from-green-500 via-green-600 to-green-700';
                  borderColor = 'border-green-500';
              } else if (isPanelIncorrect && lastGuestAnswer && !isAnswered) {
                  backgroundColor = 'bg-gradient-to-br from-red-500 via-red-600 to-red-700';
                  borderColor = 'border-red-500';
              }

              return (
                <div key={i} className={`rounded-full p-[clamp(0.8rem,1.8vw,2rem)] /* Adjusted */
                                        border-4 relative transition-all duration-300
                                        ${backgroundColor} ${borderColor} ${boxShadow}
                                        ${isAnswered ? 'scale-105' : 'scale-100'}`}>
                  <div className="flex items-center gap-[clamp(0.5rem,1vw,1.25rem)]"> {/* Adjusted */}
                    <div className="text-orange-500 font-bold drop-shadow-md w-[clamp(2rem,4vw,3.5rem)] text-left text-[clamp(1.8rem,4vw,3.5rem)]"> {/* Adjusted */}
                      {letter}
                    </div>
                    <div className="text-white font-bold drop-shadow-md flex-1 text-left text-[clamp(1.8rem,4vw,3.5rem)]"> {/* Adjusted */}
                      {opt}
                    </div>
                  </div>
                  
                  {isAnswered && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-8 font-bold text-[clamp(2.2rem,5vw,4rem)]"> {/* Adjusted */}
                      {isCorrect && <span className="text-green-500">✓</span>}
                      {isPanelWrong && <span className="text-red-500">✗</span>}
                      {isGuestCorrect && <span className="text-green-500">✓</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden
                    bg-gradient-to-br from-[#2d1b69] via-[#1a1a2e] to-[#0f3460] font-inter p-4">
      
      {gameState && gameState.round === 'main_game' && renderLives()}

      <div className="absolute inset-0 bg-repeat-linear bg-[length:4px_4px] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)] pointer-events-none" />
      
      <h1 className="text-orange-500 uppercase font-bold tracking-wider
                     drop-shadow-lg text-center mb-[clamp(1rem,3vw,4rem)] text-[clamp(1.5rem,3.5vw,3rem)]"> {/* Adjusted */}
        Judge Me If You Can
      </h1>
      
      {gameState ? (
        <div className="w-full flex justify-center">
          {gameState.round === 'main_game' ? (
            renderMainGame()
          ) : (
            <div className="text-center text-white drop-shadow-md text-[clamp(1rem,3vw,2.5rem)]"> {/* Adjusted */}
              Waiting for game to start...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-white drop-shadow-md text-[clamp(1rem,3vw,2.5rem)]"> {/* Adjusted */}
          Connecting to game server...
        </div>
      )}
    </div>
  );
}

export default AudienceDisplay;