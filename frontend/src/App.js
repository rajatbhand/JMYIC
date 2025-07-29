import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';
import soundEffects from './soundEffects';

function App() {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [panelGuess, setPanelGuess] = useState('');
  const [lockInput, setLockInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef();

  useEffect(() => {
    socket.on('game_state', (state) => {
      console.log('Received game state update:', state);
      console.log('Guest answers array:', state.guestAnswers);
      console.log('Panel guesses array:', state.panelGuesses);
      console.log('Current question index:', state.questionIndex);
      setGameState(state);
      setError(null);
      setPanelGuess('');
    });
    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message || 'Unknown error');
    });
    socket.on('test_response', (data) => {
      console.log('Backend test response:', data);
    });
    return () => {
      socket.off('game_state');
      socket.off('error');
      socket.off('test_response');
    };
  }, []);



  // Handlers for Main Game
  const handlePanelGuess = (guess) => setPanelGuess(guess);
  const handleSubmitPanelGuess = () => {
    if (panelGuess !== '') {
      soundEffects.playSound('panelGuess');
      socket.emit('select_panel_guess', panelGuess);
    }
  };
  const handleCheckPanelGuess = () => {
    console.log('Checking panel guess...');
    soundEffects.playSound('checkGuess');
    socket.emit('check_panel_guess');
    
    // Add a timeout to see if we get a response
    setTimeout(() => {
      console.log('Timeout: No response from check_panel_guess after 3 seconds');
    }, 3000);
  };
  
  const handleRevealGuestAnswer = () => {
    console.log('Revealing guest answer...');
    soundEffects.playSound('revealAnswer');
    socket.emit('reveal_guest_answer');
  };
  
  const handleTestBackend = () => {
    console.log('Testing backend connection...');
    socket.emit('test_event');
  };
  const handleAdvanceQuestion = () => {
    setPanelGuess('');
    socket.emit('advance_question');
  };
  const handlePlaceLock = () => {
    const idx = parseInt(lockInput, 10);
    if (!isNaN(idx)) {
      soundEffects.playSound('lockPlaced');
      socket.emit('place_lock', idx);
    }
  };
  const handleLockInput = (e) => setLockInput(e.target.value);
  
  const handleToggleSound = () => {
    const newState = soundEffects.toggleSound();
    setSoundEnabled(newState);
  };

  // New Flow: Question Setup and Selection
  const [showQuestionSetup, setShowQuestionSetup] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', ''],
    guestAnswer: ''
  });
  const [questionPool, setQuestionPool] = useState({
    questions: [],
    usedQuestions: [],
    currentQuestion: null
  });

  // Question Setup Handlers
  const handleAddQuestionToPool = () => {
    if (newQuestion.text && newQuestion.options.every(opt => opt.trim()) && newQuestion.guestAnswer) {
      socket.emit('add_question_to_pool', newQuestion);
      setNewQuestion({ text: '', options: ['', ''], guestAnswer: '' });
    }
  };

  const handleRemoveQuestionFromPool = (questionId) => {
    socket.emit('remove_question_from_pool', questionId);
  };

  const handleSelectQuestionFromPool = (questionId) => {
    socket.emit('select_question_from_pool', questionId);
  };

  const handleStartGame = () => {
    socket.emit('start_game');
  };

  const handleGetQuestionPool = () => {
    socket.emit('get_question_pool');
  };

  // Listen for question pool response
  useEffect(() => {
    socket.on('question_pool', (data) => {
      setQuestionPool(data);
    });
    return () => {
      socket.off('question_pool');
    };
  }, []);

  // Question Setup UI
  const renderQuestionSetup = () => {
    return (
      <div style={{ marginBottom: 32, padding: 20, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <h3>Question Setup ({questionPool.questions.length}/25)</h3>
        
        {/* Add New Question */}
        <div style={{ marginBottom: 20 }}>
          <h4>Add Question to Pool</h4>
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Question text"
              value={newQuestion.text}
              onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
              style={{ width: '100%', padding: 8, marginBottom: 8 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            {newQuestion.options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...newQuestion.options];
                    newOptions[index] = e.target.value;
                    setNewQuestion({...newQuestion, options: newOptions});
                  }}
                  style={{ flex: 1, padding: 8 }}
                />
                <button
                  onClick={() => {
                    const newOptions = [...newQuestion.options];
                    newOptions.splice(index, 1);
                    setNewQuestion({...newQuestion, options: newOptions});
                  }}
                  disabled={newQuestion.options.length <= 2}
                  style={{ 
                    padding: '8px 12px', 
                    backgroundColor: '#f44336', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newOptions = [...newQuestion.options, ''];
                setNewQuestion({...newQuestion, options: newOptions});
              }}
              disabled={newQuestion.options.length >= 10}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#2196F3', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer',
                marginTop: 8
              }}
            >
              Add Option
            </button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Guest's answer (must be one of the options)"
              value={newQuestion.guestAnswer}
              onChange={(e) => setNewQuestion({...newQuestion, guestAnswer: e.target.value})}
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <button 
            onClick={handleAddQuestionToPool}
            disabled={!newQuestion.text || !newQuestion.options.every(opt => opt.trim()) || !newQuestion.guestAnswer}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Add to Pool
          </button>
        </div>

        {/* Question Pool */}
        <div style={{ marginBottom: 20 }}>
          <h4>Question Pool</h4>
          <button 
            onClick={handleGetQuestionPool}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#2196F3', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer',
              marginBottom: 10
            }}
          >
            Refresh Pool
          </button>
          
          {questionPool.questions.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {questionPool.questions.map((question) => (
                <div key={question.id} style={{ 
                  padding: 10, 
                  backgroundColor: 'white', 
                  borderRadius: 4,
                  border: '1px solid #ddd',
                  opacity: questionPool.usedQuestions.includes(question.id) ? 0.6 : 1
                }}>
                  <div><strong>{question.text}</strong></div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Options: {question.options.join(', ')}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    Guest Answer: {question.guestAnswer}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {!questionPool.usedQuestions.includes(question.id) ? (
                      <button 
                        onClick={() => handleSelectQuestionFromPool(question.id)}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#4CAF50', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                          marginRight: 8
                        }}
                      >
                        Select
                      </button>
                    ) : (
                      <span style={{ color: '#f44336', fontSize: 12 }}>Used</span>
                    )}
                    <button 
                      onClick={() => handleRemoveQuestionFromPool(question.id)}
                      style={{ 
                        padding: '4px 8px', 
                        backgroundColor: '#f44336', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Game Button */}
        {questionPool.questions.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button 
              onClick={handleStartGame}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#FF9800', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 'bold'
              }}
            >
              🎮 Start Game
            </button>
          </div>
        )}
      </div>
    );
  };

  // Main Game UI
  const renderMainGame = () => {
    const currentQuestion = gameState.currentQuestion || { text: 'No question selected', options: [] };
    const lock = gameState.lock || {};
    const canLock = gameState.questionsAnswered >= 3 && gameState.questionsAnswered <= 9;
    const lockPlaced = lock.placed;
    const lockShifted = lock.shifted;
    const lockQuestion = lock.question;
    const correctCount = gameState.correctCount || 0;
    const prize = gameState.prize || 0;
    const panelGuesses = gameState.panelGuesses || [];
    const guestAnswers = gameState.guestAnswers || [];
    const guestAnswerRevealed = gameState.guestAnswerRevealed && gameState.guestAnswerRevealed[gameState.questionsAnswered - 1];
    const lastPanelGuess = panelGuesses[gameState.questionsAnswered - 1];
    const lastGuestAnswer = guestAnswers[gameState.questionsAnswered - 1];
    const isGuestAnswerRevealed = guestAnswerRevealed;
    const isAnswered = Boolean(lastPanelGuess && lastGuestAnswer && isGuestAnswerRevealed);
    const gameOver = correctCount >= 2;
    const gameOverWithoutLock = gameOver && !lockPlaced;
    const gameOverWithLock = gameOver && lockPlaced;

    return (
      <div style={{ marginTop: 24 }}>
        <h3>Main Game - Question {gameState.questionsAnswered} of Pool</h3>
        
        {!currentQuestion.text || currentQuestion.text === 'No question selected' ? (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff3cd', borderRadius: 4, border: '1px solid #ffeaa7' }}>
            <strong>⚠️ No Question Selected</strong>
            <p>Please select a question from the pool to continue the game.</p>
            <button 
              onClick={() => setShowQuestionSetup(true)}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#2196F3', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Select Question
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <strong>Q: {currentQuestion.text}</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              {currentQuestion.options.map((opt, i) => (
                <label key={i} style={{ marginRight: 16 }}>
                  <input
                    type="radio"
                    name="panelGuess"
                    value={opt}
                    checked={panelGuess === opt}
                    onChange={() => handlePanelGuess(opt)}
                    disabled={!!lastPanelGuess}
                  />{' '}
                  {opt}
                </label>
              ))}
              <button onClick={handleSubmitPanelGuess} disabled={panelGuess === '' || !!lastPanelGuess}>Submit Panel Guess</button>
            </div>
          </>
        )}
        
        {/* Show Panel Guess */}
        {lastPanelGuess && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
            <strong>Panel's Guess:</strong> {lastPanelGuess}
          </div>
        )}
        
        {/* Step 2: Check Panel Guess Button */}
        {lastPanelGuess && !lastGuestAnswer && (
          <div style={{ marginBottom: 16 }}>
            <button 
              onClick={handleCheckPanelGuess}
              style={{ 
                padding: '8px 16px', 
                fontSize: 14, 
                backgroundColor: '#FF9800', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Step 2: Check Panel Guess
            </button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Debug: Panel guess submitted, waiting to check against guest answer
            </div>
          </div>
        )}
        
        {/* Step 3: Reveal Guest Answer Button */}
        {lastPanelGuess && lastGuestAnswer && (
          <div style={{ marginBottom: 16 }}>
            <button 
              onClick={handleRevealGuestAnswer}
              style={{ 
                padding: '8px 16px', 
                fontSize: 14, 
                backgroundColor: '#2196F3', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Step 3: Reveal Guest Answer
            </button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Debug: Guest answer loaded, ready to reveal to audience
            </div>
          </div>
        )}
        
        {/* Show Guest Answer */}
        {lastGuestAnswer && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f3e5f5', borderRadius: 4 }}>
            <strong>Guest's Answer:</strong> {lastGuestAnswer}
          </div>
        )}
        
        {/* Show Result */}
        {isAnswered && (
          <div style={{ 
            marginBottom: 16, 
            padding: 12,
            color: lastPanelGuess === lastGuestAnswer ? 'green' : 'red',
            backgroundColor: lastPanelGuess === lastGuestAnswer ? '#e8f5e8' : '#ffebee',
            borderRadius: 4,
            fontWeight: 'bold'
          }}>
            {lastPanelGuess === lastGuestAnswer ? '✓ CORRECT! Panel matched the guest.' : '✗ INCORRECT. Panel did not match.'}
          </div>
        )}
        
        <div style={{ marginBottom: 16 }}>
          <strong>Correct Answers: {correctCount} / 2</strong> | <strong>Prize: ₹{prize.toLocaleString()}</strong>
        </div>
        
        {/* Debug Info */}
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4, fontSize: '12px' }}>
          <strong>Debug Info:</strong><br/>
          Panel Guess: {lastPanelGuess || 'None'}<br/>
          Guest Answer: {lastGuestAnswer || 'None'}<br/>
          Is Answered: {isAnswered ? 'Yes' : 'No'}<br/>
          Question Index: {qIdx}
        </div>
        <div style={{ marginBottom: 16 }}>
          <strong>Lock Status:</strong>{' '}
          {lockPlaced ? (
            <span>
              Placed on Q{(lockQuestion || 0) + 1} {lockShifted ? '(shifted)' : ''}
            </span>
          ) : (
            <span>Not placed</span>
          )}
        </div>
        {canLock && (!lockPlaced || (lockPlaced && !lockShifted)) && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="number"
              min={4}
              max={10}
              placeholder="Lock Q# (4-10)"
              value={lockInput}
              onChange={handleLockInput}
            />{' '}
            <button onClick={handlePlaceLock}>Place/Shift Lock</button>
          </div>
        )}
        
        {/* Next Question Button - only show after both answers are revealed and game not over */}
        {isAnswered && !gameOver && (
          <button 
            onClick={handleAdvanceQuestion} 
            style={{ 
              marginTop: 16, 
              padding: '12px 24px', 
              fontSize: 16, 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Next Question
          </button>
        )}
        
        {/* Game Over Messages */}
        {gameOverWithoutLock && (
          <div style={{ marginTop: 24, color: 'red', padding: 16, backgroundColor: '#ffebee', borderRadius: 4 }}>
            <h3>Game Over! Panel got 2 correct answers before lock was placed.</h3>
            <p><strong>Guest wins: ₹0</strong></p>
          </div>
        )}
        
        {gameOverWithLock && (
          <div style={{ marginTop: 24, color: 'blue', padding: 16, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
            <h3>Game Over! Moving to Final Gamble Offer...</h3>
            <p><strong>Current Prize: ₹{prize.toLocaleString()}</strong></p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Judge Me If You Can - Control Panel</h1>
      
      {/* Sound Toggle Button */}
      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={handleToggleSound}
          style={{
            padding: '8px 16px',
            backgroundColor: soundEnabled ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          🔊 {soundEnabled ? 'Sound ON' : 'Sound OFF'}
        </button>
      </div>
      
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      
      {/* Control Buttons */}
      <div style={{ marginBottom: 24 }}>
        <button 
          onClick={() => socket.emit('reset_game')}
          style={{ 
            padding: '12px 24px', 
            fontSize: 16, 
            backgroundColor: '#FF5722', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: '10px'
          }}
        >
          🔄 Restart Game (New Guest)
        </button>
        <button 
          onClick={() => setShowQuestionSetup(!showQuestionSetup)}
          style={{ 
            padding: '12px 24px', 
            fontSize: 16, 
            backgroundColor: '#607D8B', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold',
            marginRight: '10px'
          }}
        >
          📝 {showQuestionSetup ? 'Hide' : 'Show'} Question Setup
        </button>
        <button 
          onClick={handleTestBackend}
          style={{ 
            padding: '8px 16px', 
            fontSize: 14, 
            backgroundColor: '#9C27B0', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          🧪 Test Backend
        </button>
      </div>
      
      {gameState ? (
        <div>
          <h2>Current Round: {gameState.round}</h2>
          {showQuestionSetup && renderQuestionSetup()}
          {gameState.round === 'main_game' && renderMainGame()}
        </div>
      ) : (
        <div>Connecting to game server...</div>
      )}
    </div>
  );
}

export default App;
