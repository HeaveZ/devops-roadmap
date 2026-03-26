import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const APP_VERSION = process.env.REACT_APP_VERSION || '1.2.0';

const PRIORITIES = [
  { key: 'none', label: '-', color: 'none' },
  { key: 'dusuk', label: 'Düşük', color: 'priority-dusuk' },
  { key: 'orta', label: 'Orta', color: 'priority-orta' },
  { key: 'yuksek', label: 'Yüksek', color: 'priority-yuksek' },
  { key: 'kritik', label: 'Kritik', color: 'priority-kritik' },
];

function getPriorityInfo(priority) {
  return PRIORITIES.find(p => p.key === priority) || PRIORITIES[0];
}

function getNextPriority(current) {
  const idx = PRIORITIES.findIndex(p => p.key === current);
  return PRIORITIES[(idx + 1) % PRIORITIES.length].key;
}

function getLevelClass(level) {
  if (!level) return 'temel';
  const l = level.toLowerCase();
  if (l.includes('ileri') || l.includes('advanced')) return 'ileri';
  if (l.includes('orta') || l.includes('intermediate') || l.includes('medium')) return 'orta';
  return 'temel';
}

function getLevelLabel(level) {
  if (!level) return 'Temel';
  const l = level.toLowerCase();
  if (l.includes('ileri') || l.includes('advanced')) return 'Ileri';
  if (l.includes('orta') || l.includes('intermediate') || l.includes('medium')) return 'Orta';
  return 'Temel';
}

