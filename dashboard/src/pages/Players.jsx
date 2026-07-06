import React, { useEffect, useState } from 'react';
import { HeartPulse, Heart, Trophy, Plus, Minus } from 'lucide-react';

export default function Players({ token }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = () => {
    fetch('/api/players', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlayers();
  }, [token]);

  const handleAction = async (uuid, playerName, action) => {
    let value = 0;
    if (action !== 'reviver') {
      const input = window.prompt(`Digite a quantidade para ${action} no jogador ${playerName}:`);
      if (input === null) return; // Cancelado
      value = parseInt(input, 10);
      if (isNaN(value) || value <= 0) {
        alert("Valor inválido.");
        return;
      }
    } else {
      if (!window.confirm(`Tem certeza que deseja reviver o jogador ${playerName}?`)) return;
    }

    try {
      const response = await fetch(`/api/players/${uuid}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, value })
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Comando enviado com sucesso para o servidor!");
        // Opcional: atualizar jogadores após 2 segundos, já que o servidor processa o comando em seguida
        setTimeout(fetchPlayers, 2000);
      } else {
        alert("Erro: " + data.error);
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Jogadores</h1>
          <p style={{ color: 'var(--text-muted)' }}>Lista de participantes do Jogo do Abate</p>
        </div>
      </div>

      <div className="glass-panel">
        {loading ? <p>Carregando jogadores...</p> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nickname</th>
                  <th>Pontos de Fama</th>
                  <th>Kills</th>
                  <th>Vidas</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {!Array.isArray(players) ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--danger)' }}>Erro ao carregar jogadores do servidor.</td>
                  </tr>
                ) : players.map(player => (
                  <tr key={player.uuid}>
                    <td style={{ fontWeight: 600 }}>{player.player_name}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{player.fame_points} 🏆</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{player.kills} ⚔️</td>
                    <td>{player.current_lives} ❤️</td>
                    <td>
                      {player.current_lives > 0 
                        ? <span className="badge badge-success">VIVO</span> 
                        : <span className="badge badge-danger">ELIMINADO</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {player.current_lives <= 0 && (
                          <button className="btn btn-outline" style={{ padding: '6px' }} title="Reviver" onClick={() => handleAction(player.uuid, player.player_name, 'reviver')}>
                            <HeartPulse size={16} color="var(--success)" />
                          </button>
                        )}
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Adicionar Vida" onClick={() => handleAction(player.uuid, player.player_name, 'addVidas')}>
                          <Heart size={16} color="var(--danger)" /> <Plus size={12} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Remover Vida" onClick={() => handleAction(player.uuid, player.player_name, 'removeVidas')}>
                          <Heart size={16} color="var(--danger)" /> <Minus size={12} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Adicionar Pontos" onClick={() => handleAction(player.uuid, player.player_name, 'addPontos')}>
                          <Trophy size={16} color="var(--warning)" /> <Plus size={12} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '6px' }} title="Remover Pontos" onClick={() => handleAction(player.uuid, player.player_name, 'removePontos')}>
                          <Trophy size={16} color="var(--warning)" /> <Minus size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {Array.isArray(players) && players.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum jogador encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
