import React, { useState, useEffect } from 'react';
import PlayerCard from './components/PlayerCard';
import './App.css'; 

// 画像パスの定義 (publicフォルダからの相対パス)
const QR_CODE_IMAGE_PATH = '/QR.png';
const BEST_QUESTION_IMAGE_PATH = '/Best.svg';
const BACKGROUND_IMAGE_PATH = '/PC_背景.svg';

function App() {
  // currentStage: 1=QR, 2=Play Ball, 3=Game, 4=Result
  const [currentStage, setCurrentStage] = useState(1);
  const [playersCount, setPlayersCount] = useState(0); // プレイヤー数（仮）
  const [roundNumber, setRoundNumber] = useState(1); // ラウンド数（仮）
  const [timer, setTimer] = useState(60); // タイマー（仮）
  const [playerScores, setPlayerScores] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  // ランキング表示用のダミーデータ (PlayerCardに渡す)
  const playerRankings = {
    1: '/1位.svg',
    2: '/2位.svg',
    3: '/3位.svg',
    4: '/4位.svg',
  };

  // Socket.IO関連のコードは全て削除またはコメントアウトします。
  // useEffect(() => {
  //   // Socket.IO接続ロジックは削除
  //   return () => {
  //     // クリーンアップロジックは削除
  //   };
  // }, []);

  // 次のステージへ進むハンドラ
  const handleNextStage = () => {
    if (currentStage < 4) {
      setCurrentStage(prevStage => prevStage + 1);
    } else {
      // Case 4から「もう一度遊ぶ」でCase 1に戻る場合はページリロード
      window.location.reload();
    }
  };

  // 各ステージのコンテンツをレンダリングする関数
  const renderCurrentStageContent = () => {
    switch (currentStage) {
      case 1: // Case 1: QRコードとプレイヤー募集
        return (
          <div className="stage-content stage-1">
            <p className="text-component">キャッチボール相手を探しています...({playersCount}/4)</p>
            <img src={QR_CODE_IMAGE_PATH} alt="QR Code" className="qr-code" />
            <button onClick={handleNextStage} className="next-button">Next (Case 2へ)</button>
          </div>
        );
      case 2: // Case 2: Play Ball!ボタン
        return (
          <div className="stage-content stage-2">
            <button onClick={handleNextStage} className="play-ball-button">Play Ball!</button>
          </div>
        );
      case 3: // Case 3: ゲームプレイ中
        return (
          <div className="stage-content stage-3">
            <p className="text-component">質問テキストがここに表示されます。</p>
            <div className="game-info">
              <span className="round-display">Round: {roundNumber}</span>
              <span className="timer-display">Time: {timer}s</span>
            </div>
            <button onClick={handleNextStage} className="next-button">Next (Case 4へ)</button>
          </div>
        );
      case 4: // Case 4: 結果表示
        return (
          <div className="stage-content stage-4">
            <div className="best-question-container">
              <img src={BEST_QUESTION_IMAGE_PATH} alt="Best Question" className="best-question-image" />
              <p className="best-question-text">好きなドラえもんの秘密道具は何？</p>
            </div>
            <button onClick={handleNextStage} className="restart-button">もう一度遊ぶ</button>
          </div>
        );
      default:
        return null;
    }
  };

   return (
    // ★app-container のスタイルを調整し、position: relative; を追加
    <div className="app-container" style={{
      position: 'relative', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start', // 上部に寄せる
      minHeight: '100vh', // 画面いっぱいに広げる
      padding: '20px',
      color: '#333',
      overflow: 'hidden',
      boxSizing: 'border-box' // paddingがwidth/heightに含まれるように
    }}>
      {/* ★画面背景画像 (最も奥に配置) */}
      <img
        src={BACKGROUND_IMAGE_PATH}
        alt="背景"
        style={{
          position: 'absolute', // 親要素 (app-container) に対して絶対位置
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover', // アスペクト比を維持しつつ要素を覆う
          zIndex: -1, // 他のコンテンツより奥に配置
        }}
      />
      {/* 固定要素: PlayerCardコンポーネント */}
      <div className="player-cards-container">
        {/* PlayerCardにスコアとランキングを渡す */}
        <PlayerCard playerNumber={1} score={playerScores[1]} rankImage={currentStage === 4 ? playerRankings[1] : null} />
        <PlayerCard playerNumber={2} score={playerScores[2]} rankImage={currentStage === 4 ? playerRankings[2] : null} />
        <PlayerCard playerNumber={3} score={playerScores[3]} rankImage={currentStage === 4 ? playerRankings[3] : null} />
        <PlayerCard playerNumber={4} score={playerScores[4]} rankImage={currentStage === 4 ? playerRankings[4] : null} />
      </div>

      {/* 各ステージのコンテンツ */}
      <div className="main-content">
        {renderCurrentStageContent()}
      </div>
    </div>
  );
}

export default App;