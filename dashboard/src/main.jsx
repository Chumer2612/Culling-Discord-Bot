import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Intercepta requisições fetch para deslogar automaticamente se o token expirar (401/403)
const originalFetch = window.fetch;
window.fetch = async function () {
  const response = await originalFetch.apply(this, arguments);
  if (response.status === 401 || response.status === 403) {
    const url = arguments[0];
    if (typeof url === 'string' && !url.includes('/api/login')) {
      localStorage.removeItem('token');
      window.location.reload();
    }
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
