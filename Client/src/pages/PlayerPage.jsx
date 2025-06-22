import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import PlayerControls from "../components/PlayerControls";
import { serverURL } from "../config/serverConfig";
import VoiceMotionPopup from "../components/Player/PopUp/VoiceMotionPopup";

const SOCKET_SERVER_URL = serverURL;

function PlayerPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialHostId = queryParams.get("hostId");

  // --- State Definitions ---
  const [hostId, setHostId] = useState(initialHostId);
  const [playerId, setPlayerId] = useState(null);

  const [playerRole, setPlayerRole] = useState("waiter");
  const [isSendQuestion, setIsSendQuestion] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);

  const [currentTimer, setCurrentTimer] = useState(0);
  const [backendMessage, setBackendMessage] = useState("");

  // --- Refs ---
  const socketRef = useRef(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_SERVER_URL, {
      extraHeaders: {
        "ngrok-skip-browser-warning": "true", // ngrokの警告ページをスキップするためのヘッダー
      },
    });
    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to Socket.IO server as player.");

      // ユーザ入室を呼び出し
      if (playerId === null) {
        socketInstance.emit("login");
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("Player disconnected from Socket.IO server.");
      setIsConnected(false);
      setGameStarted(false);
      setHostId(null);
      setPlayerId(null);
      setPlayerRole("waiter");
      setMyScore(0);
      setMyRank(0);
      setCurrentTimer(0);
      setBackendMessage("");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Player Socket.IO connection error:", error);
    });

    // 番号割り振り
    socketInstance.on("user number", (id) => {
      console.log("Received user number from server:", id);
      setPlayerId(id + 1);
      console.log("Registered as Player ID:", id + 1);
    });

    // プレイヤーが集まりゲームが開始
    socketInstance.on("game start", () => {
      console.log("Game Started for player!");
      setGameStarted(true);
      // setCurrentTimer(initialData.timer);
    });

    socketInstance.on("new question", (question) => {
      console.log("New Question Received:", question);
      setBackendMessage(question.text);
    });

    socketInstance.on("gameTimerUpdate", (newTime) => {
      setCurrentTimer(newTime);
    });

    socketInstance.on("myScoreUpdate", (data) => {
      setMyScore(data.score);
      setMyRank(data.rank);
    });

    socketInstance.on("backendTextMessage", (message) => {
      console.log("Received message from backend:", message);
      setBackendMessage(message);
    });

    socketInstance.on("roundFinished", (nextRoundData) => {
      console.log(`Round Finished! Next Round: ${nextRoundData.nextRound}`);
      if (nextRoundData.nextRound > 3) {
        console.log("Player: All rounds finished. Resetting for next game.");
      }
    });

    socketInstance.on("gameFinished", () => {
      console.log("Player: Game Finished (explicit). Resetting for next game.");
    });

    // --- クリーンアップ関数 ---
    return () => {
      console.log("Cleaning up socket connection.");
      socketInstance.disconnect();
      socketRef.current = null;
      // if (qrCodeScanner && qrCodeScanner.getState() === 2) {
      //   qrCodeScanner.clear();
      // }
    };
  }, [hostId]); // hostIdが変更された場合に再接続（基本的には初回のみ）

  // --- Effect 2: playerIdに依存するイベントリスナーの管理 ---
  useEffect(() => {
    // socketインスタンスが存在し、かつplayerIdがセットされている場合のみ実行
    if (!socketRef.current || playerId === null) {
      return;
    }
    const socketInstance = socketRef.current;

    const questionerDecidedHandler = (questionerID) => {
      console.log(
        `Questioner decided: Player ${questionerID}. This decision is for player ${playerId}`
      );

      const newRole = questionerID === playerId ? "questioner" : "waiter";
      setPlayerRole(newRole);
      // 正しい方法でロール名をログに出力
      console.log(`Player ${playerId} is assigned role: ${newRole}`);
    };

    // イベントリスナーを登録
    socketInstance.on("questioner decided", questionerDecidedHandler);

    // クリーンアップ関数
    return () => {
      socketInstance.off("questioner decided", questionerDecidedHandler);
    };
  }, [playerId]);

  // --- Action Handlers ---
  const handlePlayerAction = (actionType, msg) => {
    console.log(`Player ${playerId} performing action: ${actionType}`, msg);

    switch (actionType) {
      case "ask_question":
        if (playerRole === "questioner") {
          setIsSendQuestion(true);
          socketRef.current.emit("send question", msg);
        } else {
          console.warn("Player is not allowed to ask questions.");
        }
        break;
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
        <p>ホストID: {hostId || "N/A"}</p>
        <p>プレイヤーの役割: {playerRole}</p>
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
                  {backendMessage ? (
                    <p>{backendMessage}</p>
                  ) : (
                    <p>ここにメッセージが表示されます</p>
                  )}
                </div>
                <button onClick={handleExtendGame} className="extend-button">
                  延長 (+1秒)
                </button>
                {playerRole === "questioner" && !isSendQuestion ? (
                  <VoiceMotionPopup handleSend={handlePlayerAction} />
                ) : null}
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
