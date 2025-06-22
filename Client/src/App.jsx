import React, { useState, useEffect } from 'react';
// import QRCode from 'react-qr-code';
import io from 'socket.io-client'; // ioをインポート
import GamePlaying from './components/GamePlaying';

import './App.css';

const SOCKET_SERVER_URL = 'http://localhost:3001';
const STATIC_QR_CODE_IMAGE_PATH = '/qr_code.png';

// socket変数をuseEffectの外で定義し、nullで初期化
// これにより、useEffect内外から同じインスタンスを参照できるようになります
let socket = null; 

function App() {
  const [hostId, setHostId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerReactions, setPlayerReactions] = useState({});
  const [gameState, setGameState] = useState('waiting');
  const [currentRound, setCurrentRound] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);

  const playerAccessUrl = hostId ? `${FRONTEND_BASE_URL}/player?hostId=${hostId}` : '';

  useEffect(() => {
    // Socket.IOインスタンスがまだ作成されていない場合のみ作成
    if (!socket) {
      socket = io(SOCKET_SERVER_URL);
      console.log("Socket.IO instance created.");
    }

    // hostIdがnullでisLoading中でない場合に新しいセッション作成を試みる
    if (!hostId && !isLoading) {
        setIsLoading(true);
        // socket.disconnect()とsocket.connect()は、既存のsocketインスタンスに対して行う
        // useEffectの依存配列[hostId, isLoading]により、hostIdがnullになったときに再実行される
        if (socket.connected) { // 既に接続済みの場合は切断しない
            socket.disconnect();
            console.log("Socket disconnected for new session.");
        }
        socket.connect(); // 新しいセッションのために接続
        console.log("Socket attempting to connect for new session.");
        socket.emit('createHostSession');
    }


    socket.on('hostSessionCreated', (id) => {
      setHostId(id);
      console.log('Host Session Created:', id);
      setIsLoading(false);
      setGameState('waiting');
      setPlayers([]);
      setPlayerReactions({});
      setCurrentRound(0);
      setTimer(0);
      setIsGameOver(false);
    });

    socket.on('playerJoined', (playerData) => {
      console.log('Player Joined:', playerData);
      setPlayers((prevPlayers) => {
        if (!prevPlayers.some(p => p.id === playerData.id)) {
          return [...prevPlayers, { ...playerData, lastReaction: null, score: 0 }];
        }
        return prevPlayers;
      });
      setPlayerReactions((prev) => ({ ...prev, [playerData.id]: null }));
    });

    socket.on('gameStarted', (initialData) => {
      console.log('Game Started!');
      setGameState('playing');
      setTimer(initialData.timer);
      setCurrentRound(initialData.currentRound);
      setIsGameOver(false);
    });

    socket.on('gameTimerUpdate', (newTime) => {
      setTimer(newTime);
    });

    socket.on('roundFinished', (nextRoundData) => {
      console.log(`Round Finished! Next Round: ${nextRoundData.nextRound}`);
      if (nextRoundData.nextRound > 3) {
        console.log('All rounds finished. Game Over.');
        setIsGameOver(true);
      } else {
        setTimer(nextRoundData.timer);
        setCurrentRound(nextRoundData.nextRound);
        setIsGameOver(false);
      }
    });

    socket.on('gameFinished', () => {
        console.log('Game Finished from server! (explicit)');
        setIsGameOver(true);
    });

    socket.on('playerScoresUpdate', (updatedPlayers) => {
        setPlayers(updatedPlayers);
    });

    socket.on('playerReaction', ({ playerId, reactionType }) => {
      console.log(`Player ${playerId} reacted with: ${reactionType}`);
      setPlayerReactions((prev) => ({
        ...prev,
        [playerId]: reactionType
      }));
      setPlayers(prevPlayers => prevPlayers.map(p =>
        p.id === playerId ? { ...p, lastReaction: reactionType } : p
      ));
    });

    socket.on('playerLeft', ({ playerId }) => {
      console.log(`Player ${playerId} left.`);
      setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== playerId));
      setPlayerReactions(prev => {
        const newReactions = { ...prev };
        delete newReactions[playerId];
        return newReactions;
      });
    });

    // クリーンアップ関数
    return () => {
      // コンポーネントがアンマウントされるときに、リスナーをすべてオフにする
      socket.off('hostSessionCreated');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('gameTimerUpdate');
      socket.off('roundFinished');
      socket.off('gameFinished');
      socket.off('playerScoresUpdate');
      socket.off('playerReaction');
      socket.off('playerLeft');
      // ここでsocket.disconnect()は呼ばない（他のコンポーネントでも使う可能性、または再利用のため）
      // もしアプリ全体でSocket.IO接続を1つだけに厳密にしたいなら、メインのuseEffectから行う
    };
  }, [hostId, isLoading]); // hostIdとisLoadingが変更された時に再実行

  const handleStartGame = () => {
    // socketが定義されていることを確認
    if (socket) {
      socket.emit('startGame', hostId);
    } else {
      console.error("Socket is not initialized.");
    }
  };

  const handlePlayBall = () => {
    // socketが定義されていることを確認
    if (socket) {
      console.log('Host clicked Play Ball!');
      socket.emit('hostPlayBall', hostId);
    } else {
      console.error("Socket is not initialized.");
    }
  };

  const handlePlayAgain = () => {
    // socketが定義されていることを確認
    if (socket) {
      console.log('Host clicked Play Again. Requesting session reset...');
      socket.emit('resetSessionAndCreateNewHost', hostId);
    } else {
      console.error("Socket is not initialized.");
    }
  };


  return (
    <div className="app-container">
      <h1>キャッチボールアプリ</h1>

      {isLoading ? (
        <div className="loading-spinner">
          <p>ホストセッション準備中...<br/>（QRコード画像を読み込み中）</p>
        </div>
      ) : (
        <>
          {/* 1枚目の画面: ホスト待機・プレイヤー募集 */}
          {gameState === 'waiting' && (
            <>
              {/* ホストIDの存在はバックエンド通信のためにチェックするが、QRコード表示は画像に置き換え */}
              {hostId ? (
                <>
                  <p>プレイヤーは以下のQRコードをスキャンして参加してください。</p>
                  <div style={{ background: 'white', padding: '16px', margin: '20px auto', width: 'fit-content' }}>
                    <img src={STATIC_QR_CODE_IMAGE_PATH} alt="Player Join QR Code" style={{ width: 256, height: 256 }} />
                  </div>

                  <h2>参加中のプレイヤー ({players.length}人):</h2>
                  {players.length > 0 ? (
                    <ul>
                      {players.map((player) => (
                        <li key={player.id}>{player.name || `プレイヤー${player.id}`}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>まだプレイヤーが参加していません。</p>
                  )}

                  <button
                    onClick={handleStartGame}
                    disabled={players.length < 1}
                  >
                    この人数で開始
                  </button>
                </>
              ) : (
                <p>ホストセッションを作成中...（少々お待ちください）</p>
              )}
            </>
          )}

          {/* 2枚目の画面: ゲームプレイ中（兼ゲーム終了表示） */}
          {gameState === 'playing' && (
            <GamePlaying
              timer={timer}
              currentRound={currentRound}
              players={players}
              playerReactions={playerReactions}
              onPlayBall={handlePlayBall}
              isGameOver={isGameOver}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;