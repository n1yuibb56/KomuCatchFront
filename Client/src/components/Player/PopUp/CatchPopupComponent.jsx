import React, { useState, useEffect } from "react";
import { useDeviceMotion } from "../../hooks/useDeviceMotion";
import "./CatchPopup.css"; // スタイリング用のCSSをインポート
import ans_popupBG from "../../../assets/PopUp/ans_popup.svg";

const CatchPopupComponent = ({ handleSend }) => {
  // カスタムフックから必要な値と関数を取得
  const useThrow = false;
  const {
    status,
    motionStatus,
    motionType,
    isDetecting,
    requestPermissionAndStart,
    stopMotionDetection,
  } = useDeviceMotion(useThrow);

  // ポップアップの表示/非表示を管理する状態
  const [showPopup, setShowPopup] = useState(false);

  const [debugHunllerFlg,setDebugHunllerFlg] = useState(false);

  // motionType の変化を監視し、'catch' の場合にポップアップを表示する
  useEffect(() => {
    if (motionType === "catch") {
      handleSend("ans");
      // コンポーネントが再レンダリングされる前、またはアンマウントされる前にタイマーをクリア
    }

    if(debugHunllerFlg){
      handleSend("ans");
      setDebugHunllerFlg(false);
    }
  }, [motionType,debugHunllerFlg,handleSend]); // motionType が変更された時だけこのeffectを実行

  return (
    <div className="popup-overlay">
      <div className="popup-img">
        <div className="popup-content">
          <div className="question">
            <p>好きな犬種は何ですか？</p>
          </div>
          <div className="controls">
            <button
              className="mothin_start"
              onClick={requestPermissionAndStart}
            ></button>
            <button onClick={()=>{setDebugHunllerFlg(true);}}>Debug : OnNext Button</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatchPopupComponent;
