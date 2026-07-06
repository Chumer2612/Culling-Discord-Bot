import React, { useEffect, useState } from 'react';

export default function Requests({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const fetchRequests = () => {
    fetch('/api/requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRequests(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleAction = async (id, status) => {
    const notes = prompt(`Motivo ou observação para ${status === 'APPROVED' ? 'Aprovar' : 'Negar'} o pedido #${id}?`);
    if (notes === null) return;

    setActing(id);
    try {
      await fetch(`/api/requests/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status, staffNotes: notes })
      });
      fetchRequests();
    } catch (e) {
      alert("Erro ao processar");
    }
    setActing(null);
  };

  const formatStatus = (s) => {
    if (s === 'PENDING') return <span className="badge badge-warning">Pendente</span>;
    if (s === 'APPROVED') return <span className="badge badge-success">Aprovado</span>;
    if (s === 'ADAPTED') return <span className="badge badge-success">Adaptado</span>;
    if (s === 'DENIED') return <span className="badge badge-danger">Negado</span>;
    return <span className="badge badge-info">{s}</span>;
  };

  const handleCreateManual = async () => {
    const typeChoice = prompt("Digite 'R' para criar uma Regra ou 'C' para Condição de Vitória:");
    if (!typeChoice) return;
    
    const isRule = typeChoice.toUpperCase() === 'R';
    const isCond = typeChoice.toUpperCase() === 'C';
    
    if (!isRule && !isCond) {
      alert("Inválido.");
      return;
    }

    const text = prompt(`Digite o texto oficial da nova ${isRule ? 'Regra' : 'Condição de Vitória'}:`);
    if (!text) return;

    try {
      await fetch('/api/requests/manual', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ type: isRule ? 'RULE' : 'VICTORY_CONDITION', text })
      });
      fetchRequests();
    } catch (e) {
      alert("Erro ao criar regra manualmente");
    }
  };

  const handleEdit = async (id, currentText) => {
    const newText = prompt("Editar texto da regra/condição:", currentText);
    if (!newText || newText === currentText) return;

    setActing(id);
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ text: newText })
      });
      fetchRequests();
    } catch (e) {
      alert("Erro ao editar.");
    }
    setActing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta regra/condição permanentemente?")) return;
    
    setActing(id);
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRequests();
    } catch (e) {
      alert("Erro ao excluir.");
    }
    setActing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Pedidos Oficiais</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie as regras e condições de vitória.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateManual}>
          + Nova Regra/Condição (Manual)
        </button>
      </div>

      <div className="glass-panel">
        {loading ? <p>Carregando pedidos...</p> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Jogador</th>
                  <th>Tipo</th>
                  <th>Pedido</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>
                    <td style={{ fontWeight: 600 }}>{req.player_name}</td>
                    <td>{req.request_type === 'RULE' ? '⚖️ Regra' : '🏆 Condição'}</td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.notes}>
                      {req.notes}
                    </td>
                    <td>{formatStatus(req.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {req.status === 'PENDING' && (
                          <>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--success)', color: 'var(--success)' }}
                              onClick={() => handleAction(req.id, 'APPROVED')}
                              disabled={acting === req.id}
                            >
                              Aprovar
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                              onClick={() => handleAction(req.id, 'DENIED')}
                              disabled={acting === req.id}
                            >
                              Negar
                            </button>
                          </>
                        )}
                        
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                          onClick={() => handleEdit(req.id, req.notes)}
                          disabled={acting === req.id}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => handleDelete(req.id)}
                          disabled={acting === req.id}
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum pedido encontrado.</td>
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
