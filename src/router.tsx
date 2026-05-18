import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Game from './pages/Game';
import { Home } from './pages/Home';
import { Lobby } from './pages/Lobby';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<Game />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
