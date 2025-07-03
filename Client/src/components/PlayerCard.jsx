// src/components/PlayerCard.jsx

import React from 'react';
import './PlayerCard.css'; 

// classNameを受け取って一番外側のdivに適用する
function PlayerCard({ playerNumber, score, rankImage, className }) {
  const playerImage = `/Player${playerNumber}.svg`; 

  return (
    <div className={`player-card ${className || ''}`}>
      <img 
        src={playerImage} 
        alt={`Player ${playerNumber}`} 
        className="player-image"
      />
      {/* scoreがundefinedでない場合に表示 */}
      {score !== undefined && (
        <p className="player-score">{score}点</p>
      )}
      {/* rankImageが存在する場合に表示 */}
      {rankImage && (
        <img src={rankImage} alt="rank" className="player-rank-image" />
      )}
    </div>
  );
}

export default PlayerCard;