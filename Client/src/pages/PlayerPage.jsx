import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import io from 'socket.io-client';
import PlayerControls from '../components/PlayerControls';

const SOCKET_SERVER_URL = 'http://localhost:3001';

function PlayerPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialHostId = queryParams.get('hostId');

  const [hostId, setHostId] = useState(initialHostId);
  const [playerId, setPlayerId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [backendMessage, setBackendMessage] = useState("");

  let qrCodeScanner = null;
  let socketInstance;

  useEffect(() => {
    const cleanup = () => {
        if (qrCodeScanner && qrCodeScanner.getState() === 2) {
            qrCodeScanner.clear();
        }
        if (socketInstance) {
            socketInstance.off('connect');
            socketInstance.off('playerRegistered');
            socketInstance.off('gameStarted');
            socketInstance.off('gameTimerUpdate');
            socketInstance.off('roundFinished');
            socketInstance.off('gameFinished'); // ★追加
            socketInstance.off('myScoreUpdate');
            socketInstance.off('backendTextMessage');
            socketInstance.off('connect_error');
            socketInstance.off('disconnect');
            socketInstance.disconnect();
        }
    };

    if (!hostId) {
      qrCodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      qrCodeScanner.render(onScanSuccess, onScanError);
    }

    if (hostId && !isConnected) {
      socketInstance = io(SOCKET_SERVER_URL);

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to Socket.IO server as player.');
        socketInstance.emit('joinHostSession', { hostId: hostId });
      });

      socketInstance.on('playerRegistered', (id) => {
        setPlayerId(id);
        console.log('Registered as Player ID:', id);
        if (qrCodeScanner && qrCodeScanner.getState() === 2) {
          qrCodeScanner.clear();
        }
      });

      socketInstance.on('gameStarted', (initialData) => {
        console.log('Game Started for player!');
        setGameStarted(true);
        setCurrentTimer(initialData.timer);
      });

      socketInstance.on('gameTimerUpdate', (newTime) => {
        setCurrentTimer(newTime);
      });

      socketInstance.on('roundFinished', (nextRoundData) => {
          console.log(`Round Finished! Next Round: ${nextRoundData.nextRound}`);
          if (nextRoundData.nextRound > 3) {
              // 全ラウンド終了後、ゲーム終了とみなし、プレイヤー画面をリセット
              console.log("Player: All rounds finished. Resetting for next game.");
              setGameStarted(false);
              setHostId(null); // ホストIDをクリアし、QRスキャン画面に戻る
              setPlayerId(null);
              setIsConnected(false); // 接続もリセットされる
              setMyScore(0);
              setMyRank(0);
              setCurrentTimer(0);
              setBackendMessage("");
          }
      });

      // ★追加: サーバーからの明示的なゲーム終了通知を受信した時
      socketInstance.on('gameFinished', () => {
        console.log("Player: Game Finished (explicit). Resetting for next game.");
        setGameStarted(false);
        setHostId(null);
        setPlayerId(null);
        setIsConnected(false);
        setMyScore(0);
        setMyRank(0);
        setCurrentTimer(0);
        setBackendMessage("");
      });


      socketInstance.on('myScoreUpdate', (data) => {
        setMyScore(data.score);
        setMyRank(data.rank);
      });

      socketInstance.on('backendTextMessage', (message) => {
          console.log('Received message from backend:', message);
          setBackendMessage(message);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Player Socket.IO connection error:', error);
        setIsConnected(false);
        setHostId(null); // エラー時もリセットしてQR画面に戻る
      });
      socketInstance.on('disconnect', () => {
        console.log('Player disconnected from Socket.IO server.');
        setIsConnected(false);
        setGameStarted(false);
        setHostId(null); // ホストが切断された場合もリセット
        setPlayerId(null);
        setMyScore(0);
        setMyRank(0);
        setCurrentTimer(0);
        setBackendMessage("");
      });
    }

    return cleanup;
  }, [hostId, isConnected]);

  const onScanSuccess = (decodedText, decodedResult) => {
    if (decodedText) {
      console.log(`QR Code scanned: ${decodedText}`);
      try {
        const url = new URL(decodedText);
        const scannedHostId = url.searchParams.get('hostId');
        if (scannedHostId) {
          setHostId(scannedHostId);
        } else {
          console.error("Scanned QR code does not contain 'hostId' parameter.");
          alert("無効なQRコードです。hostIdが見つかりません。");
        }
      } catch (e) {
        console.error("Failed to parse QR code as URL:", e);
        alert("無効なQRコード形式です。");
      }
    }
  };

  const onScanError = (errorMessage) => {
    // console.warn(`QR Code Scan Error: ${errorMessage}`);
  };

  const handlePlayerAction = (actionType) => {
    if (isConnected && playerId && gameStarted && hostId && socketInstance) {
      console.log(`Player ${playerId} sending action: ${actionType}`);
      socketInstance.emit('playerAction', { playerId, hostId: hostId, action: actionType });
    }
  };

  const handleExtendGame = () => {
      if (isConnected && playerId && gameStarted && hostId && socketInstance) {
          console.log(`Player ${playerId} requesting extension!`);
          socketInstance.emit('extendGameTime', { playerId, hostId: hostId, seconds: 1 });
      }
  };

  return (
    <div className="player-page">
      <h1>プレイヤー画面</h1>
      {!hostId ? (
        <div>
          <p>ホストのQRコードをスキャンして参加してください。</p>
          <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: 'auto' }}></div>
        </div>
      ) : (
        <>
          <p>ホストID: {hostId}</p>
          {playerId ? (
            <div>
              <p>あなたのプレイヤー番号: {playerId}</p>
              {gameStarted ? (
                <>
                  <p>現在の点数: {myScore}</p>
                  <p>現在の順位: {myRank}位</p>
                  <p>残り時間: {currentTimer}秒</p>
                  <PlayerControls onAction={handlePlayerAction} />
                  <div className="backend-message-box">
                      {backendMessage && <p>{backendMessage}</p>}
                      {!backendMessage && <p>ここにメッセージが表示されます</p>}
                  </div>
                  <button onClick={handleExtendGame} className="extend-button">
                    延長 (+1秒)
                  </button>
                </>
              ) : (
                <p>ゲーム開始を待っています...</p>
              )}
            </div>
          ) : (
            <p>ホストへの接続中...</p>
          )}
        </>
      )}
    </div>
  );
}

export default PlayerPage;