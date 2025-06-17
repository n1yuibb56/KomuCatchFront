import React from 'react';

const reactionEmojis = {
  'reaction_smile': '😊',
  'reaction_laugh': '😂',
  'reaction_surprise': '😮',
  'reaction_angry': '😡',
};

// isGameOver と onPlayAgain プロパティを追加
function GamePlaying({ timer, currentRound, players, playerReactions, onPlayBall, isGameOver, onPlayAgain }) {
  return (
    <div className="game-playing">
      {isGameOver ? ( // ★isGameOverがtrueならゲーム終了表示
        <div className="game-finished-screen">
          <h2>ゲーム終了！</h2>
          <p>ゲームが終了しました。</p>
          {/* ランキング表示のコードはここでは書かない（ご要望通り） */}
          {/* 必要であれば、ここに簡単な「最終結果」などのテキストや、
              プレイヤーの最終スコアの概要を表示することも可能 */}

          <button onClick={onPlayAgain} className="play-again-button">
            もう一度プレイする
          </button>
        </div>
      ) : ( // ★isGameOverがfalseなら通常のゲームプレイ中表示
        <>
          <h2>ラウンド {currentRound} / 3</h2>
          <p>残り時間: {timer}秒</p>

          <button onClick={onPlayBall} className="play-ball-button">
            Play Ball!
          </button>

          <h3>現在のプレイヤー状況:</h3>
          <div className="player-grid">
            {players
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((player, index) => (
                <div key={player.id} className="player-card">
                  <p className="player-name">{player.name || `プレイヤー${player.id}`}</p>
                  <p className="player-score">点数: {player.score || 0}点</p>
                  <p className="player-rank">順位: {player.rank || 0}位</p>
                  <div className="player-reaction">
                    {playerReactions[player.id] && (
                      <span style={{ fontSize: '2em' }}>
                        {reactionEmojis[playerReactions[player.id]]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default GamePlaying;