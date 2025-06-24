import React from 'react';

function PlayerControls({ onAction }) {
  return (
    <div className="player-controls">
      {/* 画面遷移図上部の「質問を投げる」ボタン */}
      <button onClick={() => onAction('ans_question')} className="action-button question-button">
        質問に答える
      </button>

      {/* 画面遷移図中央の「気になるボタン」に対応するスペース（または別の機能） */}
      {/* <button onClick={() => onAction('curious_button')} className="action-button curious-button">
        気になるボタン
      </button> */}

      {/* 既存のリアクションボタン */}
      <div className="reaction-buttons">
        <button onClick={() => onAction('reaction_smile')} className="reaction-button">😊 笑顔</button>
        <button onClick={() => onAction('reaction_laugh')} className="reaction-button">😂 爆笑</button>
        <button onClick={() => onAction('reaction_surprise')} className="reaction-button">😮 驚き</button>
        <button onClick={() => onAction('reaction_angry')} className="reaction-button">😡 怒り</button>
      </div>

      {/* 画面右下の延長ボタンはPlayerPage.jsxに直接配置 */}
    </div>
  );
}

export default PlayerControls;