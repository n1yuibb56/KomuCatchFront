import React, { useState, useEffect } from "react";
import { useDeviceMotion } from "../../hooks/useDeviceMotion";
import "./CatchPopup.css"; // スタイリング用のCSSをインポート

const CatchPopupComponent = ({ handleSend }) => {
  // カスタムフックから必要な値と関数を取得
  const {
    status,
    motionStatus,
    motionType,
    isDetecting,
    requestPermissionAndStart,
    stopMotionDetection,
  } = useDeviceMotion();

  // ポップアップの表示/非表示を管理する状態
  const [showPopup, setShowPopup] = useState(false);

  // motionType の変化を監視し、'catch' の場合にポップアップを表示する
  useEffect(() => {
    if (motionType === "catch") {
      handleSend("ask_question");

      // コンポーネントが再レンダリングされる前、またはアンマウントされる前にタイマーをクリア
    }
  }, [motionType]); // motionType が変更された時だけこのeffectを実行

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h1>キャッチ！モーション検出</h1>
        <p>スマートフォンを投げてキャッチする動きを試してください。</p>

        <div className="status-display">
          <p>
            <strong>システムの状態:</strong> {status}
          </p>
          <p>
            <strong>モーションの状態:</strong> {motionStatus}
          </p>
        </div>

        <div className="controls">
          {/* isDetecting の状態に応じてボタンの表示を切り替え */}
          {!isDetecting ? (
            <button onClick={requestPermissionAndStart}>検出開始</button>
          ) : (
            <button onClick={stopMotionDetection} className="stop-button">
              検出停止
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatchPopupComponent;
