import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { serverURL } from "../config/serverConfig";

// --- 定数定義 ---
const SOCKET_SERVER_URL = serverURL; // 例: バックエンドサーバーのURL
const STATIC_QR_CODE_IMAGE_PATH = "/qr-code-placeholder.png"; // 例: 静的なQRコード画像のパス

// --- 仮のGamePlayingコンポーネント ---
// 実際にはこのコンポーネントを別ファイルで作成し、インポートしてください。
const GamePlaying = ({
  timer,
  currentRound,
  players,
  playerReactions,
  onPlayBall,
  isGameOver,
  onPlayAgain,
}) => (
  <div>
    <h2>ゲームプレイ中</h2>
    <p>タイマー: {timer}</p>
    <p>ラウンド: {currentRound}</p>
    <h3>プレイヤー:</h3>
    <ul>
      {players.map((player) => (
        <li key={player.id}>{player.name}</li>
      ))}
    </ul>
    <h3>プレイヤーのリアクション:</h3>
    <ul>
      {Object.entries(playerReactions).map(([id, reaction]) => (
        <li key={id}>
          Player {id}: {reaction}
        </li>
      ))}
    </ul>
    {isGameOver ? (
      <div>
        <h3>ゲーム終了！</h3>
        <button onClick={onPlayAgain}>もう一度プレイ</button>
      </div>
    ) : (
      <button onClick={onPlayBall}>ボールを投げる</button>
    )}
  </div>
);

function HostPage() {
  // --- Refs ---
  const socketRef = useRef(null);

  // --- State ---
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hostId, setHostId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState("waiting"); // 'waiting' | 'playing'

  // Game State
  const [gameStarted, setGameStarted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [playerReactions, setPlayerReactions] = useState({});
  const [isGameOver, setIsGameOver] = useState(false);

  // --- イベントハンドラ ---
  const handleStartGame = () => {
    if (socketRef.current) {
      console.log("Sending 'start game' event to server.");
      // サーバーにゲーム開始を通知
      socketRef.current.emit("start game");
    }
  };

  const handlePlayBall = () => {
    console.log("Ball played.");
    // ここにボールを投げた際のロジックを実装
  };

  const handlePlayAgain = () => {
    console.log("Resetting game.");
    setIsGameOver(false);
    setGameState("waiting");
    // 必要に応じてサーバーにゲームリセットを通知
    if (socketRef.current) {
      socketRef.current.emit("reset game");
    }
  };

  // --- useEffect for Socket.IO connection ---
  useEffect(() => {
    const socketInstance = io(SOCKET_SERVER_URL, {
      extraHeaders: {
        "ngrok-skip-browser-warning": "true", // ngrokの警告ページをスキップ
      },
    });
    socketRef.current = socketInstance;

    // ソケット接続時の処理
    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to Socket.IO server as host.");
    });

    // サーバーからホストIDを受け取る
    socketInstance.on("host created", (id) => {
      console.log(`Host session created with ID: ${id}`);
      setHostId(id);
    });

    socketInstance.on("disconnect", () => {
      console.log("Host disconnected from Socket.IO server.");
      // 切断時に状態をリセット
      setIsConnected(false);
      setGameStarted(false);
      setHostId(null);
      setPlayers([]);
      setGameState("waiting");
      setIsLoading(true);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Host Socket.IO connection error:", error);
    });

    // プレイヤーが参加したときのリスナー
    socketInstance.on("user joined", (player) => {
      setIsLoading(false);
      // player は Array[{userNumber:1},{userNumber:2},len] の形式であると仮定
      console.log(player);
    });

    // プレイヤーが退出したときのリスナー
    socketInstance.on("user left", (playerId) => {
      console.log(`Player ${playerId} left the game.`);
      setPlayers((prevPlayers) => prevPlayers.filter((p) => p.id !== playerId));
    });

    // ゲーム開始のリスナー
    socketInstance.on("game start", () => {
      console.log("Game Started for host!");
      setGameStarted(true);
      setGameState("playing");
      setIsGameOver(false);
    });

    // ゲーム終了のリスナー
    socketInstance.on("game over", () => {
      console.log("Game over!");
      setIsGameOver(true);
    });

    // 以下は元のコードにあったリスナー（必要に応じてロジックを実装）
    socketInstance.on("new question", (data) => {});
    socketInstance.on("scoreUpdate", (id) => {});

    // --- クリーンアップ関数 ---
    return () => {
      console.log("Cleaning up socket connection.");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <div className="app-container">
      <h1>キャッチボールアプリ (ホスト画面)</h1>
      <>
        {/* 1枚目の画面: ホスト待機・プレイヤー募集 */}
        {gameState === "waiting" && (
          <>
            <h2>プレイヤー募集中</h2>
            <p>プレイヤーは以下のQRコードをスキャンして参加してください。</p>
            <div
              style={{
                background: "white",
                padding: "16px",
                margin: "20px auto",
                width: "fit-content",
                textAlign: "center",
              }}
            >
              {/* 本来はホストIDを含むURL（例: `https://example.com/join?host=${hostId}`）を
                  動的にQRコード化するライブラリ（例: qrcode.react）を使うのが理想です。
                */}
              <img
                src={STATIC_QR_CODE_IMAGE_PATH}
                alt="Player Join QR Code"
                style={{ width: 256, height: 256 }}
              />
              <p>ホストID: {hostId}</p>
            </div>

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
        )}

        {/* 2枚目の画面: ゲームプレイ中（兼ゲーム終了表示） */}
        {gameState === "playing" && (
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
    </div>
  );
}

export default HostPage;
