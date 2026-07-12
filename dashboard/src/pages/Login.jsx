import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

export default function Login({ setToken }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setLoading(true);
      // Remove o code da URL para ficar limpo
      window.history.replaceState({}, document.title, "/");
      
      fetch('/api/auth/discord/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.error || 'Falha na autenticação via Discord');
          setLoading(false);
        }
      })
      .catch(err => {
        setError('Erro de conexão com o servidor');
        setLoading(false);
      });
    }
  }, [setToken]);

  const handleDiscordLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/discord/login', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Não foi possível gerar URL do Discord');
        setLoading(false);
      }
    } catch (err) {
      setError('Erro de conexão ao tentar logar com Discord');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel animate-fade" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(88, 101, 242, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
            <Lock size={32} color="#5865F2" />
          </div>
          <h1>Dashboard Admin</h1>
          <p style={{ color: 'var(--text-muted)' }}>Acesso exclusivo da Administração</p>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

        <button onClick={handleDiscordLogin} className="btn btn-primary" style={{ width: '100%', backgroundColor: '#5865F2', border: 'none' }} disabled={loading}>
          {loading ? 'Autenticando...' : 'Entrar com o Discord'}
        </button>
      </div>
    </div>
  );
}
