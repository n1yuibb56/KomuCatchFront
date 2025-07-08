import React, { useState, useEffect } from "react";
import PlayerCard from "./components/PlayerCard"; // PlayerCardコンポーネントをインポート

// Socket.io
import io from "socket.io-client";
// ★★★ サーバーのURLをあなたの環境に合わせて設定してください ★★★
import { URL } from "./ServerURL";
const serverURL = URL; // 例: "https://your-server.ngrok.io"
const socket = io(serverURL, {
  extraHeaders: {
    "ngrok-skip-browser-warning": "true", // ngrokの警告ページをスキップ
  },
});

// 画像パスの定義 (publicフォルダからの相対パス)
const BACKGROUND_IMAGE_PATH = "/PC_background.svg";
const QR_CODE_IMAGE_PATH = "/QRCode(16).png"; // 以前のQR.pngから変更
const BEST_QUESTION_IMAGE_PATH = "/Best.svg";
const GAME_START_IMAGE_PATH = "/GameStart.svg";
const REPLAY_IMAGE_PATH = "/Replay.svg";
// アニメーションファイルへのパスを定義
const animationFiles = ["","/lought.webm","/驚き.webm","/怒り.webm","/いいね.webm"]

// CSS
import "./App.css";

function App() {
  // --- State Management ---
  // currentStage: 1=QR待機, 2=ゲーム開始ボタン, 3=ゲーム中, 4=結果表示
  const [currentStage, setCurrentStage] = useState(1);
  const [hostId, setHostId] = useState(null);
  const [players, setPlayers] = useState([]); // {id, name, score} の配列
  const [playerReactions, setPlayerReactions] = useState({});
  const [currentRound, setCurrentRound] = useState(1);
  const [timer, setTimer] = useState(0);
  const [nowQuestion, setNowQuestion] = useState(""); // 現在の質問
  const [isLoading, setIsLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const [playerRank, SetPlayerRank] = useState([]);
  const playerRankings = {
    1: "/1位.svg",
    2: "/2位.svg",
    3: "/3位.svg",
    4: "/4位.svg",
  };
  const [currentAnimation, setCurrentAnimation] = useState(null);

  // --- Socket.IO Event Handlers ---
  useEffect(() => {
    // 接続成功
    socket.on("connect", () => {
      console.log("サーバーに接続しました。 Host ID:", socket.id);
      setIsLoading(false);
    });

    // ホストセッション作成完了
    socket.on("hostSessionCreated", (id) => {
      setHostId(id);
      console.log("ホストセッションが作成されました:", id);
      // 初期状態にリセット
      setCurrentStage(1);
      setPlayers([]);
      setPlayerReactions({});
      setCurrentRound(0);
      setTimer(0);
      setNowQuestion("");
      setIsLoading(false);
    });

    // プレイヤー参加
    socket.on("user joined", (playerData) => {
      console.log("プレイヤーが参加しました:", playerData);
      const newPlayers = playerData.map((p) => ({
        id: p.userNumber.toString(),
        name: `プレイヤー${p.userNumber + 1}`,
        score: 0,
      }));
      setPlayers(newPlayers);
      renderPlayerCards();
    });

    // ゲーム開始
    socket.on("game start", (initialData) => {
      console.log("ゲームが開始されました！");
      setCurrentStage(3); // ゲーム中ステージへ
      // setCurrentRound(initialData.currentRound);
      // setTimer(initialData.timer);
    });

    // 新しい質問の受信
    socket.on("new question", (question) => {
      console.log("新しい質問:", question.text);
      setNowQuestion(question.text);
    });

    // タイマー更新
    socket.on("timer_update", (data) => {
      if (!data.isAnswerTimeActive) setTimer(data.timeLeft);
      else {setTimer(data.ansTimer);}
      

      if (data.players) {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => {
            const updatedInfo = data.players.find(
              (p) => p.userNumber === parseInt(player.id)
            );

            return updatedInfo
              ? { ...player, score: updatedInfo.score }
              : player;
          })
        );
      }
    });

    // ラウンド終了
    socket.on("roundFinished", (nowRoundCount) => {
      setCurrentRound(nowRoundCount);
    });

    // ゲーム終了
    socket.on("game finished", () => {
      setCurrentStage(4); // 結果表示ステージへ
    });

    // スコア更新
    socket.on("playerScoresUpdate", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    // プレイヤーのリアクション
    socket.on("playerReaction", ({ playerId, reactionType }) => {
      console.log(`プレイヤー ${playerId} がリアクション: ${reactionType}`);
      setPlayerReactions((prev) => ({ ...prev, [playerId]: reactionType }));
    });

    // プレイヤー退出
    socket.on("playerLeft", ({ playerId }) => {
      console.log(`プレイヤー ${playerId} が退出しました。`);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    socket.on('show_reaction', (data) => {
      if (animationFiles[data.reaction + 1]) {
        setCurrentAnimation(data.reaction + 1);
      }
    });

    socket.on("game reset", () => {});

    socket.on("time extended", () => {});

    socket.on("update player list", (playerList) => {
      console.log(playerList);

      setPlayers(playerList);
    });

    // クリーンアップ関数
    return () => {
      socket.off("connect");
      socket.off("hostSessionCreated");
      socket.off("user joined");
      socket.off("game start");
      socket.off("new question");
      socket.off("gameTimerUpdate");
      socket.off("roundFinished");
      socket.off("gameFinished");
      socket.off("playerScoresUpdate");
      socket.off("playerReaction");
      socket.off("playerLeft");
    };
  }, []);

  useEffect(() => {
    if (players.length == 4 && currentStage < 2) {
      setCurrentStage(2);
    }
  }, [players]);

  // --- Event Handlers ---
  // ゲーム開始ボタン（待機画面 -> 開始確認画面）
  const handleStartGame = () => {
    if (players.length > 0) {
      setCurrentStage(2); // Play Ball!画面へ
    } else {
      alert("プレイヤーが1人以上参加するまで開始できません。");
    }
  };

  // Play Ball!ボタン（開始確認画面 -> ゲーム中）
  const handlePlayBall = () => {
    console.log("ホストがPlay Ballをクリックしました！");
    socket.emit("startGame"); // サーバーにゲーム開始を通知
  };

  // もう一度遊ぶボタン
  const handlePlayAgain = () => {
    console.log("もう一度遊ぶ... セッションのリセットを要求します。");
    socket.emit("resetSessionAndCreateNewHost", hostId);
  };

  const handleAnimationEnd = () => {
    setCurrentAnimation(null);
  };

  // --- Rendering Logic ---
  // プレイヤーカードのレンダリング
  // renderPlayerCards 関数内
  const renderPlayerCards = () => {
    var rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    const playerRankings = {
      0: "/1位.svg",
      1: "/2位.svg",
      2: "/3位.svg",
      3: "/4位.svg",
    };

    const cardData = Array(4)
      .fill(null)
      .map((_, index) => {
        const player = players[index];
        if (!player) return { playerNumber: index + 1, isEmpty: true };

        // player.id を直接比較 (元の `+ 1` は不要と思われます)
        const rankIndex = rankedPlayers.findIndex((p) => p.id === player.id);

        return {
          playerNumber: index + 1,
          score: currentStage >= 3 ? player.score : undefined,
          rankImage:
            currentStage == 4 && rankIndex !== -1
              ? playerRankings[rankIndex]
              : null,
          reaction: playerReactions[player.id],
          isEmpty: false,
        };
      });

    return cardData.map((data, i) => (
      <PlayerCard
        key={i}
        playerNumber={data.playerNumber}
        score={data.score} // cardDataからscoreを渡す
        rankImage={data.rankImage}
        reaction={data.reaction}
        isEmpty={data.isEmpty}
        className={`player-${i + 1}`}
      />
    ));
  };

  // 各ステージのコンテンツをレンダリングする関数
  const renderCurrentStageContent = () => {
    if (isLoading) {
      return <p className="message-text">サーバーに接続中...</p>;
    }

    switch (currentStage) {
      case 1: // QRコードとプレイヤー募集
        return (
          <div className="stage-content stage-1">
            <p className="message-text">
              キャッチボール相手を探しています...({players.length}/4)
            </p>
            <img
              src={QR_CODE_IMAGE_PATH}
              alt="参加用QRコード"
              className="qr-code"
            />
            <button
              onClick={handleStartGame}
              className="next-button"
              disabled={players.length < 1}
            >
              この人数で開始
            </button>
          </div>
        );
      case 2: // Play Ball!ボタン
        return (
          <div className="stage-content stage-2">
            <button onClick={handlePlayBall} className="play-ball-button">
              <img
                src={GAME_START_IMAGE_PATH}
                alt="Play Ball!"
                className="play-ball-image"
              />
            </button>
          </div>
        );
      case 3: // ゲームプレイ中
        const minutes = String(Math.floor(timer / 60)).padStart(2, "0");
        const seconds = String(timer % 60).padStart(2, "0");
        return (
          <div className="stage-content stage-3">
            <p className="question-text">
              {nowQuestion || "質問を待っています..."}
            </p>
            <div className="bottom-right-container">
              <div className="timer-container">
                <div className="round-display">
                  <div>Round</div>
                  <div>{String(currentRound).padStart(2, "0")}</div>
                </div>
                <span className="timer-display">
                  {minutes}:{seconds}
                </span>
              </div>
            </div>
          </div>
        );
      case 4: // 結果表示
        return (
          <div className="stage-content stage-4">
            <div className="best-question-container">
              <img
                src={BEST_QUESTION_IMAGE_PATH}
                alt="ベストクエスチョン"
                className="best-question-image"
              />
              <p className="best-question-text">
                {nowQuestion || "お疲れ様でした！"}
              </p>
            </div>
            <button onClick={handlePlayAgain} className="restart-button">
              <img
                src={REPLAY_IMAGE_PATH}
                alt="もう一度遊ぶ"
                className="restart-image"
              />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`app-container stage-is-${currentStage}`}
      style={{ backgroundImage: `url(${BACKGROUND_IMAGE_PATH})` }}
    >
      <button
        style={{ display: "flex" }}
        onClick={() => {
          socket.emit("reset game");
          window.location.reload();
        }}
      >
        Players Reset
      </button>
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
      <div className="player-card-layout">{renderPlayerCards()}</div>
      <div className="main-content">{renderCurrentStageContent()}</div>
    </div>
  );
}

export default App;
