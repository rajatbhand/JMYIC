import React, { useEffect, useState } from 'react';
import socket from './socket';
import soundEffects from './soundEffects';

function App() {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [panelGuess, setPanelGuess] = useState('');
  const [lockInput, setLockInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

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
  };
  const handleRevealGuestAnswer = () => {
    console.log('Revealing guest answer...');
    soundEffects.playSound('revealAnswer');
    socket.emit('reveal_guest_answer');
  };
  const handleNextQuestion = () => {
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
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    guestAnswer: ''
  });

  // Question Setup Handlers
  const handleAddQuestionToPool = () => {
    if (newQuestion.text && newQuestion.options.every(opt => opt.trim()) && newQuestion.guestAnswer) {
      socket.emit('add_question_to_pool', newQuestion);
      setNewQuestion({ text: '', options: ['', '', '', ''], guestAnswer: '' });
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

  const handleResetGame = () => {
    if (window.confirm('Reset game progress but keep all questions?')) {
      socket.emit('reset_game');
    }
  };

  const handleResetEverything = () => {
    if (window.confirm('⚠️ WARNING: This will delete ALL questions and game progress. Are you absolutely sure?')) {
      socket.emit('reset_everything');
    }
  };

  const handleTestBackend = () => {
    console.log('Testing backend connection...');
    socket.emit('test_event');
  };

  // Helper function to check if a question has been fully played (both panel and guest answered)
  const isQuestionFullyPlayed = (questionId) => {
    if (!gameState?.selectedQuestions || !gameState?.panelGuesses || !gameState?.guestAnswers) {
      return false;
    }
    
    // Find the index of this question in the selectedQuestions array
    const questionIndex = gameState.selectedQuestions.indexOf(questionId);
    if (questionIndex === -1) return false;
    
    // Check if both panel and guest have answered this question
    const hasPanelAnswer = gameState.panelGuesses[questionIndex] !== undefined;
    const hasGuestAnswer = gameState.guestAnswers[questionIndex] !== undefined;
    const isRevealed = gameState.guestAnswerRevealed && gameState.guestAnswerRevealed[questionIndex];
    
    return hasPanelAnswer && hasGuestAnswer && isRevealed;
  };

  // Add state for CSV upload (around line 90):
  const [csvUpload, setCsvUpload] = useState({
    file: null,
    uploading: false,
    error: null,
    success: null
  });

  // Add CSV upload handlers:
  const handleCSVFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCsvUpload({
        file: file,
        uploading: false,
        error: null,
        success: null
      });
    }
  };

  // Download the template CSV file from the backend using async/await.
  // Only declare handleDownloadTemplate once.
  const handleDownloadTemplate = async () => {
    try {
      const backendUrl = 'https://jmyic.onrender.com'; // or your actual backend URL
      const response = await fetch(`${backendUrl}/download-template`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setCsvUpload(prev => ({ ...prev, error: 'Failed to download template' }));
      }
    } catch (error) {
      setCsvUpload(prev => ({ ...prev, error: 'Download failed: ' + error.message }));
    }
  };


  // Also update the CSV upload to use the correct backend URL:
  const handleCSVUpload = async () => {
    if (!csvUpload.file) {
      setCsvUpload(prev => ({ ...prev, error: 'Please select a CSV file first' }));
      return;
    }
    
    setCsvUpload(prev => ({ ...prev, uploading: true, error: null, success: null }));
    
    const formData = new FormData();
    formData.append('csvFile', csvUpload.file);
    
    try {
      const backendUrl = 'https://jmyic.onrender.com'; // or your actual backend URL
      const response = await fetch(`${backendUrl}/upload-questions`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setCsvUpload({
          file: null,
          uploading: false,
          error: null,
          success: result.message
        });
        // Clear file input
        document.getElementById('csv-file-input').value = '';
        
        // Force refresh of game state to show new questions
        socket.emit('get_question_pool');
      } else {
        setCsvUpload(prev => ({
          ...prev,
          uploading: false,
          error: result.error + (result.details ? ': ' + result.details.join(', ') : '')
        }));
      }
    } catch (error) {
      setCsvUpload(prev => ({
        ...prev,
        uploading: false,
        error: 'Upload failed: ' + error.message
      }));
    }
  };

  // Update the renderAddQuestionForm function to include CSV upload:
  const renderAddQuestionForm = () => (
    <div style={{
      padding: '15px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      marginBottom: '15px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>
        ➕ Add Questions
      </h3>
      
      {/* CSV Upload Section */}
      <div style={{
        padding: '12px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        marginBottom: '15px',
        border: '1px solid #2196F3'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1976D2' }}>
          📄 Bulk Upload (CSV)
        </h4>
        
        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleCSVFileSelect}
            style={{
              flex: 1,
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          <button
            onClick={handleCSVUpload}
            disabled={!csvUpload.file || csvUpload.uploading}
            style={{
              padding: '6px 12px',
              backgroundColor: csvUpload.file && !csvUpload.uploading ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: csvUpload.file && !csvUpload.uploading ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {csvUpload.uploading ? '⏳ Uploading...' : '📤 Upload'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              padding: '4px 8px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            📥 Download Template
          </button>
          <span style={{ fontSize: '11px', color: '#666', alignSelf: 'center' }}>
            Format: question, option_a, option_b, option_c, option_d, guest_answer
          </span>
        </div>
        
        {/* Status Messages */}
        {csvUpload.error && (
          <div style={{
            padding: '6px',
            backgroundColor: '#ffebee',
            color: '#d32f2f',
            borderRadius: '3px',
            fontSize: '11px',
            border: '1px solid #f44336'
          }}>
            ❌ {csvUpload.error}
          </div>
        )}
        
        {csvUpload.success && (
          <div style={{
            padding: '6px',
            backgroundColor: '#e8f5e8',
            color: '#2e7d32',
            borderRadius: '3px',
            fontSize: '11px',
            border: '1px solid #4caf50'
          }}>
            ✅ {csvUpload.success}
          </div>
        )}
      </div>
      
      {/* Manual Entry Section */}
      <div style={{
        padding: '12px',
        backgroundColor: '#fff3e0',
        borderRadius: '6px',
        border: '1px solid #ff9800'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#f57c00' }}>
          ✍️ Manual Entry
        </h4>
        
        {/* Question Text */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Question:
          </label>
          <input
            type="text"
            value={newQuestion.text}
            onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
            placeholder="Enter your question here..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Options (exactly 4) */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Options (A, B, C, D):
          </label>
          {['A', 'B', 'C', 'D'].map((letter, index) => (
            <input
              key={index}
              type="text"
              value={newQuestion.options[index]}
              onChange={(e) => {
                const newOptions = [...newQuestion.options];
                newOptions[index] = e.target.value;
                setNewQuestion({ ...newQuestion, options: newOptions });
              }}
              placeholder={`Option ${letter}`}
              style={{
                width: '100%',
                padding: '6px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '4px'
              }}
            />
          ))}
        </div>

        {/* Guest Answer */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Guest Answer:
          </label>
          <select
            value={newQuestion.guestAnswer}
            onChange={(e) => setNewQuestion({ ...newQuestion, guestAnswer: e.target.value })}
            style={{
              width: '100%',
              padding: '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="">Select guest answer...</option>
            {newQuestion.options.map((option, index) => (
              option.trim() && (
                <option key={index} value={option}>
                  {['A', 'B', 'C', 'D'][index]}: {option}
                </option>
              )
            ))}
          </select>
        </div>

        <button
          onClick={handleAddQuestionToPool}
          disabled={!newQuestion.text || !newQuestion.options.every(opt => opt.trim()) || !newQuestion.guestAnswer}
          style={{
            padding: '8px 16px',
            backgroundColor: newQuestion.text && newQuestion.options.every(opt => opt.trim()) && newQuestion.guestAnswer ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: newQuestion.text && newQuestion.options.every(opt => opt.trim()) && newQuestion.guestAnswer ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
        >
          ➕ Add Question
        </button>
      </div>
    </div>
  );

  const renderQuestionPool = () => (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      overflow: 'hidden',
      // height: '400px', // Remove this fixed height
      display: 'flex',
      flexDirection: 'column',
      minHeight: '300px' // Add minimum height instead
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
          📝 Question Pool ({(gameState?.questionPool?.length || 0)}/25)
        </h3>
      </div>
      
      {/* Question List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {!(gameState?.questionPool?.length) ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: '20px',
            fontSize: '13px'
          }}>
            No questions in pool. Add questions above to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(gameState?.questionPool || []).map((question) => {
              const isUsed = (gameState?.usedQuestions || []).includes(question.id);
              const isFullyPlayed = isQuestionFullyPlayed(question.id);
              
              return (
                <div key={question.id} style={{ 
                  padding: '10px', 
                  backgroundColor: isUsed ? '#f5f5f5' : 'white', 
                  borderRadius: 5,
                  border: isFullyPlayed ? '2px solid #4CAF50' : '1px solid #e0e0e0',
                  opacity: isUsed ? 0.6 : 1,
                  cursor: isUsed ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: '3px',
                    lineHeight: '1.3'
                  }}>
                    {question.text}
                    {isFullyPlayed && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        color: '#4CAF50',
                        fontWeight: 'normal'
                      }}>
                        ✅ Completed
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#666', 
                    marginBottom: '3px',
                    lineHeight: '1.2'
                  }}>
                    <strong>Options:</strong> {question.options.join(', ')}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#666',
                    marginBottom: '6px'
                  }}>
                    <strong>Guest Answer:</strong> {question.guestAnswer}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {!isUsed ? (
                      <button 
                        onClick={() => handleSelectQuestionFromPool(question.id)}
                        style={{ 
                          padding: '3px 6px', 
                          backgroundColor: '#4CAF50', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 2,
                          cursor: 'pointer',
                          fontSize: '10px',
                          flex: 1
                        }}
                      >
                        Select
                      </button>
                    ) : (
                      <span style={{ 
                        color: '#f44336', 
                        fontSize: '10px',
                        padding: '3px 6px',
                        backgroundColor: '#ffebee',
                        borderRadius: 2,
                        flex: 1,
                        textAlign: 'center'
                      }}>
                        Used
                      </span>
                    )}
                    <button 
                      onClick={() => handleRemoveQuestionFromPool(question.id)}
                      style={{ 
                        padding: '3px 6px', 
                        backgroundColor: isFullyPlayed ? '#FF9800' : '#f44336', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 2,
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                      title={isFullyPlayed ? 'Delete completed question' : 'Delete question'}
                    >
                      {isFullyPlayed ? '🗑️' : '×'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderMainGame = () => {
    const currentQuestion = gameState?.currentQuestion;
    const panelGuesses = gameState?.panelGuesses || [];
    const guestAnswers = gameState?.guestAnswers || [];
    const currentQuestionIndex = gameState?.questionsAnswered - 1;
    const lastPanelGuess = panelGuesses[currentQuestionIndex];
    const lastGuestAnswer = guestAnswers[currentQuestionIndex];
    const guestAnswerRevealed = gameState?.guestAnswerRevealed && gameState.guestAnswerRevealed[currentQuestionIndex];
    const isAnswered = Boolean(lastPanelGuess && lastGuestAnswer && guestAnswerRevealed);

    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ color: '#333', marginBottom: '20px' }}>🎮 Main Game Controls</h2>
        
        {!currentQuestion ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ color: '#666', marginBottom: '12px' }}>No Question Selected</h3>
            <p style={{ color: '#999', margin: 0 }}>
              Select questions from the pool on the left to start the game.
            </p>
            {(gameState?.questionPool?.length || 0) > 0 && (
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
                  fontWeight: 'bold',
                  marginTop: '12px'
                }}
              >
                🎮 Start Game
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Current Question Display */}
            <div style={{
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #2196F3'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#1976D2' }}>Current Question:</h3>
              <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px 0', color: '#333' }}>
                {currentQuestion.text}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} style={{
                    padding: '10px',
                    backgroundColor: panelGuess === option ? '#4CAF50' : 'white',
                    color: panelGuess === option ? 'white' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: panelGuess === option ? 'bold' : 'normal'
                  }}
                  onClick={() => handlePanelGuess(option)}
                  >
                    <strong>{String.fromCharCode(65 + index)}:</strong> {option}
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls - 3 Step Flow */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {/* Step 1: Submit Panel Guess */}
              {!lastPanelGuess && (
                <button
                  onClick={handleSubmitPanelGuess}
                  disabled={!panelGuess}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: panelGuess ? '#4CAF50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: panelGuess ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Step 1: Submit Panel Guess
                </button>
              )}

              {/* Step 2: Check Panel Guess */}
              {lastPanelGuess && !lastGuestAnswer && (
                <button
                  onClick={handleCheckPanelGuess}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Step 2: Check Panel Guess
                </button>
              )}

              {/* Step 3: Reveal Guest Answer */}
              {lastPanelGuess && lastGuestAnswer && !guestAnswerRevealed && (
                <button
                  onClick={handleRevealGuestAnswer}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  Step 3: Reveal Guest Answer
                </button>
              )}
            </div>

            {/* Debug Info Panel */}
            <div style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#666',
              marginBottom: '20px'
            }}>
              <strong>Debug Info:</strong><br/>
              Last Panel Guess: {lastPanelGuess || 'None'}<br/>
              Last Guest Answer: {lastGuestAnswer || 'None'}<br/>
              Guest Answer Revealed: {guestAnswerRevealed ? 'Yes' : 'No'}<br/>
              Is Answered: {isAnswered ? 'Yes' : 'No'}<br/>
              Questions Answered: {gameState?.questionsAnswered || 0}
            </div>

            {/* Lock Controls */}
            {gameState?.lifeUsed && !gameState?.lock?.placed && (
              <div style={{
                padding: '15px',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                border: '1px solid #ff9800',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>
                  🔒 Place Lock on Prize Ladder (After Life Lost)
                </h4>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Current Level: {gameState.currentQuestionNumber || 1} | 
                  Choose current or future level to secure prize
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={lockInput}
                    onChange={handleLockInput}
                    style={{
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '200px'
                    }}
                  >
                    <option value="">Select level to lock...</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(level => {
                      const currentLevel = gameState.currentQuestionNumber || 1;
                      const prizes = ['₹2K', '₹4K', '₹8K', '₹12K', '₹20K', '₹30K', '₹50K'];
                      if (level >= currentLevel) { // Allow current level and future levels
                        return (
                          <option key={level} value={level}>
                            Level {level} - {prizes[level - 1]} {level === currentLevel ? '(Current)' : ''}
                          </option>
                        );
                      }
                      return null;
                    })}
                  </select>
                  <button
                    onClick={handlePlaceLock}
                    disabled={!lockInput}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: lockInput ? '#ff9800' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: lockInput ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold'
                    }}
                  >
                    🔒 Place Lock
                  </button>
                </div>
              </div>
            )}

            {gameState?.lock?.placed && (
              <div style={{
                padding: '15px',
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                border: '1px solid #f44336',
                marginBottom: '20px'
              }}>
                <strong style={{ color: '#d32f2f' }}>
                  🔒 Lock placed on Level {gameState.lock.level} (₹{['2K', '4K', '8K', '12K', '20K', '30K', '50K'][gameState.lock.level - 1]})
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!gameState) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Connecting to server...
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🎬 Judge Me If You Can - Operator Panel</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleToggleSound}
            style={{
              padding: '8px 16px',
              backgroundColor: soundEnabled ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔊 Sound {soundEnabled ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={handleTestBackend}
            style={{
              padding: '8px 16px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🧪 Test
          </button>
          <button 
            onClick={handleResetGame}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Reset game progress but keep questions"
          >
            🔄 Reset Game
          </button>
          <button 
            onClick={handleResetEverything}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Delete everything including questions"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '10px 20px',
          borderLeft: '4px solid #f44336'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Main Content - Split Layout */}
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 80px)',
        gap: '20px',
        padding: '20px'
      }}>
        {/* Left Panel (30%) - Question Management */}
        <div style={{ 
          width: '30%', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '15px',
          overflowY: 'auto', // Enable vertical scroll
          maxHeight: 'calc(100vh - 120px)', // Limit height to viewport
          paddingRight: '10px' // Add padding for scrollbar space
        }}>
          {/* Add Question Form */}
          {renderAddQuestionForm()}
          
          {/* Question Pool */}
          {renderQuestionPool()}
        </div>

        {/* Right Panel (70%) - Game Controls */}
        <div style={{ 
          width: '70%', 
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          overflow: 'auto', // Change this to enable both horizontal and vertical scroll
          overflowX: 'auto', // Explicitly enable horizontal scroll
          overflowY: 'auto'  // Explicitly enable vertical scroll
        }}>
          {gameState.round === 'setup' ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h2 style={{ color: '#666', marginBottom: '20px' }}>🎬 Game Setup</h2>
              <p style={{ color: '#999', fontSize: '16px', marginBottom: '30px' }}>
                Add questions to the pool and start the game when ready.
              </p>
              {(gameState?.questionPool?.length || 0) > 0 && (
                <button 
                  onClick={handleStartGame}
                  style={{ 
                    padding: '15px 30px', 
                    backgroundColor: '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 18,
                    fontWeight: 'bold'
                  }}
                >
                  🚀 Start Game
                </button>
              )}
            </div>
          ) : gameState.round === 'main_game' ? (
            renderMainGame()
          ) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h2 style={{ color: '#666' }}>Round: {gameState.round}</h2>
              <p style={{ color: '#999' }}>Game controls will appear here based on the current round.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
