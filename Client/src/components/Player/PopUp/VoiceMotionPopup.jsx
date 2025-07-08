import React, { useState, useEffect } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useDeviceMotion } from "../../hooks/useDeviceMotion";
import "./VoiceMotionPopup.css";

const VoiceMotionPopup = ({ handleSend }) => {
  const [mode, setMode] = useState("idle");
  const [recognizedText, setRecognizedText] = useState("");
  const [debugHunllerFlg, setDebugHunllerFlg] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const useThrow = true;

  const {
    motionType,
    requestPermissionAndStart,
    status: motionHookStatus,
    motionStatus,
    stopMotionDetection,
  } = useDeviceMotion(useThrow);

  useEffect(() => {
    if (motionType === "throw") {
      stopMotionDetection();
      setMode("end");
    }
    if (debugHunllerFlg) {
      setDebugHunllerFlg(false);
      stopMotionDetection();
      setMode("end");
    }
  }, [motionType, debugHunllerFlg]);

  useEffect(() => {
    if (mode === "recording" && !listening && transcript) {
      setRecognizedText(transcript);
      setMode("recognized");
    }
  }, [listening, transcript, mode]);

  useEffect(() => {
    // modeが 'end' で、かつ送信するテキストが存在する場合に実行
    if (mode === "end" && recognizedText) {
      handleSend("ask_question", recognizedText);
    }
  }, [mode, recognizedText, handleSend]);


  const handleStartRecording = () => {
    setRecognizedText("");
    resetTranscript();
    SpeechRecognition.startListening({ continuous: false });
    setMode("recording");
  };

  const handleStopRecording = () => {
    SpeechRecognition.stopListening();
  };

  const handleStartMotionDetection = () => {
    requestPermissionAndStart();
    setMode("motion_detecting");
  };

  const resetAll = () => {
    resetTranscript();
    setRecognizedText("");
    setMode("idle");
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="popup-box">
        <div className="box">
          <p>お使いのブラウザは音声認識をサポートしていません。</p>
        </div>
      </div>
    );
  }

  const getStatusText = () => {
    switch (mode) {
      case "recording":
        return `認識中: ${transcript}`;
      case "recognized":
        return `質問内容: ${recognizedText || "（何も聞き取れませんでした）"}`;
      case "motion_detecting":
        return `センサー: ${motionHookStatus} | モーション: ${motionStatus}`;
      case "end":
        return `質問が投げられました！`;
      case "idle":
      default:
        return "録音開始ボタンを押してください";
    }
  };

  return (
    <div className="popup-box">
      <div className="box-img">
        <div className="content">
          <div className="status-display">
            <p>{getStatusText()}</p>
          </div>

          <div className="button-container">
            {mode === "idle" && (
              <button
                onClick={handleStartRecording}
                className="main-button"
              ></button>
            )}
            {mode === "recording" && (
              <button
                onClick={handleStopRecording}
                className="main-button stop-button"
              ></button>
            )}
            {mode === "recognized" && (
              <button
                onClick={handleStartMotionDetection}
                className="main-button motion-button"
              ></button>
            )}
            {mode === "motion_detecting" && (
              <>
                <p>デバイスを動かしてください...</p>
                <button
                  onClick={() => {
                    setDebugHunllerFlg(true);
                  }}
                >
                  Debug : OnNext Button
                </button>
              </>
            )}
          </div>

          <button onClick={resetAll} className="reset-button"></button>
        </div>
      </div>
    </div>
  );
};

export default VoiceMotionPopup;