import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileCheck, MessageSquare, LogOut } from 'lucide-react';

export default function Layout({ onLogout }) {
  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
          <p style={{ color: 'var(--primary-red)', fontWeight: 600, fontSize: '0.9rem' }}>Jogo do Abate</p>
        </div>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
            <LayoutDashboard size={20} /> Visão Geral
          </NavLink>
          <NavLink to="/players" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <Users size={20} /> Jogadores
          </NavLink>
          <NavLink to="/requests" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <FileCheck size={20} /> Pedidos Oficiais
          </NavLink>
          <NavLink to="/chat" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            <MessageSquare size={20} /> Chat do Bot
          </NavLink>
        </nav>

        <div style={{ padding: '24px' }}>
          <button onClick={onLogout} className="btn btn-outline" style={{ width: '100%', color: 'var(--text-muted)' }}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>
      
      <div className="main-content animate-fade">
        <Outlet />
      </div>
    </div>
  );
}
