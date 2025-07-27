import React, { useEffect, useState } from 'react';
import socket from './socket';

function AudienceDisplay() {
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    socket.on('game_state', (state) => {
      setGameState(state);
    });
    return () => {
      socket.off('game_state');
    };
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const renderMainGame = () => {
    const qIdx = gameState.questionIndex || 0;
    const questions = gameState.questions || [];
    const question = questions[qIdx] || { text: 'No question', options: [] };
    const lock = gameState.lock || {};
    const correctCount = gameState.correctCount || 0;
    const prize = gameState.prize || 0;
    const panelGuesses = gameState.panelGuesses || [];
    const guestAnswers = gameState.guestAnswers || [];
    const lastPanelGuess = panelGuesses[qIdx];
    const lastGuestAnswer = guestAnswers[qIdx];
    const isAnswered = lastPanelGuess && lastGuestAnswer;

    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, marginBottom: 24 }}>Question {qIdx + 1} of 10</h2>
        <div style={{ fontSize: 28, marginBottom: 32 }}>
          <strong>{question.text}</strong>
        </div>
        <div style={{ marginBottom: 32 }}>
          {question.options.map((opt, i) => (
            <div key={i} style={{ fontSize: 24, marginBottom: 8 }}>
              {opt}
            </div>
          ))}
        </div>
        
        {/* Show both answers side by side when both are available */}
        {isAnswered && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
            <div style={{ 
              padding: 16, 
              backgroundColor: '#e3f2fd', 
              borderRadius: 8, 
              minWidth: 200,
              border: '2px solid #2196F3'
            }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Panel's Guess</div>
              <div style={{ fontSize: 28, color: '#1976D2' }}>{lastPanelGuess}</div>
            </div>
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f3e5f5', 
              borderRadius: 8, 
              minWidth: 200,
              border: '2px solid #9C27B0'
            }}>
              <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Guest's Answer</div>
              <div style={{ fontSize: 28, color: '#7B1FA2' }}>{lastGuestAnswer}</div>
            </div>
          </div>
        )}
        
        {/* Show individual answers when only one is available */}
        {lastPanelGuess && !lastGuestAnswer && (
          <div style={{ 
            padding: 16, 
            backgroundColor: '#e3f2fd', 
            borderRadius: 8, 
            marginBottom: 16,
            border: '2px solid #2196F3'
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Panel's Guess</div>
            <div style={{ fontSize: 28, color: '#1976D2' }}>{lastPanelGuess}</div>
          </div>
        )}
        
        {lastGuestAnswer && !lastPanelGuess && (
          <div style={{ 
            padding: 16, 
            backgroundColor: '#f3e5f5', 
            borderRadius: 8, 
            marginBottom: 16,
            border: '2px solid #9C27B0'
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>Guest's Answer</div>
            <div style={{ fontSize: 28, color: '#7B1FA2' }}>{lastGuestAnswer}</div>
          </div>
        )}
        
        {/* Show Result */}
        {isAnswered && (
          <div style={{ 
            marginBottom: 24, 
            fontSize: 32, 
            color: lastPanelGuess === lastGuestAnswer ? '#4CAF50' : '#F44336',
            fontWeight: 'bold',
            padding: 16,
            backgroundColor: lastPanelGuess === lastGuestAnswer ? '#e8f5e8' : '#ffebee',
            borderRadius: 8,
            border: `3px solid ${lastPanelGuess === lastGuestAnswer ? '#4CAF50' : '#F44336'}`
          }}>
            {lastPanelGuess === lastGuestAnswer ? '✓ CORRECT!' : '✗ INCORRECT'}
          </div>
        )}
        
        <div style={{ marginBottom: 16, fontSize: 20 }}>
          <strong>Correct: {correctCount}/2</strong> | <strong>Prize: ₹{prize.toLocaleString()}</strong>
        </div>
        {lock.placed && (
          <div style={{ fontSize: 18, color: '#6c2eb7' }}>
            <strong>Lock placed on Q{(lock.question || 0) + 1}</strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: '#f5f0e6', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ fontSize: 48, color: '#6c2eb7', marginBottom: 32 }}>Judge Me If You Can</h1>
      {gameState ? (
        <div>
          {gameState.round === 'first_impressions' && gameState.firstImpressions ? (
            <div>
              {gameState.firstImpressions.stage === 'panel_intro' && <h2 style={{ fontSize: 40 }}>Meet the Panel!</h2>}
              {gameState.firstImpressions.stage === 'guest_arrives' && <h2 style={{ fontSize: 40 }}>Welcome, Mystery Guest!</h2>}
              {gameState.firstImpressions.stage === 'timer' && (
                <div>
                  <h2 style={{ fontSize: 40 }}>2.5-Minute Q&amp;A</h2>
                  <div style={{ fontSize: 80, fontWeight: 'bold', color: '#6c2eb7' }}>{formatTime(gameState.firstImpressions.timer)}</div>
                </div>
              )}
            </div>
          ) : gameState.round === 'main_game' ? (
            renderMainGame()
          ) : (
            <h2 style={{ fontSize: 32 }}>Waiting for game to start...</h2>
          )}
        </div>
      ) : (
        <h2 style={{ fontSize: 32 }}>Connecting to game server...</h2>
      )}
    </div>
  );
}

export default AudienceDisplay; 