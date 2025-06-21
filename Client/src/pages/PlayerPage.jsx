import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import PlayerControls from "../components/PlayerControls";

import { serverURL } from "../config/serverConfig";

const SOCKET_SERVER_URL = serverURL;

function PlayerPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialHostId = queryParams.get("hostId");

  const [hostId, setHostId] = useState(initialHostId);
  const [playerId, setPlayerId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false); // 仕様3: このステートを更新
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [backendMessage, setBackendMessage] = useState("");

  // socketインスタンスをコンポーネントのライフサイクル全体で保持するためにuseRefを使用
  const socketRef = useRef(null);
  let qrCodeScanner = null;

  useEffect(() => {
    // hostIdが存在し、まだ接続されていない場合に接続処理を開始
    if (!socketRef.current) {
      const socketInstance = io(SOCKET_SERVER_URL);
      socketRef.current = socketInstance; // refにインスタンスを格納

      socketInstance.on("connect", () => {        
        setIsConnected(true);
        console.log("Connected to Socket.IO server as player.");
        
        // ユーザ入室を呼び出し
        socketInstance.emit("login", { hostId: hostId });
        console.log(`Submitted login event with hostId: ${hostId}`);
      });

      // 番号割り振り
      socketInstance.on("user number", (id) => {
        setPlayerId(id+1);
        console.log("Registered as Player ID:", id);
      });

      // 
      socketInstance.on("gameStarted", (initialData) => {
        console.log("Game Started for player!");
        setGameStarted(true); // ステートを更新
        setCurrentTimer(initialData.timer);
      });

      socketInstance.on("gameTimerUpdate", (newTime) => {
        setCurrentTimer(newTime);
      });

      socketInstance.on("roundFinished", (nextRoundData) => {
        console.log(`Round Finished! Next Round: ${nextRoundData.nextRound}`);
        if (nextRoundData.nextRound > 3) {
          console.log("Player: All rounds finished. Resetting for next game.");
          // (略) 状態リセット処理
        }
      });

      socketInstance.on("gameFinished", () => {
        console.log("Player: Game Finished (explicit). Resetting for next game.");
        // (略) 状態リセット処理
      });

      socketInstance.on("myScoreUpdate", (data) => {
        setMyScore(data.score);
        setMyRank(data.rank);
      });

      socketInstance.on("backendTextMessage", (message) => {
        console.log("Received message from backend:", message);
        setBackendMessage(message);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Player Socket.IO connection error:", error);
        // (略) エラー処理
      });
      
      socketInstance.on("disconnect", () => {
        console.log("Player disconnected from Socket.IO server.");
        setIsConnected(false);
        setGameStarted(false);
        setHostId(null);
        setPlayerId(null);
        setMyScore(0);
        setMyRank(0);
        setCurrentTimer(0);
        setBackendMessage("");
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      });
    }
    
    // クリーンアップ関数
    return () => {
      if (qrCodeScanner && qrCodeScanner.getState() === 2) {
        qrCodeScanner.clear();
      }
      // コンポーネントのアンマウント時にソケットを切断
      if (socketRef.current) {
        console.log("Cleaning up socket connection.");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // 依存配列はhostIdのみでOK

  const onScanSuccess = (decodedText, decodedResult) => {
    // (略) QRコードスキャン成功時の処理
  };

  const onScanError = (errorMessage) => {
    // (略) QRコードスキャンエラー時の処理
  };

  const handlePlayerAction = (actionType) => {
    if (socketRef.current && isConnected && playerId && gameStarted && hostId) {
      console.log(`Player ${playerId} sending action: ${actionType}`);
      socketRef.current.emit("playerAction", {
        playerId,
        hostId: hostId,
        action: actionType,
      });
    }
  };

  const handleExtendGame = () => {
    if (socketRef.current && isConnected && playerId && gameStarted && hostId) {
      console.log(`Player ${playerId} requesting extension!`);
      socketRef.current.emit("extendGameTime", {
        playerId,
        hostId: hostId,
        seconds: 1,
      });
    }
  };

  return (
    <div className="player-page">
      <h1>プレイヤー画面</h1>
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
    </div>
  );
}

export default PlayerPage;