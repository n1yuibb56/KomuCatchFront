import { useEffect, useRef, useState, useCallback } from "react"; // useCallback をインポート
import soundThrow from "../../assets/shake.wav";
import soundCatch from "../../assets/catch.mp3";

const MOTION_COOLDOWN_TIME = 2000;
const THROW_ACC_THRESHOLD_HIGH = 5000;
const THROW_ROT_THRESHOLD_LOW = 20;
const CATCH_ACC_THRESHOLD_LOW = 1500;
const CATCH_ROT_THRESHOLD_HIGH = 1000;
const HISTORY_LENGTH = 5;

export const useDeviceMotion = () => {
  const [status, setStatus] = useState("待機中...");
  const [motionStatus, setMotionStatus] = useState("モーション検出待ち...");
  const [motionType, setMotionType] = useState(""); // 'catch' | 'throw' | ''
  const [isDetecting, setIsDetecting] = useState(false); // ★追加: 検出中かどうかの状態

  const catchSoundRef = useRef(new Audio(soundCatch));
  const throwSoundRef = useRef(new Audio(soundThrow));

  const lastMotionTimeRef = useRef(0);
  const lastAccTimeRef = useRef(0);
  const lastXYZRef = useRef({ x: null, y: null, z: null });

  const accHistoryRef = useRef([]);
  const rotHistoryRef = useRef([]);

  const smooth = (history, current, keys) => {
    history.push(current);
    if (history.length > HISTORY_LENGTH) history.shift();

    const avg = {};
    keys.forEach(k => {
      avg[k] = history.reduce((sum, item) => sum + item[k], 0) / history.length;
    });
    return avg;
  };

  const playSound = (audio) => {
    audio.currentTime = 0;
    audio.play().catch(e => console.warn("再生エラー:", e));
  };

  // ★変更: handleMotion を useCallback でメモ化
  const handleMotion = useCallback((event) => {
    const now = Date.now();
    if (now - lastMotionTimeRef.current < MOTION_COOLDOWN_TIME) return;

    const rawAcc = event.accelerationIncludingGravity || {};
    const rawRot = event.rotationRate || {};

    const acc = smooth(accHistoryRef.current, rawAcc, ["x", "y", "z"]);
    const rot = smooth(rotHistoryRef.current, rawRot, ["alpha", "beta", "gamma"]);

    let speed = 0;
    if (lastXYZRef.current.x !== null) {
      const dt = now - lastAccTimeRef.current;
      if (dt > 100) {
        const dx = acc.x - lastXYZRef.current.x;
        const dy = acc.y - lastXYZRef.current.y;
        const dz = acc.z - lastXYZRef.current.z;
        speed = (Math.sqrt(dx * dx + dy * dy + dz * dz) / dt) * 10000;

        lastXYZRef.current = { ...acc };
        lastAccTimeRef.current = now;
      }
    } else {
      lastXYZRef.current = { ...acc };
      lastAccTimeRef.current = now;
    }

    const rotMagnitude = Math.sqrt(rot.alpha ** 2 + rot.beta ** 2 + rot.gamma ** 2);

    const isThrow = speed > THROW_ACC_THRESHOLD_HIGH && rotMagnitude > THROW_ROT_THRESHOLD_LOW;
    const isCatch = speed > CATCH_ACC_THRESHOLD_LOW && rotMagnitude > CATCH_ROT_THRESHOLD_HIGH;

    if (isThrow) {
      lastMotionTimeRef.current = now;
      setMotionStatus("投げる！");
      setMotionType("throw");
      playSound(throwSoundRef.current);
    } else if (isCatch) {
      lastMotionTimeRef.current = now;
      setMotionStatus("キャッチ！");
      setMotionType("catch");
      playSound(catchSoundRef.current);
    } else {
      if (now - lastMotionTimeRef.current > MOTION_COOLDOWN_TIME) {
        setMotionStatus("待機中...");
        setMotionType("");
      }
    }

    if (speed !== 0) {
      console.log(`Acc: ${speed.toFixed(2)} | Rot: ${rotMagnitude.toFixed(2)}`);
    }
  }, []); // 依存配列は空（内部で利用するセッター関数やRefは含める必要なし）


  // ★追加: 検出を停止する関数
  const stopMotionDetection = () => {
    window.removeEventListener("devicemotion", handleMotion);
    setStatus("検出を停止しました");
    setMotionStatus("モーション検出待ち...");
    setMotionType("");
    setIsDetecting(false);
    // 履歴をリセット
    accHistoryRef.current = [];
    rotHistoryRef.current = [];
    lastXYZRef.current = { x: null, y: null, z: null };
  };

  const requestPermissionAndStart = () => {
    if (isDetecting) return; // すでに検出中の場合は何もしない

    const startListener = () => {
      window.addEventListener("devicemotion", handleMotion);
      setStatus("センサーを監視中です...");
      setIsDetecting(true);
    };

    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            startListener();
          } else {
            alert("センサー使用が拒否されました");
            setStatus("センサー使用不可");
          }
        })
        .catch((err) => {
          console.error(err);
          alert("センサー使用許可リクエストに失敗しました");
          setStatus("エラー発生");
        });
    } else {
      startListener();
    }
  };

  // コンポーネントがアンマウントされた時に必ずイベントリスナーを削除する
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [handleMotion]); // handleMotion が変わった時（初回マウント時のみ）に実行

  // ★変更: 戻り値に isDetecting と stopMotionDetection を追加
  return {
    status,
    motionStatus,
    motionType,
    isDetecting,
    requestPermissionAndStart,
    stopMotionDetection,
  };
};