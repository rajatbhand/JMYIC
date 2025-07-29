import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';

function App() {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [panelGuess, setPanelGuess] = useState('');
  const [lockInput, setLockInput] = useState('');
  const timerRef = useRef();

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);
      setError(null);
      setPanelGuess('');
    });
    socket.on('error', (err) => {
      setError(err.message || 'Unknown error');
    });
    return () => {
      socket.off('game_state');
      socket.off('error');
    };
  }, []);



  // Handlers for Main Game
  const handlePanelGuess = (guess) => setPanelGuess(guess);
  const handleSubmitPanelGuess = () => {
    if (panelGuess !== '') {
      socket.emit('select_panel_guess', panelGuess);
    }
  };
  const handleRevealGuestAnswer = () => {
    socket.emit('reveal_guest_answer');
  };
  const handleAdvanceQuestion = () => {
    setPanelGuess('');
    socket.emit('advance_question');
  };
  const handlePlaceLock = () => {
    const idx = parseInt(lockInput, 10);
    if (!isNaN(idx)) {
      socket.emit('place_lock', idx);
    }
  };
  const handleLockInput = (e) => setLockInput(e.target.value);


  // Main Game UI
  const renderMainGame = () => {
    const qIdx = gameState.questionIndex || 0;
    const questions = gameState.questions || [];
    const question = questions[qIdx] || { text: 'No question', options: [] };
    const lock = gameState.lock || {};
    const canLock = qIdx >= 3 && qIdx <= 9;
    const lockPlaced = lock.placed;
    const lockShifted = lock.shifted;
    const lockQuestion = lock.question;
    const correctCount = gameState.correctCount || 0;
    const prize = gameState.prize || 0;
    const panelGuesses = gameState.panelGuesses || [];
    const guestAnswers = gameState.guestAnswers || [];
    const lastPanelGuess = panelGuesses[qIdx];
    const lastGuestAnswer = guestAnswers[qIdx];
    const isAnswered = lastPanelGuess && lastGuestAnswer;
    const gameOver = correctCount >= 2;
    const gameOverWithoutLock = gameOver && !lockPlaced;
    const gameOverWithLock = gameOver && lockPlaced;

    return (
      <div style={{ marginTop: 24 }}>
        <h3>Main Game - Question {qIdx + 1} of 10</h3>
        <div style={{ marginBottom: 16 }}>
          <strong>Q: {question.text}</strong>
        </div>
        <div style={{ marginBottom: 16 }}>
          {question.options.map((opt, i) => (
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
        
        {/* Show Panel Guess */}
        {lastPanelGuess && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 4 }}>
            <strong>Panel's Guess:</strong> {lastPanelGuess}
          </div>
        )}
        
        {/* Show Guest Answer Button */}
        {lastPanelGuess && !lastGuestAnswer && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={handleRevealGuestAnswer}>Reveal Guest Answer</button>
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
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      
      {/* Restart Game Button - always visible */}
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
            fontWeight: 'bold'
          }}
        >
          🔄 Restart Game (New Guest)
        </button>
      </div>
      
      {gameState ? (
        <div>
          <h2>Current Round: {gameState.round}</h2>
          {gameState.round === 'main_game' && renderMainGame()}
        </div>
      ) : (
        <div>Connecting to game server...</div>
      )}
    </div>
  );
}

export default App;
