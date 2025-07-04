// src/pages/PlayerPage.jsx

import React, { useState, useEffect, useRef } from 'react'; // ★ useRef をインポート
import io from 'socket.io-client';
import './PlayerPage.css';

// バックエンドのURL
const SOCKET_SERVER_URL = 'http://192.168.1.114:3001'; 

function PlayerPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [hintText, setHintText] = useState("ネコ"); /* 仮 */ 

  // ★ socketインスタンスをuseRefで管理
  const socketRef = useRef(null);

  useEffect(() => {
    // socketRef.currentにsocketインスタンスを格納
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Player: Connected to Socket.IO server.');
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('Player: Disconnected from server.');
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // ★★★ リアクションボタンのアクションを修正 ★★★
  const handleAction = (action) => {
    console.log("Action:", action);
    // socketが接続されていれば、リアクション情報をサーバーに送信
    if (socketRef.current && action.startsWith('react_')) {
      const reactionType = action.replace('react_', ''); // 'react_laugh' から 'laugh' を抽出
      socketRef.current.emit('send_reaction', { reaction: reactionType });
      console.log(`Sent reaction: ${reactionType}`);
    }
  };

  return (
    <div className="player-page-container">
      <div className="player-game-screen" style={{ backgroundImage: `url('/Phone_background.svg')` }}>
        
        {/* 上部のボタンエリア */}
        <div className="main-action-buttons">
          {/* handleActionの呼び出しは変更なし */}
          <button className="answer-button" onClick={() => handleAction('answer_question')}>
            <img src="/Shitumon.svg" alt="質問に答える" />
          </button>
          <button className="curious-button" onClick={() => handleAction('curious')}>
            <img src="/Kininaru.svg" alt="気になるボタン" />
          </button>
        </div>

        {/* リアクションエリア */}
        <div className="reaction-area">
          <div className="reaction-line-container">
            <img src="/リアクションライン.svg" alt="リアクションライン" />
          </div>
          <div className="reaction-buttons">
            <button onClick={() => handleAction('react_laugh')}><img src="/爆笑.svg" alt="爆笑" className="reaction-laugh" /></button>
            <button onClick={() => handleAction('react_surprise')}><img src="/驚き.svg" alt="驚き" className="reaction-surprise" /></button>
            <button onClick={() => handleAction('react_angry')}><img src="/怒り.svg" alt="怒り" className="reaction-angry" /></button>
            <button onClick={() => handleAction('react_like')}><img src="/いいね.svg" alt="いいね" className="reaction-like" /></button>
          </div>
        </div>

        {/* ヒントエリア */}
        <div className="hint-container">
          <img src="/ヒント.svg" alt="ヒントアイコン" className="hint-icon" />
          <img src="/ヒント吹き出し.svg" alt="ヒント吹き出し" className="hint-bubble" />
          <p className="hint-text">{hintText}</p>
        </div>
      </div>
    </div>
  );
}

export default PlayerPage;