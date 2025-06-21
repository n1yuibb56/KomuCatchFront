import React from "react";

function HostPage() {
  return (
    <div  className="app-container">
      <h1>キャッチボールアプリ</h1>
      {isLoading ? (
        <div className="loading-spinner">
          <p>
            ホストセッション準備中...
            <br />
            （QRコード画像を読み込み中）
          </p>
        </div>
      ) : (
        <>
          {/* 1枚目の画面: ホスト待機・プレイヤー募集 */}
          {gameState === "waiting" && (
            <>
              {/* ホストIDの存在はバックエンド通信のためにチェックするが、QRコード表示は画像に置き換え */}
              {hostId ? (
                <>
                  <p>
                    プレイヤーは以下のQRコードをスキャンして参加してください。
                  </p>
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
      )}
    </div>
  );
}

export default HostPage;
