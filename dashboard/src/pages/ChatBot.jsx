import React, { useEffect, useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatBot({ token }) {
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    channelId: '',
    content: '',
    embedTitle: '',
    embedDescription: '',
    embedImage: '',
    embedColor: '#e51d38'
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/channels', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setChannels(data);
        if (data.length > 0) setFormData(f => ({ ...f, channelId: data[0].id }));
      });

    fetch('/api/roles', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(setRoles);
      
    fetch('/api/members', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(setMembers);
  }, [token]);

  const appendMention = (type) => {
    if (type === 'role' && selectedRole) {
      setFormData(f => ({ ...f, content: f.content + `<@&${selectedRole}> ` }));
      setSelectedRole('');
    } else if (type === 'member' && selectedMember) {
      setFormData(f => ({ ...f, content: f.content + `<@${selectedMember}> ` }));
      setSelectedMember('');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (imageFile) {
        data.append('imageFile', imageFile);
      }

      await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: data
      });
      alert('Mensagem enviada com sucesso!');
      setFormData({ ...formData, content: '', embedTitle: '', embedDescription: '', embedImage: '' });
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      alert('Erro ao enviar mensagem');
    }
    setSending(false);
  };

  const handleFileChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormData(f => ({ ...f, embedImage: '' })); // Limpa URL text
    } else {
      alert("Por favor, selecione uma imagem válida.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1>Chat do Bot</h1>
        <p style={{ color: 'var(--text-muted)' }}>Envie anúncios e mensagens no Discord através do bot.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <div className="glass-panel">
          <h2>Nova Mensagem</h2>
          <form onSubmit={handleSend} style={{ marginTop: '24px' }}>
            <div className="input-group">
              <label>Canal de Destino</label>
              <select 
                name="channelId"
                className="input-field" 
                value={formData.channelId}
                onChange={handleChange}
                required
              >
                {channels.map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="input-group">
                <label>Mencionar Cargo</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="input-field" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                    <option value="">Selecione...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
                  </select>
                  <button type="button" className="btn btn-outline" onClick={() => appendMention('role')}>Add</button>
                </div>
              </div>
              <div className="input-group">
                <label>Mencionar Membro</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="input-field" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                    <option value="">Selecione...</option>
                    {members.map(m => <option key={m.id} value={m.id}>@{m.displayName}</option>)}
                  </select>
                  <button type="button" className="btn btn-outline" onClick={() => appendMention('member')}>Add</button>
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Mensagem Normal (opcional)</label>
              <textarea 
                name="content"
                className="input-field" 
                rows="3" 
                value={formData.content}
                onChange={handleChange}
                placeholder="Ex: @everyone Atenção participantes..."
              />
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '24px 0' }}></div>
            
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Adicionar Embed (opcional)</h3>

            <div className="input-group">
              <label>Título do Embed</label>
              <input 
                type="text" 
                name="embedTitle"
                className="input-field" 
                value={formData.embedTitle}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>Cor do Embed (HEX)</label>
              <input 
                type="color" 
                name="embedColor"
                className="input-field" 
                value={formData.embedColor}
                onChange={handleChange}
                style={{ padding: '4px', height: '48px' }}
              />
            </div>

            <div className="input-group">
              <label>Descrição do Embed</label>
              <textarea 
                name="embedDescription"
                className="input-field" 
                rows="5" 
                value={formData.embedDescription}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label>URL da Imagem (opcional)</label>
              <input 
                type="url" 
                name="embedImage"
                className="input-field" 
                value={formData.embedImage}
                onChange={handleChange}
                placeholder="Ex: https://i.imgur.com/..."
                disabled={!!imageFile}
              />
            </div>

            <div 
              className="input-group" 
              style={{
                border: '2px dashed rgba(255,255,255,0.2)',
                padding: '24px',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.2)'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input 
                type="file" 
                id="file-upload" 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
              {imageFile ? (
                <span style={{ color: '#00aaff' }}>Arquivo: {imageFile.name} (Clique para trocar)</span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Ou <b>clique / arraste e solte</b> um arquivo de imagem aqui.</span>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={sending}>
              <Send size={18} /> {sending ? 'Enviando...' : 'Publicar no Discord'}
            </button>
          </form>
        </div>

        <div>
          <h2>Preview</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Como a mensagem aparecerá no Discord:</p>
          
          <div style={{ background: '#313338', padding: '16px', borderRadius: '8px', border: '1px solid #1e1f22' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-red)' }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#f2f3f5' }}>CullingBot</span>
                  <span style={{ fontSize: '0.75rem', background: '#5865F2', padding: '2px 4px', borderRadius: '4px' }}>BOT</span>
                </div>
                
                {formData.content && (
                  <div style={{ color: '#dbdee1', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{formData.content}</div>
                )}

                {(formData.embedTitle || formData.embedDescription) && (
                  <div style={{ 
                    marginTop: '8px', 
                    background: '#2b2d31', 
                    borderLeft: `4px solid ${formData.embedColor}`,
                    padding: '16px',
                    borderRadius: '4px'
                  }}>
                    {formData.embedTitle && (
                      <div style={{ color: '#f2f3f5', fontWeight: 600, marginBottom: '8px' }}>{formData.embedTitle}</div>
                    )}
                    {formData.embedDescription && (
                      <div style={{ color: '#dbdee1', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{formData.embedDescription}</div>
                    )}
                    {(imagePreview || formData.embedImage) && (
                      <img 
                        src={imagePreview || formData.embedImage} 
                        alt="Embed Image" 
                        style={{ marginTop: '16px', maxWidth: '100%', borderRadius: '4px' }} 
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
