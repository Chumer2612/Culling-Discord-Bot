import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        setError(data.error || 'Senha Incorreta');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel animate-fade" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(229, 29, 56, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
            <Lock size={32} color="var(--primary-red)" />
          </div>
          <h1>Dashboard Admin</h1>
          <p style={{ color: 'var(--text-muted)' }}>Jogo do Abate</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Usuário</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div className="input-group">
            <label>Senha de Acesso</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Acessar Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
