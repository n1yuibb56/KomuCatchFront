import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useDeviceMotion } from '../../hooks/useDeviceMotion';
import './VoiceMotionPopup.css';

const VoiceMotionPopup = ({ handleClose }) => {
 // 'idle': 待機中, 'recording': 録音中, 'recognized': 認識完了, 'motion_detecting': モーション検出中
  const [mode, setMode] = useState('idle');
  const [recognizedText, setRecognizedText] = useState('');

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const {
    motionType,
    requestPermissionAndStart,
    status: motionHookStatus,
    motionStatus,
    stopMotionDetection
  } = useDeviceMotion();

  // 'throw' モーションを検出したらコンソールに出力
  useEffect(() => {
    if (motionType === 'throw') {
      stopMotionDetection();
      setMode('end');
    }
  }, [motionType]);

  // listeningフラグ(録音状態)を監視し、録音が終了したら自動でモードを切り替える
  useEffect(() => {
    if (mode === 'recording' && !listening && transcript) {
      setRecognizedText(transcript);
      setMode('recognized');
    }
  }, [listening, transcript, mode]);


  // 各ボタンのクリックイベントハンドラ
  const handleStartRecording = () => {
    setRecognizedText('');
    resetTranscript();
    SpeechRecognition.startListening({ continuous: false });
    setMode('recording');
  };

  const handleStopRecording = () => {
    SpeechRecognition.stopListening();
    // listeningフラグの変更はuseEffectで検知され、モードが切り替わります
  };

  const handleStartMotionDetection = () => {
    requestPermissionAndStart();
    setMode('motion_detecting');
  };

  const resetAll = () => {
    resetTranscript();
    setRecognizedText('');
    setMode('idle');
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="popup-box">
        <div className="box">
          <span className="close-icon" onClick={handleClose}>x</span>
          <p>お使いのブラウザは音声認識をサポートしていません。</p>
        </div>
      </div>
    );
  }

  // 現在のステータスを表示するテキスト
  const getStatusText = () => {
    switch (mode) {
      case 'recording':
        return `認識中: ${transcript}`;
      case 'recognized':
        return `質問内容: ${recognizedText || '（何も聞き取れませんでした）'}`;
      case 'motion_detecting':
        return `センサー: ${motionHookStatus} | モーション: ${motionStatus}`;
      case 'end':
        return `質問が投げられました！`
      case 'idle':
      default:
        return '録音開始ボタンを押してください';
    }
  };

  return (
    <div className="popup-box">
      <div className="box">
        <span className="close-icon" onClick={handleClose}>x</span>
        <h2>音声・モーション入力</h2>
        
        <div className="status-display">
          <p>{getStatusText()}</p>
        </div>

        <div className="button-container">
          {mode === 'idle' && (
            <button onClick={handleStartRecording} className="main-button">
              録音開始
            </button>
          )}
          {mode === 'recording' && (
            <button onClick={handleStopRecording} className="main-button stop-button">
              録音停止
            </button>
          )}
          {mode === 'recognized' && (
            <button onClick={handleStartMotionDetection} className="main-button motion-button">
              モーション検出開始
            </button>
          )}
          {mode === 'motion_detecting' && (
             <p>デバイスを動かしてください...</p>
          )}
        </div>

        <button onClick={resetAll} className="reset-button">
          リセット
        </button>
      </div>
    </div>
  );
};

export default VoiceMotionPopup;