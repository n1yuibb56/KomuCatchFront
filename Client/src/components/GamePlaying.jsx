// src/pages/PlayerPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // URLパラメータ取得用
import { Html5QrcodeScanner } from 'html5-qrcode'; // QRコードスキャナー
import io from 'socket.io-client'; // Socket.IOクライアント
import PlayerControls from '../components/PlayerControls'; // リアクションボタン用

// バックエンドのURL (App.jsxのSOCKET_SERVER_URLと同じであるべき)
const SOCKET_SERVER_URL = 'http://192.168.1.114:3001'; 

function PlayerPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialHostId = queryParams.get('hostId'); // このバックエンドでは使わないが、URLから来たら利用

  // hostIdの概念はこのバックエンドでは使わないが、URLからのアクセス判断のために残す
  const [hostId, setHostId] = useState(initialHostId); 
  const [myUserNumber, setMyUserNumber] = useState(null); // サーバーから割り当てられるユーザー番号
  const [isConnected, setIsConnected] = useState(false); // Socket.IO接続状態
  const [isQuestioner, setIsQuestioner] = useState(false); // 出題者かどうかのフラグ
  const [usermodes, setUsermodes] = useState([0,0,0,0]); // 各ユーザーのモード
  const [gameStarted, setGameStarted] = useState(false); // ゲーム開始状態
  
  // サーバーからのリアルタイム情報
  const [myScore, setMyScore] = useState(0); 
  const [myRank, setMyRank] = useState(0); 
  const [currentTimer, setCurrentTimer] = useState(0); 
  const [backendMessage, setBackendMessage] = useState(""); // バックエンドからのテキストメッセージ
  const [currentQuestionText, setCurrentQuestionText] = useState(""); // 現在の質問内容

  let qrCodeScanner = null; // QRコードスキャナーインスタンス
  let socketInstance = null; // Socket.IOインスタンス

  // プレイヤーの状態を初期値にリセットするヘルパー関数
  const resetPlayerState = () => {
      setHostId(null); // QRスキャン画面に戻る
      setMyUserNumber(null);
      setIsConnected(false);
      setIsQuestioner(false);
      setUsermodes([0,0,0,0]);
      setGameStarted(false);
      setMyScore(0);
      setMyRank(0);
      setCurrentTimer(0);
      setBackendMessage("");
      setCurrentQuestionText("");
      // QRコードスキャナーが起動していたらクリア
      if (qrCodeScanner && qrCodeScanner.getState() === 2) {
          qrCodeScanner.clear();
      }
  };

  useEffect(() => {
    const cleanup = () => {
        if (qrCodeScanner && qrCodeScanner.getState() === 2) { // SCANNING状態であればクリア
            qrCodeScanner.clear();
        }
        if (socketInstance) { // 接続があれば切断
            socketInstance.off('connect');
            socketInstance.off('login rejected'); // ログイン拒否
            socketInstance.off('user number'); // 自分のユーザー番号
            socketInstance.off('questioner decided'); // 出題者決定
            socketInstance.off('usermodes'); // ユーザーモード
            socketInstance.off('new question'); // 新しい質問
            socketInstance.off('answer_time_up'); // 回答時間終了
            socketInstance.off('game finished'); // ゲーム終了
            socketInstance.off('timer_update'); // タイマー更新
            socketInstance.off('question rejected'); // 質問拒否
            socketInstance.off('answer locked'); // 回答ロック
            socketInstance.off('answer received'); // 回答受信
            socketInstance.off('connect_error');
            socketInstance.off('disconnect');
            socketInstance.off('user left'); // ユーザー離脱
            socketInstance.disconnect();
        }
    };

    // ホストIDがURLから提供されていない場合のみQRコードスキャナーを起動
    if (!hostId) {
      qrCodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      qrCodeScanner.render(onScanSuccess, onScanError);
    }

    // hostId (URLからのアクセス確認) が存在し、まだ接続されていない場合のみSocket.IOに接続を試みる
    // hostIdはここでは単なるフラグとして利用
    if (hostId && !isConnected) { 
      socketInstance = io(SOCKET_SERVER_URL); // Socket.IO接続を確立

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Player: Connected to Socket.IO server.');
        // サーバーにログイン（接続）を通知
        // このバックエンドでは 'login' イベントでackを期待
        socketInstance.emit('login', (response) => { // ackコールバックを渡す
            if (response && response.number !== undefined) {
                setMyUserNumber(response.number);
                console.log('Player: Registered as User Number:', response.number);
                // QRコードスキャナーが起動していたら停止する
                if (qrCodeScanner && qrCodeScanner.getState() === 2) {
                    qrCodeScanner.clear();
                }
                setGameStarted(true); // 接続できたらゲーム開始状態に（ゲームはサーバーが開始）
            } else if (response && response.message) {
                console.error('Player: Login rejected:', response.message);
                alert('ログイン失敗: ' + response.message);
                resetPlayerState(); // 失敗したらリセット
            }
        });
      });
      
      // ログイン拒否 ('login rejected' イベントを受信)
      socketInstance.on('login rejected', (message) => {
          console.error('Player: Login rejected by server:', message);
          alert('参加できませんでした: ' + message);
          resetPlayerState(); // 拒否されたらリセット
      });

      // 出題者が決定された時 ('questioner decided' イベントを受信)
      socketInstance.on('questioner decided', (qNumber) => {
          console.log('Player: Questioner decided:', qNumber);
          if (myUserNumber !== null && qNumber === myUserNumber) {
              setIsQuestioner(true); // 自分が出題者
              console.log('Player: You are the questioner!');
          } else {
              setIsQuestioner(false);
          }
          setUsermodes(prevModes => {
              const newModes = [0,0,0,0];
              newModes[qNumber] = 1; // 出題者のモードを1に設定
              return newModes;
          });
      });

      // ユーザーモードが更新された時 ('usermodes' イベントを受信)
      socketInstance.on('usermodes', (modesArray) => {
          console.log('Player: Usermodes updated:', modesArray);
          setUsermodes(modesArray);
      });

      // 新しい質問が来た時 ('new question' イベントを受信)
      socketInstance.on('new question', (qData) => {
          console.log('Player: New question:', qData.text);
          setCurrentQuestionText(qData.text); // 質問内容を更新
      });

      // 回答時間が終了した時 ('answer_time_up' イベントを受信)
      socketInstance.on('answer_time_up', () => {
          console.log('Player: Answer time up!');
          // UIを更新
      });

      // ゲームが終了した時 ('game finished' イベントを受信)
      socketInstance.on('game finished', (data) => {
          console.log('Player: Game Finished!', data);
          alert('ゲーム終了！あなたの最終スコアは ' + (data.scores[myUserNumber] || 0) + '点でした。');
          resetPlayerState(); // ゲーム終了時に状態をリセット
      });

      // タイマーが更新された時 ('timer_update' イベントを受信)
      socketInstance.on('timer_update', (data) => {
          setCurrentTimer(data.timeLeft);
          if (myUserNumber !== null && data.score) { // スコアが送信される場合
              setMyScore(data.score[myUserNumber] || 0); // 自分のスコアを更新
              // ランクはサーバーから送られてこないので、UIには表示できない
              // setMyRank(data.rank); 
          }
      });

      // 質問がサーバーに拒否された時 ('question rejected' イベントを受信)
      socketInstance.on('question rejected', (message) => {
          console.error('Player: Question rejected:', message);
          alert('質問を送信できませんでした: ' + message);
      });

      // 回答がロックされた時 ('answer locked' イベントを受信)
      socketInstance.on('answer locked', (data) => {
          console.log('Player: Answer locked by user:', data.user);
          setBackendMessage(`ユーザー${data.user}が回答しました！`);
      });

      // 回答が受信された時 ('answer received' イベントを受信)
      socketInstance.on('answer received', (data) => {
          console.log('Player: Answer received:', data.user, data.text);
          // if (data.user !== myUserNumber) { // 自分以外の回答なら表示
          //     setBackendMessage(`ユーザー${data.user}の回答: ${data.text}`);
          // }
      });

      // ユーザーがサーバーから切断された時
      socketInstance.on('disconnect', () => {
          console.log('Player: Disconnected from server.');
          alert('サーバーから切断されました。もう一度QRコードをスキャンしてください。');
          resetPlayerState(); // 切断時も状態をリセット
      });
      
      // ユーザーがゲームを離脱した時 ('user left' イベントを受信)
      socketInstance.on('user left', (userNumber) => {
          console.log(`Player: User ${userNumber} left.`);
          // 必要であればUIに反映
      });
    }

    return cleanup; // useEffectのクリーンアップ関数を返す
  }, [hostId, isConnected]); // hostIdとisConnectedが変更された時に再実行

  const onScanSuccess = (decodedText, decodedResult) => {
    if (decodedText) {
      console.log(`Player: QR Code scanned: ${decodedText}`);
      try {
        const url = new URL(decodedText);
        // このバックエンドではhostIdパラメータを使わないが、アクセス先のURLとして利用
        const scannedPath = url.pathname; 
        if (scannedPath === '/player') { // /playerパスであればOK
            setHostId("SCANNED_OK"); // ダミーのhostIdを設定して接続をトリガー
        } else {
          console.error("Scanned QR code is not for player page.");
          alert("無効なQRコードです。");
        }
      } catch (e) {
        console.error("Player: Failed to parse QR code as URL:", e);
        alert("無効なQRコード形式です。");
      }
    }
  };

  const onScanError = (errorMessage) => {
    // console.warn(`Player: QR Code Scan Error: ${errorMessage}`);
  };

  // プレイヤーのアクションをサーバーに送信する
  const handlePlayerAction = (actionType, payload = null) => {
    if (isConnected && myUserNumber !== null && gameStarted && socketInstance) { 
      console.log(`Player ${myUserNumber} sending action: ${actionType}`);
      if (actionType === 'ask_question') {
        // 'send question' イベントには質問テキストを渡す
        // バックエンドの仕様に合わせて、質問テキストをどこから取得するか決める
        // ここではダミーの質問テキストを送信
        const qText = "今日の天気は？"; // 例: 質問テキスト
        socketInstance.emit('send question', qText);
      } else if (actionType === 'send_answer') {
        // 'send answer' イベントには回答テキストを渡す
        const aText = prompt("あなたの回答を入力してください:"); // 例: 回答入力プロンプト
        if (aText) {
            socketInstance.emit('send answer', aText);
        }
      } else if (actionType === 'clicked') { // 'clicked' イベント
          socketInstance.emit('clicked');
      } else if (actionType.startsWith('reaction_')) {
          // リアクションボタンの場合は、`clicked` イベントとして送信
          // バックエンドが `clicked` イベントでリアクションの種類を区別しない場合、
          // リアクションごとに別のイベント名をサーバーに定義する必要がある
          socketInstance.emit('clicked'); // 仮にclickedとして送信
          console.log(`Player ${myUserNumber} sent reaction: ${actionType}`);
      }
    } else {
        console.error("Player: Not connected or game not started for action:", actionType);
    }
  };

  // 延長ボタンのクリックハンドラ
  const handleExtendGame = () => {
      if (isConnected && myUserNumber !== null && gameStarted && socketInstance) {
          console.log(`Player ${myUserNumber} requesting extension!`);
          // このバックエンドには'extendGameTime'イベントがないため、`clicked`イベントを使う
          socketInstance.emit('clicked'); // 仮にclickedとして送信
          setBackendMessage("時間を延長しました (+1秒)！"); // フロントエンドでメッセージ表示
      }
  };


  return (
    <div className="player-page">
      <h1>プレイヤー画面</h1>
      {!hostId ? ( // URLにhostIdがない（またはリセットされた）場合にQRスキャナーを表示
        <div>
          <p>ホストのQRコードをスキャンして参加してください。</p>
          <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: 'auto' }}></div>
        </div>
      ) : (
        <>
          <p>接続ステータス: {isConnected ? '接続中' : '切断'}</p>
          {myUserNumber !== null ? (
            <div>
              <p>あなたのユーザー番号: {myUserNumber}</p>
              <p>あなたは {isQuestioner ? '出題者' : '回答者'} です。</p> {/* 出題者表示 */}
              
              {gameStarted ? ( // ゲームが開始されたらコンテンツを表示
                <>
                  <p>現在の点数: {myScore}</p>
                  {/* <p>現在の順位: {myRank}位</p> // サーバーが順位を送らないため非表示 */}
                  <p>残り時間: {currentTimer}秒</p> 
                  <p>現在の質問: {currentQuestionText || "まだ質問がありません"}</p>
                  
                  {/* PlayerControlsに質問送信と回答送信を追加 */}
                  <PlayerControls onAction={handlePlayerAction} />

                  <div className="backend-message-box">
                      {backendMessage && <p>{backendMessage}</p>}
                      {!backendMessage && <p>ここにメッセージが表示されます</p>}
                  </div>
                  <button onClick={handleExtendGame} className="extend-button">
                    延長 (+1秒)
                  </button>
                  
                  {/* 回答者のみ回答ボタン */}
                  {!isQuestioner && (
                      <button onClick={() => handlePlayerAction('send_answer')} className="action-button" style={{ marginTop: '20px', backgroundColor: '#3498db', color: 'white' }}>
                          回答する
                      </button>
                  )}
                </>
              ) : (
                <p>ゲーム開始を待っています...</p> // サーバーからゲーム開始イベントが来るまで待機
              )}
            </div>
          ) : (
            <p>サーバーに接続中...</p>
          )}
        </>
      )}
    </div>
  );
}

export default PlayerPage;