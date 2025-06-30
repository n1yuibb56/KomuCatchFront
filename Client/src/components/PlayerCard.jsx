// Client/src/components/PlayerCard.jsx
import React from 'react';

// PlayerCardコンポーネントは、playerNameとscoreの代わりにplayerNumberを受け取り、
// 対応するSVG画像を表示します。
// isQuestionerフラグはそのまま維持し、出題者の場合は枠の色を変更します。
function PlayerCard({ playerNumber, score, isQuestioner }) {
  // playerNumberが1から4であることを想定し、画像パスを生成
  const imagePath = `/Player${playerNumber}.svg`; 

  return (
    <div style={{
      border: isQuestioner ? '3px solid #FFD700' : '2px solid #666', // 出題者ならゴールドの枠
      borderRadius: '8px',
      padding: '10px',
      margin: '5px',
      width: '120px', // カードの幅
      height: '100px', // カードの高さ
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isQuestioner ? '#FFFACD' : '#f0f0f0', // 出題者なら薄い黄色
      color: '#333',
      boxShadow: isQuestioner ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
      flexShrink: 0 // カードが縮まないようにする
    }}>
      {/* プレイヤー画像を表示 */}
      <img 
        src={imagePath} 
        alt={`Player ${playerNumber}`} 
        style={{ width: '80px', height: 'auto', marginBottom: '5px' }} // 画像のサイズ調整
      />
      {/* 点数表示は残す */}
      <p style={{ fontSize: '0.9em', margin: '0' }}>点数: {score}</p>
      {/* 出題者表示も残す */}
      {isQuestioner && <span style={{ fontSize: '0.8em', fontWeight: 'bold', color: '#B8860B', marginTop: '5px' }}>出題者</span>}
    </div>
  );
}

export default PlayerCard;