import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Home from './pages/Home';
import Players from './pages/Players';
import Requests from './pages/Requests';
import ChatBot from './pages/ChatBot';
import Users from './pages/Users';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  if (!token) {
    return <Login setToken={(t) => { setToken(t); localStorage.setItem('token', t); }} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout onLogout={() => { setToken(null); localStorage.removeItem('token'); }} />}>
          <Route index element={<Home token={token} />} />
          <Route path="players" element={<Players token={token} />} />
          <Route path="requests" element={<Requests token={token} />} />
          <Route path="chat" element={<ChatBot token={token} />} />
          <Route path="users" element={<Users token={token} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
