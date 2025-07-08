import React, { useState, useEffect } from "react";

function HintText() {
  const ideaWords = [
    "タイムカプセル",
    "記憶喪失",
    "片道切符",
    "無人島",
    "空白の一日",
    "もしもボタン",
    "過去の手紙",
    "最初の嘘",
    "黒歴史",
    "未来予知",
    "透明人間",
    "夢日記",
    "不老不死",
    "生まれ変わり",
    "架空の友達",
    "忘れ物",
    "なりすまし",
    "秘密基地",
    "小さな約束",
    "最後の晩餐",
    "裏アカウント",
    "音のない世界",
    "砂時計",
    "未解決事件",
    "ドッペルゲンガー",
    "第三の選択肢",
    "記憶のかけら",
    "好きだった匂い",
    "開かずの扉",
    "名前のない感情",
  ];

  // ideaWords配列からランダムに単語を取得する関数
  const getRandomWord = () => {
    const randomIndex = Math.floor(Math.random() * ideaWords.length);
    return ideaWords[randomIndex];
  };

  // useStateを使って、現在表示する単語の状態を管理する
  // 初期値としてランダムな単語を設定
  const [currentWord, setCurrentWord] = useState(getRandomWord);

  // useEffectを使って、30秒ごとに単語を更新する処理を実装
  useEffect(() => {
    // 30000ミリ秒（30秒）ごとに実行されるタイマーを設定
    const intervalId = setInterval(() => {
      setCurrentWord(getRandomWord());
    }, 30000);

    // コンポーネントがアンマウント（破棄）される時にタイマーを解除する
    // これにより、メモリリークを防ぐ
    return () => clearInterval(intervalId);
  }, []); // 空の依存配列[]を指定することで、このeffectはマウント時に一度だけ実行される

  // 状態として保持している現在の単語を表示する
  return <>{currentWord}</>;
}

export default HintText;
