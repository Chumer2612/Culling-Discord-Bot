import React, { useEffect, useState } from 'react';
import { UserPlus, UserMinus, ShieldAlert } from 'lucide-react';

export default function Users({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [acting, setActing] = useState(false);

  const fetchUsers = () => {
    fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActing(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        alert("Usuário criado com sucesso!");
        setFormData({ username: '', password: '' });
        fetchUsers();
      } else {
        alert("Erro: " + data.error);
      }
    } catch (e) {
      alert("Erro ao criar usuário.");
    }
    setActing(false);
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Tem certeza que deseja excluir o administrador '${username}'?`)) return;
    setActing(true);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert("Erro: " + data.error);
      }
    } catch (e) {
      alert("Erro ao excluir usuário.");
    }
    setActing(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1>Administradores</h1>
        <p style={{ color: 'var(--text-muted)' }}>Gerencie quem tem acesso ao painel do Jogo do Abate.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <h2><UserPlus size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Novo Administrador</h2>
          <form onSubmit={handleCreate} style={{ marginTop: '24px' }}>
            <div className="input-group">
              <label>Nome de Usuário</label>
              <input 
                type="text" 
                name="username"
                className="input-field" 
                value={formData.username}
                onChange={handleChange}
                placeholder="Ex: moderador1"
                required 
              />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input 
                type="password" 
                name="password"
                className="input-field" 
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={acting}>
              {acting ? 'Salvando...' : 'Adicionar Usuário'}
            </button>
          </form>
        </div>

        <div className="glass-panel">
          <h2>Contas Cadastradas</h2>
          <div className="table-container" style={{ marginTop: '24px' }}>
            {loading ? <p>Carregando usuários...</p> : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuário</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td style={{ fontWeight: 600 }}>
                        <ShieldAlert size={14} style={{ color: 'var(--primary)', marginRight: '4px', verticalAlign: 'middle' }}/> 
                        {u.username}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          onClick={() => handleDelete(u.id, u.username)}
                          disabled={acting}
                        >
                          <UserMinus size={14} style={{ verticalAlign: 'middle' }}/> Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
