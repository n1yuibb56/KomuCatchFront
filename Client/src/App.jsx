// src/App.jsx

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'; // ioをインポート
import PlayerCard from './components/PlayerCard'; // PlayerCardコンポーネントをインポート

// GamePlayingコンポーネントはApp.jsx内で直接コンテンツをレンダリングするため、インポート不要

import './App.css'; // スタイルシートの読み込み

const SOCKET_SERVER_URL = 'http://192.168.1.114:3001'; // ★修正: バックエンドのIPアドレスとポートを指定
const STATIC_QR_CODE_IMAGE_PATH = '/QR.png'; // ★修正: QRコード画像パス (publicフォルダ内)
const DUMMY_QUESTION_IMAGE_PATH = '/Best.svg'; // ★修正: 質問内容表示用画像パス

// socket変数をuseEffectの外で定義し、nullで初期化
// これにより、useEffect内外から同じインスタンスを参照できるようになる
let socket = null;

function App() {
  // hostIdの概念はこのバックエンドでは使わないが、Socket.IO接続のトリガーとして残す
  // hostIdがnull/trueでuseEffetctが再発火する仕組みを利用
  const [hostId, setHostId] = useState(null); 
  const [players, setPlayers] = useState([]); // 参加プレイヤーリスト
  const [playerReactions, setPlayerReactions] = useState({}); // プレイヤーのリアクション
  const [currentStage, setCurrentStage] = useState(1); // 1: QRコードと募集, 2: Play Ball!, 3: 質問画像
  
  // サーバーからの情報
  const [questionerNumber, setQuestionerNumber] = useState(null); // 現在の出題者のユーザー番号
  const [usermodes, setUsermodes] = useState([0, 0, 0, 0]); // 各ユーザーのモード (出題者/回答者)
  const [currentQuestionText, setCurrentQuestionText] = useState(""); // 現在の質問内容
  const [currentTimer, setCurrentTimer] = useState(0); // タイマー
  const [isGameOver, setIsGameOver] = useState(false); // ゲーム終了フラグ

  const [isLoading, setIsLoading] = useState(true); // アプリ起動時のローディング表示


  useEffect(() => {
    // Socket.IOインスタンスがまだ作成されていない場合のみ作成
    if (!socket) {
      socket = io(SOCKET_SERVER_URL);
      console.log("Socket.IO instance created.");
    }

    // アプリ起動時、または「もう一度プレイする」ボタンでホストの状態をリセットした後に発火
    if (isLoading) { // hostIdがnullでisLoadingがtrueの時にこのブロックに入る
        setIsLoading(true); 
        if (socket.connected) {
            socket.disconnect(); // 既存の接続を切断
            console.log("Socket disconnected for fresh App load/restart.");
        }
        socket.connect(); // 新しい接続を試みる
        console.log("Socket attempting to connect for App monitoring.");
        
        // サーバーが接続時に割り当てるユーザー番号を受け取る (App側もユーザーとして接続される)
        // App側はホストとしてUIを表示するので、このユーザー番号は直接UIには使わないが、
        // 接続が確立した証拠として認識し、ローディングを解除する
        socket.on('user number', (number) => {
            console.log('App received its own user number:', number);
            setHostId("CONNECTED_AS_HOST"); // ホストとして接続されたことを示すダミーID
            setIsLoading(false); // ローディング終了
            setCurrentStage(1); // 状態をステージ1（募集画面）にリセット
            setPlayers([]); // プレイヤーリストをリセット
            setPlayerReactions({});
            setQuestionerNumber(null);
            setUsermodes([0,0,0,0]);
            setCurrentQuestionText("");
            setCurrentTimer(0);
            setIsGameOver(false);
        });
    }

    // --- Socket.IO イベントリスナー ---
    // サーバーからのイベントを受信した際の処理を定義

    // プレイヤーが参加した時 ('user joined' イベントを受信)
    socket.on('user joined', (message) => { 
        console.log(`App: ${message}`);
        const newUserNumber = parseInt(message.match(/(\d+)さんが参加しました/)?.[1]);
        if (!isNaN(newUserNumber)) {
            setPlayers(prevPlayers => {
                // 重複参加を防ぎつつ、新しいプレイヤーを追加
                if (!prevPlayers.some(p => p.id === `player_${newUserNumber}`)) {
                    const newPlayer = {
                        id: `player_${newUserNumber}`,
                        name: `Player ${newUserNumber + 1}`,
                        score: 0,
                        lastReaction: null,
                        usernumber: newUserNumber // バックエンドのusernumberを保持
                    };
                    return [...prevPlayers, newPlayer];
                }
                return prevPlayers;
            });
            // 新しいプレイヤーのリアクションを初期化
            setPlayerReactions((prev) => ({ ...prev, [`player_${newUserNumber}`]: null }));
        }
    });
    
    // 出題者が決定された時 ('questioner decided' イベントを受信)
    socket.on('questioner decided', (qNumber) => {
        console.log('App: Questioner decided:', qNumber);
        setQuestionerNumber(qNumber);
        // 出題者が決まったらゲームが始まるのでステージ3に遷移
        setCurrentStage(3); // 質問画面へ
        setIsGameOver(false); // ゲーム開始時はゲームオーバーではない
        setCurrentQuestionText(""); // 質問テキストをクリア
    });
    
    // ユーザーモードが更新された時 ('usermodes' イベントを受信)
    socket.on('usermodes', (modesArray) => {
        console.log('App: Usermodes updated:', modesArray);
        setUsermodes(modesArray);
    });

    // タイマーが更新された時 ('timer_update' イベントを受信)
    socket.on('timer_update', (data) => {
        setCurrentTimer(data.timeLeft);
        // このバックエンドはtimer_updateで各プレイヤーのスコアも送ってきているので、playersを更新
        setPlayers(prevPlayers => prevPlayers.map(p => {
            // socket.data.usernumberはApp側では利用できないので、
            // playersリストのusernumberと一致するものを探してスコアを更新
            const playerIndex = p.usernumber; // サーバーのusernumber
            if (data.score && typeof data.score === 'object' && playerIndex !== undefined) {
                return { ...p, score: data.score[playerIndex] || p.score };
            }
            return p;
        }));
    });

    // 新しい質問が来た時 ('new question' イベントを受信)
    socket.on('new question', (qData) => {
        console.log('App: New question:', qData.text);
        setCurrentQuestionText(qData.text); // 質問内容を更新
        setCurrentStage(3); // 質問画面へ
    });

    // 回答時間が終了した時 ('answer_time_up' イベントを受信)
    socket.on('answer_time_up', () => {
        console.log('App: Answer time up!');
        // 必要であればUIを更新
    });

    // ゲームが終了した時 ('game finished' イベントを受信)
    socket.on('game finished', (data) => { // 注意: 'game finished' は 'gameFinished' とイベント名が違う
        console.log('App: Game Finished!', data);
        setIsGameOver(true); // ゲームオーバーフラグを立てる
        setCurrentStage(3); // ゲーム終了結果もステージ3で表示
        // App.jsxでは、ゲーム終了時にステージをリセットし、最初のQRコード画面に戻る
        setPlayers(prevPlayers => { // 最終スコアを更新
            return prevPlayers.map(p => {
                const playerIndex = p.usernumber;
                return { ...p, score: data.scores[playerIndex] || p.score };
            });
        });
    });

    // プレイヤーのリアクションが送信された時 (このバックエンドにはない。PlayerPage側で送信)
    // socket.on('playerReaction', ...)

    // ユーザーがサーバーから切断された時
    socket.on('disconnect', () => {
        console.log('App: Disconnected from server.');
        setHostId(null); // ホスト接続状態をリセット
        setIsLoading(true); // ローディング状態に戻し、再接続を試みる
        // clean up players, etc. is handled when hostSessionCreated is called on reconnect
    });

    // ホストが切断した時の通知 (このバックエンドにはない)
    // socket.on('hostDisconnected', ...)


    // --- クリーンアップ関数 ---
    return () => {
      socket.off('user number');
      socket.off('user joined');
      socket.off('questioner decided');
      socket.off('usermodes');
      socket.off('timer_update');
      socket.off('new question');
      socket.off('answer_time_up');
      socket.off('game finished');
      socket.off('disconnect');
      // socket.disconnect(); // アプリケーション全体がアンマウントされない限り、接続を維持
    };
  }, [isLoading, currentStage]); // isLoadingとcurrentStageが変更された時にこのuseEffectが再実行される


  // --- イベントハンドラ ---
  // UIからの操作に応じてSocket.IOイベントを送信する関数

  // 「この人数で開始」ボタンクリック (自動遷移のためUIからは削除)
  const handleStartGame = () => { 
    if (socket) {
      // このバックエンドでは、4人揃ったらゲーム開始イベントがサーバーから来るので、
      // App側からstartGameをemitする必要はない
      // もしこのボタンを強制開始ボタンとして残すなら、バックエンドにイベントを追加
      console.log("App: 'Start Game' button clicked. Awaiting server's game start.");
      // 実際には、サーバーが自動的にゲームを開始するのを待つ
      // このボタンはUIから削除されるので、ほぼ使わない
    } else { console.error("Socket is not initialized."); }
  };

  // 「Play Ball!」ボタンクリック (ステージ2からステージ3への遷移)
  const handlePlayBall = () => { 
    if (socket) {
      console.log('Host clicked Play Ball! Moving to Stage 3.');
      setCurrentStage(3); // Play Ball押したらステージ3へ
      // サーバーには何も送信しない。質問はプレイヤー側から送信する形のため。
    } else { console.error("Socket is not initialized."); }
  };
  
  // 「もう一度プレイする」ボタンクリック
  const handlePlayAgain = () => {
    if (socket) {
      console.log('Host clicked Play Again. Resetting App state.');
      // Appの状態を初期にリセットし、サーバーの新しい接続を待つ
      setHostId(null); 
      setIsLoading(true); // ローディング状態に戻すことで、useEffectが再発火し、Socket.IOが再接続する
      setCurrentStage(1); // ステージ1に戻す
      setPlayers([]); 
      setPlayerReactions({});
      setQuestionerNumber(null);
      setUsermodes([0,0,0,0]);
      setCurrentQuestionText("");
      setCurrentTimer(0);
      setIsGameOver(false);

      // バックエンドのサーバー状態もリセットしたい場合は、サーバーに新しいイベントを追加する必要がある
      // socket.emit('resetServerState'); // 例: サーバーに状態リセットを要求するイベント
    } else { console.error("Socket is not initialized."); }
  };


  // ★ UI レンダリング --- ホストPCの1枚画面でコンテンツを切り替える
  const renderCurrentStageContent = () => {
    switch (currentStage) {
      case 1: // QRコードと募集メッセージ
        return (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5em', color: '#666', marginBottom: '20px' }}>
              キャッチボール相手を探しています...
            </p>
            <img
              src={STATIC_QR_CODE_IMAGE_PATH}
              alt="QR Code"
              style={{ width: '256px', height: '256px', border: '1px solid #ddd', marginBottom: '20px' }}
            />
          </div>
        );
      case 2: // Play Ball! ボタン
        return (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handlePlayBall} // ここでhandlePlayBallを呼ぶ
              style={{ padding: '20px 40px', fontSize: '2em', backgroundColor: '#4CAF50', color: 'white', borderRadius: '50px' }}
            >
              Play Ball !
            </button>
          </div>
        );
      case 3: // 質問画像とテキスト (ゲームプレイ中/終了表示)
        return (
          <div style={{
            position: 'relative',
            textAlign: 'center',
            width: '100%', 
            maxWidth: '600px',
            height: '400px', 
            margin: '0 auto',
            border: '1px solid #ddd',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img
              src={DUMMY_QUESTION_IMAGE_PATH} // Best.svg
              alt="Question Content"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', zIndex: 0 }}
            />
            <div style={{ position: 'relative', zIndex: 1, color: '#333', textAlign: 'center' }}>
                {isGameOver ? (
                    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '10px' }}>
                        <h2 style={{ color: '#e74c3c' }}>ゲーム終了！</h2>
                        <button onClick={handlePlayAgain} style={{ padding: '10px 20px', fontSize: '1.2em', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                            もう一度プレイする
                        </button>
                    </div>
                ) : (
                    <>
                        <p style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            fontSize: '1.8em',
                            fontWeight: 'bold',
                            margin: '0 auto'
                        }}>
                            {currentQuestionText || "質問が表示されます"}
                        </p>
                        {/* タイマー表示 */}
                        <p style={{ fontSize: '1.5em', marginTop: '10px', backgroundColor: 'rgba(255, 255, 255, 0.7)', padding: '5px 10px', borderRadius: '5px' }}>
                            残り時間: {currentTimer}秒
                        </p>
                    </>
                )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  
  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      color: '#333'
    }}>
      {/* ローディング表示 */}
      {isLoading ? (
        <div className="loading-spinner">
          <p>ホストセッション準備中...<br/>（QRコード画像を読み込み中）</p>
        </div>
      ) : (
        <>
          {/* ★固定要素: Playerコンポーネントを4つ表示 */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '30px' }}>
            {/* サーバーから取得したplayersデータに基づいてPlayerCardをレンダリング */}
            {/* 各プレイヤーが誰で、点数がいくつかを表示 */}
            {Array.from({ length: 4 }).map((_, index) => {
                const player = players.find(p => p.usernumber === index); // usernumberで対応するプレイヤーを探す
                const isQuestioner = usermodes[index] === 1; // 出題者かどうか
                return (
                    <PlayerCard 
                        key={index} 
                        playerNumber={index + 1} // ★修正: Player1.svg, Player2.svgに対応するため1から4の番号を渡す
                        score={player ? player.score : 0} 
                        isQuestioner={isQuestioner} 
                    />
                );
            })}
          </div>

          {/* ... 以下のコードは変更なし ... */}
          {/* ★固定要素: 大枠 - 状態変化するコンテンツを挿入 */}
          <div style={{
            flexGrow: 1, // 利用可能なスペースを占有
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '800px',
            minHeight: '300px', // 最低高さを確保
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            {renderCurrentStageContent()}
          </div>
        </>
      )}
    </div>
  );
}

export default App;