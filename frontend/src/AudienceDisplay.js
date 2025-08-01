import React, { useEffect, useState } from 'react';
import socket from './socket';
import soundEffects from './soundEffects';

function AudienceDisplay() {
  const [gameState, setGameState] = useState(null);
  const [prevState, setPrevState] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
    setSoundEnabled(newState);
  };

  // Helper function to get current question
  const getCurrentQuestion = () => {
    return gameState.currentQuestion || null;
  };

  // Lives display component
  const renderLives = () => {
    const lives = gameState.lives !== undefined ? gameState.lives : 1;
    
    return (
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <span style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: 'bold',
          marginRight: '10px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          Mystery Guest Life:
        </span>
        
        {/* Single Life Heart */}
        <div style={{
          fontSize: '50px',
          color: lives >= 1 ? '#ff4757' : '#2f3542',
          textShadow: lives >= 1 ? '0 0 15px rgba(255,71,87,0.8), 0 0 30px rgba(255,71,87,0.4)' : 'none',
          transition: 'all 0.5s ease',
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
      <div style={{
        textAlign: 'center',
        color: '#ffffff',
        padding: '60px 20px'
      }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#ff4757',
          textShadow: '4px 4px 8px rgba(0,0,0,0.8), 0 0 30px rgba(255,71,87,0.5)',
          marginBottom: '30px'
        }}>
          💀 GAME OVER 💀
        </div>
        
        <div style={{
          fontSize: '36px',
          marginBottom: '40px',
          color: '#ffffff',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          {isSecondMatch ? 
            'Second Match After Life Lost!' : 
            'Mystery Guest Eliminated!'}
        </div>
        
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#4CAF50',
          textShadow: '3px 3px 6px rgba(0,0,0,0.8), 0 0 20px rgba(76,175,80,0.5)',
          marginBottom: '20px'
        }}>
          🔒 Final Prize: ₹{finalPrize.toLocaleString()}
        </div>
        
        {/* Single Dead Heart */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '40px'
        }}>
          <div style={{ fontSize: '80px', filter: 'brightness(0.3)' }}>🖤</div>
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
      <div style={{ marginBottom: '30px' }}>
        {/* Current Prize Bar */}
        <div style={{
          background: 'linear-gradient(90deg, #1976D2 0%, #42A5F5 50%, #1976D2 100%)',
          borderRadius: '20px',
          padding: '15px 30px',
          margin: '0 auto 20px',
          maxWidth: '600px',
          border: '2px solid #2196F3',
          boxShadow: '0 0 20px rgba(33,150,243,0.6)',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            Current Prize: ₹{prize.toLocaleString()}
          </div>
        </div>

        {/* Prize Tiers */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {prizeTiers.map((tier, index) => {
            const isCurrentQuestion = tier.question === currentQuestionNumber;
            const isLocked = lock.placed && lock.level === tier.question; // Use lock.level instead of lock.question
            const isMoneyLocked = gameState.lockedMoney >= tier.amount; // NEW: Check if money is locked at this level
            
            let borderColor = '#6c2eb7'; // Purple for unreached
            let backgroundColor = 'rgba(0,0,0,0.7)';
            let glowColor = 'rgba(108,46,183,0.3)';
            
            if (isMoneyLocked) {
              borderColor = '#4CAF50'; // Green for locked money
              backgroundColor = 'rgba(76,175,80,0.3)';
              glowColor = 'rgba(76,175,80,0.6)';
            }
            
            if (isCurrentQuestion) {
              borderColor = '#ff9800'; // Orange/yellow for current question
              backgroundColor = 'rgba(255,152,0,0.3)';
              glowColor = 'rgba(255,152,0,0.8)';
            }
            
            if (isLocked) {
              borderColor = '#f44336'; // Red for locked question
              backgroundColor = 'rgba(244,67,54,0.3)';
              glowColor = 'rgba(244,67,54,0.8)';
            }

            return (
              <div key={index} style={{
                width: '80px', // Slightly wider for 7 items instead of 10
                height: '80px',
                background: backgroundColor,
                border: `3px solid ${borderColor}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 15px ${glowColor}`,
                position: 'relative',
                transform: 'rotate(45deg)',
                margin: '5px'
              }}>
                <div style={{
                  transform: 'rotate(-45deg)',
                  fontSize: '14px', // Slightly larger for readability
                  fontWeight: 'bold',
                  color: '#ffffff',
                  textAlign: 'center',
                  lineHeight: '1'
                }}>
                  {tier.label}
                </div>
                
                {/* Lock Icon for Locked Questions */}
                {isLocked && (
                  <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    transform: 'rotate(-45deg)',
                    fontSize: '20px'
                  }}>
                    🔒
                  </div>
                )}
                
                {/* Money Lock Icon for Locked Money */}
                {isMoneyLocked && !isLocked && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    transform: 'rotate(-45deg)',
                    fontSize: '16px'
                  }}>
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
      <div style={{ textAlign: 'center', padding: '20px', position: 'relative' }}>
        {/* Prize Ladder */}
        {renderPrizeLadder(gameState.currentQuestionNumber)}
        
        {/* Question Container */}
        {currentQuestion.text && currentQuestion.text !== 'No question selected' ? (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: '50px',
            padding: '20px 40px',
            margin: '20px auto',
            maxWidth: '800px',
            border: '3px solid #c0c0c0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            position: 'relative'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#ffffff',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              {currentQuestion.text}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: '50px',
            padding: '20px 40px',
            margin: '20px auto',
            maxWidth: '800px',
            border: '3px solid #c0c0c0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            position: 'relative'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#ffffff',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              Waiting for question selection...
            </div>
          </div>
        )}

        {/* Answer Options Grid */}
        {currentQuestion.text && currentQuestion.text !== 'No question selected' && currentQuestion.options.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            maxWidth: '900px',
            margin: '30px auto'
          }}>
            {currentQuestion.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D
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

            let backgroundColor = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
            let borderColor = '#c0c0c0';
            let boxShadow = '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)';
            
            if (isCorrect) {
              // Step 3: Both panel and guest match - green
              backgroundColor = 'linear-gradient(135deg, #4CAF50 0%, #45a049 50%, #388E3C 100%)';
              borderColor = '#4CAF50';
            } else if (isGuestCorrect) {
              // Step 3: Guest correct, panel wrong - green (MUST come before isPanelWrong)
              backgroundColor = 'linear-gradient(135deg, #4CAF50 0%, #45a049 50%, #388E3C 100%)';
              borderColor = '#4CAF50';
            } else if (isPanelWrong) {
              // Step 3: Panel wrong, guest correct - red
              backgroundColor = 'linear-gradient(135deg, #f44336 0%, #d32f2f 50%, #c62828 100%)';
              borderColor = '#f44336';
            } else if (isPanelGuessSubmitted) {
              // Step 1: Panel guess submitted - yellow/orange
              backgroundColor = 'linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #e65100 100%)';
              borderColor = '#ffffff';
              boxShadow = '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 15px rgba(255,152,0,0.4)';
            } else if (isPanelCorrect && lastGuestAnswer && !isAnswered) {
              // Step 2: Panel guess is correct - green
              backgroundColor = 'linear-gradient(135deg, #4CAF50 0%, #45a049 50%, #388E3C 100%)';
              borderColor = '#4CAF50';
            } else if (isPanelIncorrect && lastGuestAnswer && !isAnswered) {
              // Step 2: Panel guess is wrong - red
              backgroundColor = 'linear-gradient(135deg, #f44336 0%, #d32f2f 50%, #c62828 100%)';
              borderColor = '#f44336';
            }

                        // Debug logging for this option
            if (opt === 'Blue' || opt === 'Red') { // Debug for both Blue and Red options
              console.log(`Option ${opt}:`, {
                isPanelGuess: isPanelGuess,
                isGuestAnswer: isGuestAnswer,
                lastPanelGuess: lastPanelGuess,
                lastGuestAnswer: lastGuestAnswer,
                isAnswered: isAnswered,
                isPanelGuessSubmitted: isPanelGuessSubmitted,
                isPanelCorrect: isPanelCorrect,
                isPanelIncorrect: isPanelIncorrect,
                isCorrect: isCorrect,
                isPanelWrong: isPanelWrong,
                isGuestCorrect: isGuestCorrect
              });
            }

            return (
              <div key={i} style={{
                background: backgroundColor,
                borderRadius: '40px',
                padding: '15px 25px',
                border: `3px solid ${borderColor}`,
                boxShadow: boxShadow,
                position: 'relative',
                transition: 'all 0.3s ease',
                transform: isAnswered ? 'scale(1.02)' : 'scale(1)'
              }}>
                                 <div style={{
                   display: 'flex',
                   alignItems: 'center',
                   gap: '10px'
                 }}>
                   <div style={{
                     color: isPanelGuess && !isGuestAnswer ? '#ff9800' : '#ff9800',
                     fontSize: '24px',
                     fontWeight: 'bold',
                     textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                     minWidth: '30px'
                   }}>
                     {letter}
                   </div>
                   <div style={{
                     color: '#ffffff',
                     fontSize: '20px',
                     fontWeight: 'bold',
                     textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                     flex: 1,
                     textAlign: 'left'
                   }}>
                     {opt}
                   </div>
                 </div>
                
                                 {/* Result indicators */}
                 {isAnswered && (
                   <div style={{
                     position: 'absolute',
                     top: '10px',
                     right: '15px',
                     fontSize: '24px',
                     fontWeight: 'bold'
                   }}>
                     {isCorrect && <span style={{ color: '#4CAF50' }}>✓</span>}
                     {isPanelWrong && <span style={{ color: '#f44336' }}>✗</span>}
                     {isGuestCorrect && <span style={{ color: '#4CAF50' }}>✓</span>}
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
    <div style={{
      background: 'linear-gradient(135deg, #2d1b69 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #1a1a2e 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Sound Toggle Button - Positioned in top-right corner */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button 
          onClick={handleToggleSound}
          style={{
            padding: '8px 16px',
            backgroundColor: soundEnabled ? 'rgba(76,175,80,0.8)' : 'rgba(244,67,54,0.8)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}
        >
          🔊 {soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
      {/* Lives Display - Positioned in top-left corner */}
      {gameState && gameState.round === 'main_game' && renderLives()}

      {/* Background texture */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        pointerEvents: 'none'
      }} />
      
      <h1 style={{
        fontSize: '48px',
        color: '#ff9800',
        marginBottom: '40px',
        textShadow: '3px 3px 6px rgba(0,0,0,0.5), 0 0 20px rgba(255,152,0,0.3)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>
        Judge Me If You Can
      </h1>
      
      {gameState ? (
        <div style={{ width: '100%', maxWidth: '1200px' }}>
          {gameState.round === 'main_game' ? (
            renderMainGame()
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#ffffff',
              fontSize: '32px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              Waiting for game to start...
            </div>
          )}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          color: '#ffffff',
          fontSize: '32px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          Connecting to game server...
        </div>
      )}
    </div>
  );
}

export default AudienceDisplay; 