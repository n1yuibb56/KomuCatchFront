import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.jsx'; // 初期画面兼ホスト画面
import PlayerPage from './pages/PlayerPage.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <Router>
      <Routes>
        <Route path="/" element={<App />} /> {/* 初期画面 (ホスト機能もここで提供) */}
        <Route path="/player" element={<PlayerPage />} /> {/* プレイヤー参加用URL */}
        {/* 必要に応じて、NotFoundページやエラーページも追加 */}
      </Routes>
    </Router>
);