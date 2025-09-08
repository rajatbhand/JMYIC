import React, { useEffect, useState } from 'react';
import socket from './socket';
import soundEffects from './soundEffects';

function AudienceDisplay() {
  const [gameState, setGameState] = useState(null);
  const [prevState, setPrevState] = useState(null);
  // const [soundEnabled, setSoundEnabled] = useState(true); // Removed as per user request

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);
    });
    return () => {
      socket.off('game_state');
    };
  }, []);

  // Sound effects for state changes
  useEffect(() => {
    if (!gameState || !prevState) {
      setPrevState(gameState);
      return;
    }

    const currentQuestionIndex = gameState.questionsAnswered - 1;
    const prevQuestionIndex = prevState.questionsAnswered - 1;
    
    // Panel guess submitted
    const panelGuesses = gameState.panelGuesses || [];
    const prevPanelGuesses = prevState.panelGuesses || [];
    const currentPanelGuess = panelGuesses[currentQuestionIndex];
    const prevPanelGuess = prevPanelGuesses[prevQuestionIndex];
    
    if (!prevPanelGuess && currentPanelGuess) {
      soundEffects.playSound('panelGuess');
    }
    
    // Guest answer revealed
    const guestAnswerRevealed = gameState.guestAnswerRevealed && gameState.guestAnswerRevealed[currentQuestionIndex];
    const prevGuestAnswerRevealed = prevState.guestAnswerRevealed && prevState.guestAnswerRevealed[prevQuestionIndex];
    
    if (!prevGuestAnswerRevealed && guestAnswerRevealed) {
      soundEffects.playSound('revealAnswer');
      
      // Play success/error sound based on correctness
      const guestAnswers = gameState.guestAnswers || [];
      const currentGuestAnswer = guestAnswers[currentQuestionIndex];
      
      if (currentPanelGuess === currentGuestAnswer) {
        soundEffects.playSound('correct');
      } else {
        soundEffects.playSound('wrong');
      }
    }
    
    // Lock placed
    const lock = gameState.lock || {};
    const prevLock = prevState.lock || {};
    
    if (!prevLock.placed && lock.placed) {
      soundEffects.playSound('lockPlaced');
    }
    
    // Life lost sound effect
    const livesChanged = gameState.lives !== prevState.lives;
    if (livesChanged && gameState.lives < (prevState.lives || 2)) {
      soundEffects.playSound('wrong'); // Use existing wrong sound for life lost
    }
    
    setPrevState(gameState);
  }, [gameState, prevState]);

  const handleToggleSound = () => {
    const newState = soundEffects.toggleSound();
    // setSoundEnabled(newState); // Removed as per user request
  };

  // No audience sound toggle; sounds play automatically

  // Helper function to get current question
  const getCurrentQuestion = () => {
    return gameState.currentQuestion || null;
  };

  // Lives display component
  const renderLives = () => {
    const lives = gameState.lives !== undefined ? gameState.lives : 1;
    
    return (
      <div className="absolute top-5 left-5 flex items-center z-50">
        <span className="text-white font-bold mr-2 drop-shadow-lg text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 3xl:text-4xl 4k:text-5xl 5k:text-6xl">
          Mystery Guest Life:
        </span>
        
        {/* Single Life Heart */}
        <div className="text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl 3xl:text-9xl 4k:text-[10rem] 5k:text-[12rem] transition-all duration-500"
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

  // Game over screen component
  const renderGameOver = () => {
    const lives = gameState.lives || 0;
    const lifeUsed = gameState.lifeUsed || false;
    const isSecondMatch = lifeUsed && lives === 0;
    const finalPrize = gameState.lockedMoney || gameState.prize || 0;
    
    return (
      <div className="text-center text-white py-16 px-5">
        <div className="text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] 3xl:text-[12rem] 4k:text-[14rem] 5k:text-[16rem] font-bold text-red-500 drop-shadow-2xl mb-10">
          💀 GAME OVER 💀
        </div>
        
        <div className="text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl 3xl:text-8xl 4k:text-9xl 5k:text-[10rem] mb-10 drop-shadow-lg">
          {isSecondMatch ? 
            'Second Match After Life Lost!' : 
            'Mystery Guest Eliminated!'}
        </div>
        
        <div className="text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl 3xl:text-9xl 4k:text-[10rem] 5k:text-[12rem] font-bold text-green-500 drop-shadow-2xl mb-5">
          🔒 Final Prize: ₹{finalPrize.toLocaleString()}
        </div>
        
        {/* Single Dead Heart */}
        <div className="flex justify-center mt-10">
          <div className="text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem] 3xl:text-[14rem] 4k:text-[16rem] 5k:text-[18rem] filter brightness-50">🖤</div>
        </div>
      </div>
    );
  };

  const renderMainGame = () => {
    // Check for game over first
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
    
    // Debug when guest answer changes
    if (lastGuestAnswer) {
      console.log('Guest answer loaded:', lastGuestAnswer);
    }
    
    // Debug guestAnswerRevealed flag
    console.log('guestAnswerRevealed flag:', guestAnswerRevealed);
    console.log('gameState.guestAnswerRevealed:', gameState.guestAnswerRevealed);
    console.log('currentQuestionIndex:', currentQuestionIndex);

    // Prize ladder configuration - NEW BRACKETS
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
      <div className="mb-8 lg:mb-10 xl:mb-12 2xl:mb-14 3xl:mb-16">
        {/* Current Prize Bar */}
        <div className="bg-gradient-to-r from-[#1976D2] via-[#42A5F5] to-[#1976D2] rounded-full
                    p-4 lg:p-5 xl:p-6 2xl:p-7 3xl:p-8 4k:p-9 5k:p-10
                    mx-auto my-5 lg:my-6 xl:my-7 2xl:my-8 3xl:my-9 4k:my-10 5k:my-12
                    max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] 2xl:max-w-[900px] 3xl:max-w-[1000px] 4k:max-w-[1200px] 5k:max-w-[1400px]
                    border-2 border-[#2196F3] shadow-blue-500/60 shadow-lg relative">
          <div className="font-bold text-white text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl drop-shadow-md text-center">
            Current Prize: ₹{prize.toLocaleString()}
          </div>
        </div>

        {/* Prize Tiers */}
        <div className="flex justify-center flex-wrap
                    gap-2 lg:gap-3 xl:gap-4 2xl:gap-5 3xl:gap-6 4k:gap-7 5k:gap-8
                    mx-auto max-w-[1000px] lg:max-w-[1100px] xl:max-w-[1200px] 2xl:max-w-[1400px] 3xl:max-w-[1600px] 4k:max-w-[1800px] 5k:max-w-[2000px]">
          {prizeTiers.map((tier, index) => {
            const isCurrentQuestion = tier.question === currentQuestionNumber;
            const isLocked = lock.placed && lock.level === tier.question;
            const isMoneyLocked = gameState.lockedMoney >= tier.amount;
            
            let borderColor = 'border-[#6c2eb7]'; // Purple for unreached
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
              <div key={index} className={`w-20 h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 2xl:w-32 2xl:h-32 3xl:w-36 3xl:h-36 4k:w-40 4k:h-40 5k:w-44 5k:h-44
                                ${backgroundColor} ${borderColor} border-4 rounded-xl
                                flex items-center justify-center
                                shadow-xl ${glowColor} relative
                                transform rotate-45
                                m-1 lg:m-1.5 xl:m-2 2xl:m-2.5 3xl:m-3 4k:m-3.5 5k:m-4`}>
                <div className="transform -rotate-45
                            font-bold text-white text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl 4k:text-6xl 5k:text-7xl text-center leading-none">
                  {tier.label}
                </div>
                
                {/* Lock Icon for Locked Questions */}
                {isLocked && (
                  <div className="absolute -top-1 -right-1 transform -rotate-45
                              text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl 3xl:text-6xl 4k:text-7xl 5k:text-8xl">
                    🔒
                  </div>
                )}
                
                {/* Money Lock Icon for Locked Money */}
                {isMoneyLocked && !isLocked && (
                  <div className="absolute -bottom-1 -right-1 transform -rotate-45
                              text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl 4k:text-6xl 5k:text-7xl">
                    💰
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );



    // Debug info
    console.log('Audience Display State:', {
      lastPanelGuess: lastPanelGuess,
      lastGuestAnswer: lastGuestAnswer,
      isAnswered: isAnswered,
      questionsAnswered: gameState.questionsAnswered || 0
    });

    return (
      <div className="text-center p-5 relative max-w-[1200px] 3xl:max-w-[1500px] 4k:max-w-[1800px] 5k:max-w-[2100px] w-full">
        {/* Prize Ladder */}
        {renderPrizeLadder(gameState.currentQuestionNumber)}
        
        {/* Question Container */}
        {currentQuestion.text && currentQuestion.text !== 'No question selected' ? (
          <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-full
                      py-5 lg:py-6 xl:py-7 2xl:py-8 3xl:py-9 4k:py-10 5k:py-12
                      px-10 lg:px-12 xl:px-14 2xl:px-16 3xl:px-18 4k:px-20 5k:px-24
                      mx-auto mb-8 lg:mb-10 xl:mb-12 2xl:mb-14 3xl:mb-16 4k:mb-20 5k:mb-24
                      max-w-[800px] lg:max-w-[900px] xl:max-w-[1000px] 2xl:max-w-[1100px] 3xl:max-w-[1200px] 4k:max-w-[1400px] 5k:max-w-[1600px]
                      border-4 border-gray-400 shadow-lg shadow-black/30 relative">
            <div className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl
                        font-bold text-white drop-shadow-md">
              {currentQuestion.text}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-full
                      py-5 lg:py-6 xl:py-7 2xl:py-8 3xl:py-9 4k:py-10 5k:py-12
                      px-10 lg:px-12 xl:px-14 2xl:px-16 3xl:px-18 4k:px-20 5k:px-24
                      mx-auto mb-8 lg:mb-10 xl:mb-12 2xl:mb-14 3xl:mb-16 4k:mb-20 5k:mb-24
                      max-w-[800px] lg:max-w-[900px] xl:max-w-[1000px] 2xl:max-w-[1100px] 3xl:max-w-[1200px] 4k:max-w-[1400px] 5k:max-w-[1600px]
                      border-4 border-gray-400 shadow-lg shadow-black/30 relative">
            <div className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl
                        font-bold text-white drop-shadow-md">
              Waiting for question selection...
            </div>
          </div>
        )}

        {/* Answer Options Grid */}
        {currentQuestion.text && currentQuestion.text !== 'No question selected' && currentQuestion.options.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2
                      gap-4 lg:gap-5 xl:gap-6 2xl:gap-7 3xl:gap-8 4k:gap-9 5k:gap-10
                      max-w-[900px] lg:max-w-[1000px] xl:max-w-[1100px] 2xl:max-w-[1300px] 3xl:max-w-[1500px] 4k:max-w-[1700px] 5k:max-w-[1900px]
                      mx-auto mt-8 lg:mt-10 xl:mt-12 2xl:mt-14 3xl:mt-16 4k:mt-20 5k:mt-24">
            {currentQuestion.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isPanelGuess = lastPanelGuess === opt;
            const isGuestAnswer = lastGuestAnswer === opt;
            
            // Step 1: Panel guess submitted (yellow/orange)
            const isPanelGuessSubmitted = isPanelGuess && !lastGuestAnswer;
            
            // Step 2: Panel guess checked (green if correct, red if wrong) - happens when guest answer is known but not revealed
            const isPanelCorrect = isPanelGuess && lastPanelGuess === lastGuestAnswer;
            const isPanelIncorrect = isPanelGuess && lastPanelGuess !== lastGuestAnswer;
            
            // Step 3: Guest answer revealed (only when isAnswered is true)
            const isCorrect = isAnswered && lastPanelGuess === lastGuestAnswer && opt === lastPanelGuess;
            const isPanelWrong = isAnswered && lastPanelGuess !== lastGuestAnswer && opt === lastPanelGuess;
            const isGuestCorrect = isAnswered && lastPanelGuess !== lastGuestAnswer && opt === lastGuestAnswer;

            let backgroundColor = 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]';
            let borderColor = 'border-gray-400';
            let boxShadow = 'shadow-lg shadow-black/30';
            
            if (isCorrect) {
              backgroundColor = 'bg-gradient-to-br from-green-500 via-green-600 to-green-700';
              borderColor = 'border-green-500';
            } else if (isGuestCorrect) {
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
              <div key={i} className={`rounded-full p-4 lg:p-5 xl:p-6 2xl:p-7 3xl:p-8 4k:p-9 5k:p-10
                                  border-4 relative transition-all duration-300
                                  ${backgroundColor} ${borderColor} ${boxShadow}
                                  ${isAnswered ? 'scale-105' : 'scale-100'}`}>
                                 <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">
                   <div className="text-orange-500 font-bold text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl drop-shadow-md w-8 lg:w-10 xl:w-12 text-left">
                     {letter}
                   </div>
                   <div className="text-white font-bold text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl drop-shadow-md flex-1 text-left">
                     {opt}
                   </div>
                 </div>
                
                                 {/* Result indicators */}
                 {isAnswered && (
                   <div className="absolute top-1/2 -translate-y-1/2 right-4
                               font-bold text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl 3xl:text-8xl 4k:text-9xl 5k:text-[10rem]">
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
                bg-gradient-to-br from-[#2d1b69] via-[#1a1a2e] to-[#0f3460] font-inter">
      
      {/* Removed audience sound toggle button */}
      {/* Lives Display - Positioned in top-left corner */}
      {gameState && gameState.round === 'main_game' && renderLives()}

      {/* Background texture */}
      <div className="absolute inset-0 bg-repeat-linear bg-[length:4px_4px] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)] pointer-events-none" />
      
      <h1 className="text-orange-500 uppercase font-bold tracking-wider
                  text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl 3xl:text-9xl 4k:text-[10rem] 5k:text-[12rem]
                  drop-shadow-lg text-center mb-8 lg:mb-10 xl:mb-12 2xl:mb-14 3xl:mb-16 4k:mb-20 5k:mb-24">
        Judge Me If You Can
      </h1>
      
      {gameState ? (
        <div className="w-full max-w-[1200px] 3xl:max-w-[1500px] 4k:max-w-[1800px] 5k:max-w-[2100px]">
          {gameState.round === 'main_game' ? (
            renderMainGame()
          ) : (
            <div className="text-center text-white text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl drop-shadow-md">
              Waiting for game to start...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-white text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl 3xl:text-7xl 4k:text-8xl 5k:text-9xl drop-shadow-md">
          Connecting to game server...
        </div>
      )}
    </div>
  );
}

export default AudienceDisplay; 