function groupBySection(tasks) {
  const groups = {};
  tasks.forEach(task => {
    const sec = task.section || task.category || 'Genel';
    if (!groups[sec]) groups[sec] = [];
    groups[sec].push(task);
  });
  return groups;
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const gun = d.getDate().toString().padStart(2, '0');
  const ay = (d.getMonth() + 1).toString().padStart(2, '0');
  const yil = d.getFullYear();
  const saat = d.getHours().toString().padStart(2, '0');
  const dk = d.getMinutes().toString().padStart(2, '0');
  const sn = d.getSeconds().toString().padStart(2, '0');
  return `${gun}.${ay}.${yil} ${saat}:${dk}:${sn}`;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedTasks, setExpandedTasks] = useState({});
  const [subtaskInput, setSubtaskInput] = useState({});
  const [showSubtaskForm, setShowSubtaskForm] = useState({});
  const [showComments, setShowComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem('devops_token') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('devops_username') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('devops_token'));
  const [avatarData, setAvatarData] = useState(() => localStorage.getItem('devops_avatar') || '');
  const fileInputRef = useRef(null);
  const userMenuRef = useRef(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Files state
  const [view, setView] = useState('tasks');
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const uploadInputRef = useRef(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('devops_token');
    localStorage.removeItem('devops_username');
    localStorage.removeItem('devops_avatar');
    setToken('');
    setUsername('');
    setAvatarData('');
    setIsLoggedIn(false);
    setTasks([]);
    setLoginError('');
  }, []);

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      handleLogout();
      throw new Error('Oturum suresi doldu, tekrar giris yapin');
    }
    return res;
  }, [token, handleLogout]);

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Giris basarisiz');
        setLoginLoading(false);
        return;
      }
      localStorage.setItem('devops_token', data.token);
      localStorage.setItem('devops_username', data.username);
      if (data.avatarData) {
        localStorage.setItem('devops_avatar', data.avatarData);
        setAvatarData(data.avatarData);
      } else {
        localStorage.removeItem('devops_avatar');
        setAvatarData('');
      }
      setToken(data.token);
      setUsername(data.username);
      setIsLoggedIn(true);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
    } catch {
      setLoginError('Sunucuya baglanilamadi');
    }
    setLoginLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Dosya boyutu 2MB\'dan kucuk olmali');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      try {
        const res = await authFetch(`${API_URL}/api/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarData: base64 }),
        });
        const data = await res.json();
        if (data.success) {
          setAvatarData(data.avatarData);
          localStorage.setItem('devops_avatar', data.avatarData);
        }
      } catch {
        alert('Avatar yuklenemedi');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Disari tiklaninca dropdown kapanir
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) return;
    setPasswordLoading(true);
    setPasswordMsg('');
    try {
      const res = await fetch(`${API_URL}/api/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg(data.error || 'Mevcut sifre yanlis');
        setCurrentPassword('');
        setPasswordLoading(false);
        return;
      }
      setPasswordMsg('Sifre degistirildi! Yeni sifrenizle giris yapin...');
      setPasswordLoading(false);
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setPasswordMsg('');
        handleLogout();
      }, 1500);
    } catch {
      setPasswordMsg('Sunucuya baglanilamadi');
      setPasswordLoading(false);
    }
  };

  // Dosya islemleri
  const fetchFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/files`);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch {}
    setFilesLoading(false);
  }, [authFetch]);

  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: Dosya boyutu 10MB'dan kucuk olmali`);
        continue;
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await authFetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const created = await res.json();
        if (res.ok) {
          setFiles(prev => [created, ...prev]);
        }
      } catch {}
    }
    setUploading(false);
  };

  const deleteFile = async (fileId) => {
    const prev = files;
    setFiles(f => f.filter(x => x.id !== fileId));
    try {
      await authFetch(`${API_URL}/api/files/${fileId}`, { method: 'DELETE' });
    } catch {
      setFiles(prev);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImageFile = (mimetype) => mimetype && mimetype.startsWith('image/');

  useEffect(() => {
    if (isLoggedIn && token && view === 'files') {
      fetchFiles();
    }
  }, [isLoggedIn, token, view, fetchFiles]);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setLoading(false);
      return;
    }
    authFetch(`${API_URL}/api/tasks`)
      .then(r => r.json())
      .then(data => {
        setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (err.message.includes('Oturum')) return;
        setError('Backend\'e baglanamadi. Lutfen tekrar deneyin.');
        setLoading(false);
      });
  }, [isLoggedIn, token, authFetch]);

  const toggleTask = async (task) => {
    const updated = tasks.map(t =>
      t.id === task.id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    try {
      await authFetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
    } catch {
      setTasks(tasks);
    }
  };

  const cyclePriority = async (task) => {
    const newPriority = getNextPriority(task.priority || 'none');
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, priority: newPriority } : t
    ));
    try {
      await authFetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
    } catch {
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, priority: task.priority } : t
      ));
    }
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleSubtaskForm = (taskId) => {
    setShowSubtaskForm(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    if (!showSubtaskForm[taskId]) {
      setSubtaskInput(prev => ({ ...prev, [taskId]: '' }));
    }
  };

  const createSubtask = async (taskId) => {
    const title = (subtaskInput[taskId] || '').trim();
    if (!title) return;
    const tempId = Date.now();
    const newSubtask = { id: tempId, parent_id: taskId, title, completed: false };
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] } : t
    ));
    setSubtaskInput(prev => ({ ...prev, [taskId]: '' }));
    setShowSubtaskForm(prev => ({ ...prev, [taskId]: false }));
    try {
      const res = await authFetch(`${API_URL}/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const created = await res.json();
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === tempId ? created : st) } : t
      ));
    } catch {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== tempId) } : t
      ));
    }
  };

  const toggleSubtask = async (taskId, subtask) => {
    const newCompleted = !subtask.completed;
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtask.id ? { ...st, completed: newCompleted } : st) } : t
    ));
    try {
      await authFetch(`${API_URL}/api/subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtask.id ? { ...st, completed: subtask.completed } : st) } : t
      ));
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    const prev = tasks;
    setTasks(p => p.map(t =>
      t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) } : t
    ));
    try {
      await authFetch(`${API_URL}/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    } catch {
      setTasks(prev);
    }
  };

  const toggleCommentsPanel = (taskId) => {
    setShowComments(prev => {
      const isOpen = prev[taskId];
      if (isOpen) return { ...prev, [taskId]: false };
      const allClosed = {};
      Object.keys(prev).forEach(k => { allClosed[k] = false; });
      return { ...allClosed, [taskId]: true };
    });
  };

  const createComment = async (taskId) => {
    const text = (commentInput[taskId] || '').trim();
    if (!text) return;
    const tempId = Date.now();
    const newComment = { id: tempId, task_id: taskId, text, author: username || 'Anonim', created_at: new Date().toISOString() };
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, comments: [...(t.comments || []), newComment] } : t
    ));
    setCommentInput(prev => ({ ...prev, [taskId]: '' }));
    try {
      const res = await authFetch(`${API_URL}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const created = await res.json();
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, comments: (t.comments || []).map(c => c.id === tempId ? created : c) } : t
      ));
    } catch {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, comments: (t.comments || []).filter(c => c.id !== tempId) } : t
      ));
    }
  };

  const deleteComment = async (taskId, commentId) => {
    const prev = tasks;
    setTasks(p => p.map(t =>
      t.id === taskId ? { ...t, comments: (t.comments || []).filter(c => c.id !== commentId) } : t
    ));
    try {
      await authFetch(`${API_URL}/api/comments/${commentId}`, { method: 'DELETE' });
    } catch {
      setTasks(prev);
    }
  };

  const filtered = tasks.filter(t => {
    if (filter === 'done') return t.completed;
    if (filter === 'todo') return !t.completed;
    return true;
  });

  const filteredTasks = filtered.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(t.title || t.name || '').toLowerCase().includes(q)) return false;
    }
    if (filterStatus === 'active' && t.completed) return false;
    if (filterStatus === 'completed' && !t.completed) return false;
    if (filterSection !== 'all') {
      const sec = t.section || t.category || 'Genel';
      if (sec !== filterSection) return false;
    }
    if (filterPriority !== 'all') {
      if ((t.priority || 'none') !== filterPriority) return false;
    }
    return true;
  });

  const allSections = [...new Set(tasks.map(t => t.section || t.category || 'Genel'))];
  const activeFilters = searchQuery !== '' || filterStatus !== 'all' || filterSection !== 'all' || filterPriority !== 'all';

  const grouped = groupBySection(filteredTasks);
  const allSubtasks = tasks.flatMap(t => t.subtasks || []);
  const totalItems = tasks.length + allSubtasks.length;
  const doneItems = tasks.filter(t => t.completed).length + allSubtasks.filter(st => st.completed).length;
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const doneCount = tasks.filter(t => t.completed).length;
  const total = tasks.length;

  return (
    <div className="app">
      <div className="grid-bg" />

      {/* LOGIN EKRANI */}
      {!isLoggedIn && (
        <div className="popup-overlay">
          <div className="popup-box">
            <div className="popup-title">Hosgeldin!</div>
            <p className="popup-desc">DevOps Roadmap'e erisim icin giris yap</p>
            {loginError && <div className="login-error">{loginError}</div>}
            <input
              className="popup-input"
              type="text"
              placeholder="Kullanici adi..."
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('login-password').focus(); }}
              autoFocus
            />
            <input
              id="login-password"
              className="popup-input"
              type="password"
              placeholder="Sifre..."
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            />
            <button className="popup-btn" onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? 'Giris yapiliyor...' : 'Giris Yap'}
            </button>
          </div>
        </div>
      )}

      {/* SIFRE DEGISTIRME MODALI */}
      {showPasswordModal && (
        <div className="password-overlay" onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setPasswordMsg(''); }}>
          <div className="password-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">Sifre Degistir</div>
            <p className="popup-desc">Mevcut sifrenizi dogrulayin ve yeni sifrenizi girin</p>
            {passwordMsg && (
              <div className={`password-msg ${passwordMsg.includes('degistirildi') ? 'success' : 'error'}`}>
                {passwordMsg}
              </div>
            )}
            <input
              className="popup-input"
              type="password"
              placeholder="Mevcut sifre..."
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('new-password').focus(); }}
              autoFocus
            />
            <input
              id="new-password"
              className="popup-input"
              type="password"
              placeholder="Yeni sifre..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
            />
            <button className="popup-btn" onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? 'Degistiriliyor...' : 'Sifreyi Degistir'}
            </button>
          </div>
        </div>
      )}

      <div className="content">
        <div className="header">
          <div className="header-top">
            <div className="header-left">
              <span className="brand-tag">// OGRENME YOLCULUGU</span>
              <h1 className="brand-title">DevOps <span>Roadmap</span></h1>
              <p className="brand-sub">Sifirdan uretim ortamina - her gorevi tamamla, her adimda buyu</p>
            </div>
            {username && isLoggedIn && (
              <div className="user-badge-area" ref={userMenuRef}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
                <div className="user-badge" onClick={() => setShowUserMenu(prev => !prev)}>
                  <span className="user-avatar">
                    {avatarData ? <img src={avatarData} alt="avatar" /> : username.charAt(0).toUpperCase()}
                  </span>
                  <span className="user-name">{username}</span>
                  <span className="user-badge-arrow">{showUserMenu ? '▲' : '▼'}</span>
                </div>
                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-item" onClick={() => { fileInputRef.current.click(); setShowUserMenu(false); }}>
                      <span className="user-menu-icon">📷</span> Fotograf Degistir
                    </div>
                    <div className="user-menu-item" onClick={() => { setShowPasswordModal(true); setShowUserMenu(false); }}>
                      <span className="user-menu-icon">🔑</span> Sifre Degistir
                    </div>
                    <div className="user-menu-item danger" onClick={() => { handleLogout(); setShowUserMenu(false); }}>
                      <span className="user-menu-icon">↗</span> Cikis Yap
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="stats-row">
            <div className="stat-pill">
              <span className="stat-num">{total}</span>
              <span className="stat-label">TOPLAM</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num orange">{doneCount}</span>
              <span className="stat-label">TAMAMLANDI</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num red">{total - doneCount}</span>
              <span className="stat-label">KALAN</span>
            </div>
          </div>
        </div>

        <div className="view-tabs">
          <button className={`view-tab ${view === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')}>
            Gorevler
          </button>
          <button className={`view-tab ${view === 'files' ? 'active' : ''}`} onClick={() => setView('files')}>
            Dosyalar
          </button>
        </div>

        {view === 'tasks' && <>
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">GENEL ILERLEME</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
        </div>

        <div className="tabs">
          {[
            { key: 'all', label: `Tumu (${total})` },
            { key: 'todo', label: `Yapilacak (${total - doneCount})` },
            { key: 'done', label: `Tamamlanan (${doneCount})` },
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-bar">
          <div className="filter-search-wrapper">
            <input
              type="text"
              className="filter-search"
              placeholder="Görev ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="filter-search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
          <button
            className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >Tümü</button>
          <button
            className={`filter-chip ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >Devam Eden</button>
          <button
            className={`filter-chip ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >Tamamlanan</button>
          {allSections.length > 1 && (
            <select
              className="filter-select"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
            >
              <option value="all">Tüm Bölümler</option>
              {allSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          )}
          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="kritik">Kritik</option>
            <option value="yuksek">Yüksek</option>
            <option value="orta">Orta</option>
            <option value="dusuk">Düşük</option>
            <option value="none">Belirsiz</option>
          </select>
          {activeFilters && (
            <span className="filter-result-info">
              {filteredTasks.length} sonuç
            </span>
          )}
          {activeFilters && (
            <button
              className="filter-reset"
              onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterSection('all'); setFilterPriority('all'); }}
            >Filtreleri Temizle</button>
          )}
        </div>

        {!loading && !error && isLoggedIn && activeFilters && filteredTasks.length === 0 && (
          <div className="filter-empty">Aramanızla eşleşen görev bulunamadı</div>
        )}

        {loading && isLoggedIn && (
          <div className="loading-screen">
            <div className="spinner" />
            Backend'e baglaniliyor...
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {!loading && !error && isLoggedIn && Object.keys(grouped).length === 0 && (
          <div className="empty-state">// Bu filtrede gorev bulunamadi</div>
        )}

        {!loading && Object.entries(grouped).map(([section, sectionTasks]) => {
          const sectionSubs = sectionTasks.flatMap(t => t.subtasks || []);
          const sectionTotal = sectionTasks.length + sectionSubs.length;
          const sectionDone = sectionTasks.filter(t => t.completed).length + sectionSubs.filter(st => st.completed).length;

          return (
            <div className="section" key={section}>
              <div className="section-label">
                {section}
                <span className="section-count">{sectionDone}/{sectionTotal}</span>
              </div>
              {sectionTasks.map(task => {
                const subtasks = task.subtasks || [];
                const comments = task.comments || [];
                const isExpanded = expandedTasks[task.id];
                const isCommentsOpen = showComments[task.id];
                const subDone = subtasks.filter(st => st.completed).length;

                return (
                  <div className="task-wrapper" key={task.id}>
                    <div className="task-left">
                      <div className={`task ${task.completed ? 'done' : ''}`}>
                        <div className="chk" onClick={(e) => { e.stopPropagation(); toggleTask(task); }}>
                          {task.completed ? '✓' : ''}
                        </div>
                        <span className="task-name" onClick={() => toggleTask(task)}>
                          {task.title || task.name}
                        </span>
                        {subtasks.length > 0 && (
                          <span className="subtask-count">{subDone}/{subtasks.length}</span>
                        )}
                        <div className="task-actions">
                          {(() => {
                            const pri = getPriorityInfo(task.priority || 'none');
                            return (
                              <span
                                className={`priority-badge ${pri.color}`}
                                onClick={(e) => { e.stopPropagation(); cyclePriority(task); }}
                                title="Öncelik değiştirmek için tıkla"
                              >
                                {pri.key === 'none' ? '◇' : '◆'} {pri.label}
                              </span>
                            );
                          })()}
                          <span className={`badge ${getLevelClass(task.level || task.difficulty)}`}>
                            {getLevelLabel(task.level || task.difficulty)}
                          </span>
                          <button
                            className={`action-btn comment-btn ${isCommentsOpen ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleCommentsPanel(task.id); }}
                            title="Yorumlar"
                          >
                            <span className="action-icon">💬</span>
                            {comments.length > 0 && <span className="comment-badge">{comments.length}</span>}
                          </button>
                          <button
                            className={`action-btn expand-btn ${isExpanded ? 'expanded' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                            title={isExpanded ? 'Kapat' : 'Alt gorevler'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="subtask-area">
                          {subtasks.map(st => (
                            <div key={st.id} className={`subtask ${st.completed ? 'done' : ''}`}>
                              <div className="chk" onClick={() => toggleSubtask(task.id, st)}>
                                {st.completed ? '✓' : ''}
                              </div>
                              <span className="subtask-name">{st.title}</span>
                              <button
                                className="subtask-delete-btn"
                                onClick={() => deleteSubtask(task.id, st.id)}
                                title="Sil"
                              >×</button>
                            </div>
                          ))}
                          {showSubtaskForm[task.id] ? (
                            <div className="subtask-form">
                              <input
                                className="subtask-input"
                                type="text"
                                placeholder="Alt gorev basligi..."
                                value={subtaskInput[task.id] || ''}
                                onChange={(e) => setSubtaskInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') createSubtask(task.id);
                                  if (e.key === 'Escape') toggleSubtaskForm(task.id);
                                }}
                                autoFocus
                              />
                              <button className="subtask-create-btn" onClick={() => createSubtask(task.id)}>Ekle</button>
                              <button className="subtask-cancel-btn" onClick={() => toggleSubtaskForm(task.id)}>Iptal</button>
                            </div>
                          ) : (
                            <button className="add-subtask-btn" onClick={() => toggleSubtaskForm(task.id)}>
                              + Alt gorev ekle
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isCommentsOpen && (
                      <div className="comments-area">
                        <div className="comments-header">Yorumlar</div>
                        {comments.length === 0 && (
                          <div className="no-comments">Henuz yorum yok</div>
                        )}
                        {comments.map(c => (
                          <div key={c.id} className="comment-item">
                            <div className="comment-top">
                              <span className="comment-author-avatar">
                                {c.author === username && avatarData ? <img src={avatarData} alt="avatar" /> : (c.author || 'A').charAt(0).toUpperCase()}
                              </span>
                              <span className="comment-author">{c.author || 'Anonim'}</span>
                              <span className="comment-date">{formatFullDate(c.created_at)}</span>
                            </div>
                            <div className="comment-text">{c.text}</div>
                            <button
                              className="comment-delete-btn"
                              onClick={() => deleteComment(task.id, c.id)}
                              title="Sil"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="comment-form">
                          <span className="comment-form-avatar">
                            {avatarData ? <img src={avatarData} alt="avatar" /> : (username || 'A').charAt(0).toUpperCase()}
                          </span>
                          <input
                            className="comment-input"
                            type="text"
                            placeholder={`${username || 'Anonim'} olarak yorum yaz...`}
                            value={commentInput[task.id] || ''}
                            onChange={(e) => setCommentInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') createComment(task.id); }}
                          />
                          <button className="comment-send-btn" onClick={() => createComment(task.id)}>
                            Gonder
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        </>}

        {view === 'files' && (
          <div className="files-section">
            <div
              className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => uploadInputRef.current?.click()}
            >
              <input
                type="file"
                ref={uploadInputRef}
                style={{ display: 'none' }}
                multiple
                onChange={(e) => { handleFileUpload(e.target.files); e.target.value = ''; }}
              />
              <div className="upload-icon">{uploading ? '...' : '+'}</div>
              <div className="upload-text">
                {uploading ? 'Yukleniyor...' : 'Dosya yuklemek icin tikla veya surukle'}
              </div>
              <div className="upload-hint">Maks. 10MB</div>
            </div>

            {filesLoading && (
              <div className="loading-screen">
                <div className="spinner" />
                Dosyalar yukleniyor...
              </div>
            )}

            {!filesLoading && files.length === 0 && (
              <div className="empty-state">// Henuz dosya yuklenmemis</div>
            )}

            {!filesLoading && files.length > 0 && (
              <>
                <div className="files-summary">
                  {files.length} dosya &middot; Toplam {formatFileSize(files.reduce((a, f) => a + f.size, 0))}
                </div>
                <div className="files-list">
                  {files.map(f => (
                    <div key={f.id} className="file-row">
                      <div className="file-row-preview">
                        {isImageFile(f.mimetype) ? (
                          <img src={f.url} alt={f.filename} />
                        ) : (
                          <span className="file-ext">{f.filename.split('.').pop().toUpperCase()}</span>
                        )}
                      </div>
                      <div className="file-row-info">
                        <div className="file-row-name" title={f.filename}>{f.filename}</div>
                        <div className="file-row-meta">
                          <span className="file-row-size">{formatFileSize(f.size)}</span>
                          <span className="file-row-sep">&middot;</span>
                          <span>{f.uploaded_by}</span>
                          <span className="file-row-sep">&middot;</span>
                          <span>{formatFullDate(f.created_at)}</span>
                        </div>
                      </div>
                      <div className="file-row-actions">
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="file-btn-download" title="Indir">
                          Indir
                        </a>
                        <button className="file-btn-delete" onClick={() => deleteFile(f.id)} title="Sil">
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="created-by">
          created by HeaveZ :)
          <span style={{ fontSize: '11px', opacity: 0.4, marginLeft: '12px' }}>v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
