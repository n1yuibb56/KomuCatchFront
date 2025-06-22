import React, { useState, useEffect } from "react";

// Socket.io
import io from "socket.io-client";
import { serverURL } from "./config/serverConfig";
const socket = io(serverURL, {
  extraHeaders: {
    "ngrok-skip-browser-warning": "true", // ngrokの警告ページをスキップするためのヘッダー
  },
});

// プレイヤー参加用QR
// const FRONTEND_BASE_URL = 'http://localhost:5173'; // QRコード画像で固定URLを使用するため不要になる可能性
// ★追加: 固定QRコード画像のパス
// publicフォルダ直下にqr_code.pngを置くことを想定
const STATIC_QR_CODE_IMAGE_PATH = "/QRCode.png";

// 他components
import GamePlaying from "./components/GamePlaying";
// import VoiceMotionPopup from './components/Player/PopUp/VoiceMotionPopup';

// CSS
import "./App.css";

function App() {
  const [hostId, setHostId] = useState(null); // ゲームセッション管理のため、hostIdはバックエンドから取得し続ける
  const [players, setPlayers] = useState([]);
  const [playerReactions, setPlayerReactions] = useState({});
  const [gameState, setGameState] = useState("waiting");
  const [currentRound, setCurrentRound] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [nowQuestion, setNowQuestion] = useState(""); // 現在の質問内容

  useEffect(() => {
    socket.on("hostSessionCreated", (id) => {
      setHostId(id);
      console.log("Host Session Created:", id);
      setIsLoading(false);
      setGameState("waiting");
      setPlayers([]);
      setPlayerReactions({});
      setCurrentRound(0);
      setTimer(0);
      setIsGameOver(false);
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server as host.");
      setIsLoading(false);
    });

    socket.on("user joined", (playerData) => {
      // playerData は Array<{userNumber:1},{userNumber:2}> の形式である
      // playersは Array<{id: string, name: string, score: number}> の形式である
      // playerDataをplayersに変換し変換し代入
      // 例: playerData = [{userNumber: 1}, {userNumber: 2}]
      // players = [{id: '1', name: 'Player1', score: 0}, {id: '2', name: 'Player2', score: 0}]
      console.log(
        "Player Joined:",
        playerData[playerData.length - 1].userNumber
      );
      const newPlayer = {
        id: playerData[playerData.length - 1].userNumber.toString(),
        name: `プレイヤー${playerData[playerData.length - 1].userNumber + 1}`,
        score: 0,
      };
      setPlayers((prevPlayers) => [...prevPlayers, newPlayer]);
      console.log(`Player Joined: ${newPlayer.name} (ID: ${newPlayer.id})`);
    });

    socket.on("game start", (initialData) => {
      console.log("Game Started!");
      setGameState("playing");
      // setTimer(initialData.timer);
      // setCurrentRound(initialData.currentRound);
      setIsGameOver(false);
    });

    socket.on("new question", (question) => {
      console.log("New Question Received:", question);
      setNowQuestion(question.text);
    });

    socket.on("gameTimerUpdate", (newTime) => {
      setTimer(newTime);
    });

    socket.on("roundFinished", (nextRoundData) => {
      console.log(`Round Finished! Next Round: ${nextRoundData.nextRound}`);
      if (nextRoundData.nextRound > 3) {
        console.log("All rounds finished. Game Over.");
        setIsGameOver(true);
      } else {
        setTimer(nextRoundData.timer);
        setCurrentRound(nextRoundData.nextRound);
        setIsGameOver(false);
      }
    });

    socket.on("gameFinished", () => {
      console.log("Game Finished from server! (explicit)");
      setIsGameOver(true);
    });

    socket.on("playerScoresUpdate", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on("playerReaction", ({ playerId, reactionType }) => {
      console.log(`Player ${playerId} reacted with: ${reactionType}`);
      setPlayerReactions((prev) => ({
        ...prev,
        [playerId]: reactionType,
      }));
      setPlayers((prevPlayers) =>
        prevPlayers.map((p) =>
          p.id === playerId ? { ...p, lastReaction: reactionType } : p
        )
      );
    });

    socket.on("playerLeft", ({ playerId }) => {
      console.log(`Player ${playerId} left.`);
      setPlayers((prevPlayers) => prevPlayers.filter((p) => p.id !== playerId));
      setPlayerReactions((prev) => {
        const newReactions = { ...prev };
        delete newReactions[playerId];
        return newReactions;
      });
    });

    return () => {
      socket.off("hostSessionCreated");
      socket.off("playerJoined");
      socket.off("gameStarted");
      socket.off("gameTimerUpdate");
      socket.off("roundFinished");
      socket.off("gameFinished");
      socket.off("playerScoresUpdate");
      socket.off("playerReaction");
      socket.off("playerLeft");
    };
  }, []);

  const handleStartGame = () => {
    socket.emit("startGame", hostId);
  };

  const handlePlayBall = () => {
    console.log("Host clicked Play Ball!");
    socket.emit("hostPlayBall", hostId);
  };

  const handlePlayAgain = () => {
    console.log("Host clicked Play Again. Requesting session reset...");
    socket.emit("resetSessionAndCreateNewHost", hostId);
  };

  return (
    <div className="app-container">
      <h1>キャッチボールアプリ</h1>
      <>
        {/* 1枚目の画面: ホスト待機・プレイヤー募集 */}
        {gameState === "waiting" && (
          <>
            {/* ホストIDの存在はバックエンド通信のためにチェックするが、QRコード表示は画像に置き換え */}
            <>
              <p>プレイヤーは以下のQRコードをスキャンして参加してください。</p>
              <div
                style={{
                  background: "white",
                  padding: "16px",
                  margin: "20px auto",
                  width: "fit-content",
                }}
              >
                {/* ★QRコードコンポーネントを削除し、imgタグに変更 */}
                <img
                  src={STATIC_QR_CODE_IMAGE_PATH}
                  alt="Player Join QR Code"
                  style={{ width: 256, height: 256 }}
                />
              </div>
              {/* 固定URLの直接入力ガイドは不要になる場合が多いが、残すことも可能 */}
              {/* <p>または、このURLを直接入力してください:</p>
                  <p><strong>{FRONTEND_BASE_URL}/player?hostId=<固定ID></strong></p> */}

              <h2>参加中のプレイヤー ({players.length}人):</h2>
              {players.length > 0 ? (
                <ul>
                  {players.map((player) => (
                    <li key={player.id}>
                      {player.name || `プレイヤー${player.id}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>まだプレイヤーが参加していません。</p>
              )}

              <button onClick={handleStartGame} disabled={players.length < 1}>
                この人数で開始
              </button>
            </>
          </>
        )}

        {/* 2枚目の画面: ゲームプレイ中（兼ゲーム終了表示） */}
        {gameState === "playing" && (
          <>
            <GamePlaying
              timer={timer}
              currentRound={currentRound}
              players={players}
              playerReactions={playerReactions}
              onPlayBall={handlePlayBall}
              isGameOver={isGameOver}
              onPlayAgain={handlePlayAgain}
            />
            <p>{nowQuestion}</p>
          </>
        )}
      </>
    </div>
  );
}

export default App;
