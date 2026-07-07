import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Edit, Trash2 } from 'lucide-react';

export default function Requests({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'APPROVE', 'DENY', 'ADAPT', 'CREATE_MANUAL', 'EDIT'
  const [activeRequest, setActiveRequest] = useState(null);
  
  // Form States
  const [formNotes, setFormNotes] = useState('');
  const [formAdaptedText, setFormAdaptedText] = useState('');
  const [formManualType, setFormManualType] = useState('RULE');
  const [submitting, setSubmitting] = useState(false);

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

  const openModal = (type, request = null) => {
    setModalType(type);
    setActiveRequest(request);
    setFormNotes('');
    setFormAdaptedText(request ? request.notes : '');
    setFormManualType('RULE');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveRequest(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalType === 'APPROVE' || modalType === 'DENY' || modalType === 'ADAPT') {
        const statusMap = { 'APPROVE': 'APPROVED', 'DENY': 'DENIED', 'ADAPT': 'ADAPTED' };
        await fetch(`/api/requests/${activeRequest.id}/status`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            status: statusMap[modalType], 
            staffNotes: formNotes,
            adaptedText: modalType === 'ADAPT' ? formAdaptedText : null
          })
        });
      } else if (modalType === 'CREATE_MANUAL') {
        await fetch('/api/requests/manual', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ type: formManualType, text: formAdaptedText })
        });
      } else if (modalType === 'EDIT') {
        await fetch(`/api/requests/${activeRequest.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ text: formAdaptedText })
        });
      }
      fetchRequests();
      closeModal();
    } catch (e) {
      alert("Erro ao processar requisição.");
    }
    
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta regra/condição permanentemente?")) return;
    
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRequests();
    } catch (e) {
      alert("Erro ao excluir.");
    }
  };

  const formatStatus = (s) => {
    if (s === 'PENDING') return <span className="badge badge-warning">Pendente</span>;
    if (s === 'APPROVED') return <span className="badge badge-success">Aprovado</span>;
    if (s === 'ADAPTED') return <span className="badge badge-success">Adaptado</span>;
    if (s === 'DENIED') return <span className="badge badge-danger">Negado</span>;
    return <span className="badge badge-info">{s}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1>Pedidos Oficiais</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie as regras e condições de vitória.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('CREATE_MANUAL')}>
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
                              onClick={() => openModal('APPROVE', req)}
                            >
                              <ShieldCheck size={14} style={{ verticalAlign: 'middle' }}/> Aprovar
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#3b82f6' }}
                              onClick={() => openModal('ADAPT', req)}
                            >
                              <Edit size={14} style={{ verticalAlign: 'middle' }}/> Adaptar
                            </button>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                              onClick={() => openModal('DENY', req)}
                            >
                              <ShieldAlert size={14} style={{ verticalAlign: 'middle' }}/> Negar
                            </button>
                          </>
                        )}
                        
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                          onClick={() => openModal('EDIT', req)}
                        >
                          <Edit size={14} style={{ verticalAlign: 'middle' }}/> Editar
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          onClick={() => handleDelete(req.id)}
                        >
                          <Trash2 size={14} style={{ verticalAlign: 'middle' }}/> Excluir
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

      {/* MODAL SYSTEM */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            {modalType === 'APPROVE' && <h2>Aprovar Pedido</h2>}
            {modalType === 'DENY' && <h2>Negar Pedido</h2>}
            {modalType === 'ADAPT' && <h2>Adaptar Pedido</h2>}
            {modalType === 'EDIT' && <h2>Editar Pedido Existente</h2>}
            {modalType === 'CREATE_MANUAL' && <h2>Criar Regra Oficial (Manual)</h2>}

            <form onSubmit={handleSubmit}>
              
              {/* Leitura do Pedido Original para context (quando aplicável) */}
              {activeRequest && modalType !== 'EDIT' && (
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pedido Original de {activeRequest.player_name}:</span>
                  <p style={{ margin: '8px 0 0 0', color: 'white', fontStyle: 'italic' }}>"{activeRequest.notes}"</p>
                </div>
              )}

              {/* Formulário para Criação Manual */}
              {modalType === 'CREATE_MANUAL' && (
                <div className="input-group">
                  <label>Tipo de Criação</label>
                  <select 
                    className="input-field" 
                    value={formManualType} 
                    onChange={e => setFormManualType(e.target.value)}
                  >
                    <option value="RULE">⚖️ Regra</option>
                    <option value="VICTORY_CONDITION">🏆 Condição de Vitória</option>
                  </select>
                </div>
              )}

              {/* Adaptação de Texto (ou edição) */}
              {(modalType === 'ADAPT' || modalType === 'CREATE_MANUAL' || modalType === 'EDIT') && (
                <div className="input-group">
                  <label>{modalType === 'EDIT' ? 'Corrigir Texto' : 'Texto Final (Oficial)'}</label>
                  <textarea 
                    className="input-field" 
                    rows="3"
                    value={formAdaptedText}
                    onChange={(e) => setFormAdaptedText(e.target.value)}
                    placeholder="Digite como a regra ficará publicamente no jogo..."
                    required
                  ></textarea>
                </div>
              )}

              {/* Justificativa / Observação (Aprovação e Negação e Adaptação) */}
              {(modalType === 'APPROVE' || modalType === 'DENY' || modalType === 'ADAPT') && (
                <div className="input-group">
                  <label>{modalType === 'DENY' ? 'Motivo da Negação (Obrigatório)' : 'Observações Internas (Opcional)'}</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ex: Muito quebrado, negado."
                    required={modalType === 'DENY'}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Processando...' : 'Confirmar Ação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
