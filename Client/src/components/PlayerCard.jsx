import React from 'react';
import './PlayerCard.css'; // 必要に応じてCSSをインポート

const PlayerCard = ({ playerNumber, score, rankImage }) => {
  const playerImage = `/Player${playerNumber}.svg`; // publicフォルダからの相対パス

  return (
    <div className="player-card">
      <img src={playerImage} alt={`Player ${playerNumber}`} className="player-image" />
      {/* スコア表示 (Case 3とCase 4で表示) */}
      {(score !== undefined) && (
        <p className="player-score">{score}点</p>
      )}
      {/* ランキング表示 (Case 4のみ表示) */}
      {rankImage && (
        <img src={rankImage} alt={`${playerNumber}位`} className="player-rank-image" />
      )}
    </div>
  );
};

export default PlayerCard;