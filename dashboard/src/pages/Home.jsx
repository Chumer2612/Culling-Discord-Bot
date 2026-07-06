import React, { useEffect, useState } from 'react';
import { Users, Activity, MessageSquareWarning, Swords, TerminalSquare } from 'lucide-react';

export default function Home({ token }) {
  const [stats, setStats] = useState({ totalPlayers: 0, pendingRequests: 0, botLatency: 0 });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetch('/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });

    fetch('/api/activities', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setActivities(data);
        setLoadingActivities(false);
      });
  }, [token]);

  return (
    <div>
      <h1>Visão Geral</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Bem-vindo ao painel de controle do Jogo do Abate.</p>

      {loading ? <p>Carregando...</p> : (
        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h3>Total de Jogadores</h3>
              <p>{stats.totalPlayers}</p>
            </div>
          </div>
          
          <div className="glass-panel stat-card">
            <div className="stat-icon" style={{ color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>
              <MessageSquareWarning size={24} />
            </div>
            <div className="stat-info">
              <h3>Pedidos Pendentes</h3>
              <p>{stats.pendingRequests}</p>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon" style={{ color: 'var(--success)', background: 'rgba(34, 197, 94, 0.1)' }}>
              <Activity size={24} />
            </div>
            <div className="stat-info">
              <h3>Latência do Bot</h3>
              <p>{stats.botLatency}ms</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ marginTop: '32px' }}>
        <h2>Últimas Atividades</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Kills recentes e ações da Staff</p>
        
        {loadingActivities ? <p>Carregando atividades...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!Array.isArray(activities) ? (
              <p style={{ color: 'var(--danger)' }}>Erro ao carregar atividades do servidor.</p>
            ) : activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhuma atividade recente.</p>
            ) : (
              activities.map(act => (
                <div key={`${act.type}-${act.id}`} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '12px', 
                  background: 'rgba(0,0,0,0.2)', 
                  borderRadius: '8px',
                  borderLeft: act.type === 'kill' ? '4px solid var(--danger)' : '4px solid var(--primary)'
                }}>
                  {act.type === 'kill' ? (
                    <Swords size={20} color="var(--danger)" />
                  ) : (
                    <TerminalSquare size={20} color="var(--primary)" />
                  )}
                  <div>
                    <p style={{ margin: 0, fontWeight: 500 }}>
                      {act.type === 'kill' 
                        ? <><span style={{ color: 'var(--danger)' }}>{act.killer_name}</span> abateu <span style={{ color: 'var(--warning)' }}>{act.victim_name}</span> com {act.weapon}</>
                        : <><span style={{ color: 'var(--primary)' }}>{act.discord_name}</span> executou: <code>{act.minecraft_command}</code></>}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(act.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
