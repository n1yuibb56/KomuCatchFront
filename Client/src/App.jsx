// src/App.jsx

import React, { useState, useEffect } from 'react';
import PlayerCard from './components/PlayerCard';
import io from 'socket.io-client'; // ★★★ 1. socket.io-client をインポート
import './App.css'; 

const SOCKET_SERVER_URL = 'http://192.168.1.114:3001';

// アニメーションファイルへのパスを定義
const animationFiles = {
  laugh: '/笑い.webm',
  surprise: '/驚き.webm',
  angry: '/怒り.webm',
  like: '/いいね.webm',
};

// 画像パスの定義
const BACKGROUND_IMAGE_PATH = '/PC_background.svg';
const QR_CODE_IMAGE_PATH = '/QR.png';
const BEST_QUESTION_IMAGE_PATH = '/Best.svg';
const GAME_START_IMAGE_PATH = '/GameStart.svg';
const REPLAY_IMAGE_PATH = '/Replay.svg'; 

function App() {
  const [currentStage, setCurrentStage] = useState(1);
  const [playersCount, setPlayersCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [timer, setTimer] = useState(30);
  const [playerScores, setPlayerScores] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const playerRankings = { 1: '/1位.svg', 2: '/2位.svg', 3: '/3位.svg', 4: '/4位.svg' };
  const [currentAnimation, setCurrentAnimation] = useState(null);

  useEffect(() => {
    if (currentStage !== 3 || timer === 0) {
      return;
    }
    const intervalId = setInterval(() => {
      setTimer(prevTimer => prevTimer - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [currentStage, timer]);

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socket.on('show_reaction', (data) => {
      console.log('Received reaction:', data.reaction);
      if (animationFiles[data.reaction]) {
        setCurrentAnimation(data.reaction);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleNextStage = () => {
    if (currentStage < 4) {
      setCurrentStage(prevStage => prevStage + 1);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleAnimationEnd = () => {
    setCurrentAnimation(null);
  };

  const renderCurrentStageContent = () => {
    switch (currentStage) {
      case 1:
        return (
          <div className="stage-content stage-1">
            <p className="message-text">キャッチボール相手を探しています...({playersCount}/4)</p>
            <img src={QR_CODE_IMAGE_PATH} alt="QR Code" className="qr-code" />
            <button onClick={handleNextStage} className="next-button">next</button>
          </div>
        );
      case 2:
        return (
          <div className="stage-content stage-2">
            <button onClick={handleNextStage} className="play-ball-button">
              <img src={GAME_START_IMAGE_PATH} alt="Play Ball!" className="play-ball-image" />
            </button>
          </div>
        );
      case 3:
        const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
        const seconds = String(timer % 60).padStart(2, '0');
        
        return (
          <div className="stage-content stage-3">
            <p className="question-text">好きなドラえもんの秘密道具は何？</p>
            <div className="bottom-right-container">
              {/* ★★★ 2. 二重になっていた timer-container を修正 ★★★ */}
              <div className="timer-container">
                <div className="timer-text-wrapper">
                  <div className="round-display">
                    <div>Round</div>
                    <div>{String(roundNumber).padStart(2, '0')}</div>
                  </div>
                  <span className="timer-display">{minutes}:{seconds}</span>
                </div>
              </div>
              <button onClick={handleNextStage} className="next-button">next</button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="stage-content stage-4">
            <div className="best-question-container">
              <img src={BEST_QUESTION_IMAGE_PATH} alt="Best Question" className="best-question-image" />
              <p className="best-question-text">好きなドラえもんの秘密道具は何？</p>
            </div>
            <button onClick={handleRestart} className="restart-button">
              <img src={REPLAY_IMAGE_PATH} alt="もう一度遊ぶ" className="restart-image" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`app-container stage-is-${currentStage}`} style={{ backgroundImage: `url(${BACKGROUND_IMAGE_PATH})` }}>
      {currentAnimation && (
        <div className="animation-overlay">
          <video
            key={currentAnimation}
            width="600"
            height="400"
            autoPlay
            muted
            playsInline
            onEnded={handleAnimationEnd}
          >
            <source src={animationFiles[currentAnimation]} type="video/webm" />
          </video>
        </div>
      )}
      <div className="player-card-layout">
        <PlayerCard playerNumber={1} score={currentStage >= 3 ? playerScores[1] : undefined} rankImage={currentStage === 4 ? playerRankings[1] : null} className="player-1" />
        <PlayerCard playerNumber={2} score={currentStage >= 3 ? playerScores[2] : undefined} rankImage={currentStage === 4 ? playerRankings[2] : null} className="player-2" />
        <PlayerCard playerNumber={3} score={currentStage >= 3 ? playerScores[3] : undefined} rankImage={currentStage === 4 ? playerRankings[3] : null} className="player-3" />
        <PlayerCard playerNumber={4} score={currentStage >= 3 ? playerScores[4] : undefined} rankImage={currentStage === 4 ? playerRankings[4] : null} className="player-4" />
      </div>
      <div className="main-content">
        {renderCurrentStageContent()}
      </div>
    </div>
  );
}

export default App;