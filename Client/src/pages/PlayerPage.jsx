import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import PlayerControls from "../components/PlayerControls";
import { URL } from "../ServerURL";
import VoiceMotionPopup from "../components/Player/PopUp/VoiceMotionPopup";
import CatchPopupComponent from "../components/Player/PopUp/CatchPopupComponent";
import "./PlayerPage.css";
import HintText from "../components/Player/Hint/HintText";

const SOCKET_SERVER_URL = URL;

function PlayerPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialHostId = queryParams.get("hostId");

  // --- State Definitions ---
  const [hostId, setHostId] = useState(initialHostId);
  const [playerId, setPlayerId] = useState(null);

  const [playerRole, setPlayerRole] = useState("waiter"); // "waiter" | "questioner" | "answerer"
  const [isSendQuestion, setIsSendQuestion] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [ansTimer, setAnsTimer] = useState(0);

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

      const newRole = questionerID + 1 === playerId ? "questioner" : "waiter";
      setPlayerRole(newRole);
      // 正しい方法でロール名をログに出力
      console.log(`Player ${playerId} is assigned role: ${newRole}`);
    };

    socketInstance.on("retry_question", questionerDecidedHandler);

    // イベントリスナーを登録
    socketInstance.on("questioner decided", questionerDecidedHandler);

    socketInstance.on("timer_update", (data) => {
      setTimeLeft(data.timeLeft);
      setAnsTimer(data.ansTimer);

      data.players.map((player) => {
        if (player.userNumber + 1 == playerId) setMyScore(player.score);
      });
    });

    // クリーンアップ関数
    return () => {
      socketInstance.off("questioner decided", questionerDecidedHandler);
      socketInstance.off("retry_question", questionerDecidedHandler);
      socketInstance.off("timer_update", (data) => {
        setTimeLeft(data.timeLeft);
        setAnsTimer(data.ansTimer);
        data.players.map((player) => {
          if (player.userNumber == playerId) setMyScore(player.score);
        });
      });
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
      case "ans_question":
        if (playerRole === "waiter") {
          if (playerRole === "waiter") {
            setPlayerRole("answerer");
            setIsAnswering(true);
          }
        }
        break;
      case "ans":
        if (playerRole === "answerer") {
          setIsAnswering(false);
          socketRef.current.emit("send answer", msg);
        }
        break;

      case "react_laugh":
        socketRef.current.emit("reaction", 0);
        break;
      case "react_surprise":
        socketRef.current.emit("reaction", 1);
        break;
      case "react_angry":
        socketRef.current.emit("reaction", 2);
        break;
      case "react_like":
        socketRef.current.emit("reaction", 3);
        break;
    }
  };

  const handleAns = () => {
    setIsAnswering(false);

    socketRef.current.emit("send answer", {
      userNumber: playerId + 1,
      answer: "demo-answer",
    });
  };

  const handleExtendGame = () => {
    console.log(`Player ${playerId} requesting extension!`);
    socketRef.current.emit("clicked");
  };

  return (
    <div className="player-page-container">
      <div
        className="player-game-screen"
        style={{ backgroundImage: `url('/Phone_background.svg')` }}
      >
        {playerRole == "answerer" && isAnswering ? (
          <CatchPopupComponent handleSend={handleAns} question={backendMessage}/>
        ) : null}

        {playerRole === "questioner" && !isSendQuestion ? (
          <VoiceMotionPopup handleSend={handlePlayerAction} />
        ) : null}

        {/* 上部のボタンエリア */}
        <div className="main-action-buttons">
          {/* handleActionの呼び出しは変更なし */}
          <button
            className="answer-button"
            onClick={() => handlePlayerAction("ans_question")}
          >
            <img src="/Shitumon.svg" alt="質問に答える" />
          </button>
          <button className="curious-button" onClick={handleExtendGame}>
            <img src="/Kininaru.svg" alt="気になるボタン" />
          </button>
        </div>

        {/* リアクションエリア */}
        <div className="reaction-area">
          <div className="reaction-line-container">
            <img src="/リアクションライン.svg" alt="リアクションライン" />
          </div>
          <div className="reaction-buttons">
            <button onClick={() => handlePlayerAction("react_laugh")}>
              <img src="/爆笑.svg" alt="爆笑" className="reaction-laugh" />
            </button>
            <button onClick={() => handlePlayerAction("react_surprise")}>
              <img src="/驚き.svg" alt="驚き" className="reaction-surprise" />
            </button>
            <button onClick={() => handlePlayerAction("react_angry")}>
              <img src="/怒り.svg" alt="怒り" className="reaction-angry" />
            </button>
            <button onClick={() => handlePlayerAction("react_like")}>
              <img src="/いいね.svg" alt="いいね" className="reaction-like" />
            </button>
          </div>
        </div>

        {/* ヒントエリア */}
        <div className="hint-container">
          <img src="/ヒント.svg" alt="ヒントアイコン" className="hint-icon" />
          <img
            src="/ヒント吹き出し.svg"
            alt="ヒント吹き出し"
            className="hint-bubble"
          />
          <p className="hint-text"><HintText /></p>
        </div>
      </div>
    </div>
  );
}

export default PlayerPage;
