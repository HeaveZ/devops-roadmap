import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://devops-roadmap-backend.onrender.com';

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

  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem('devops_token') || '');
  const [username, setUsername] = useState(() => localStorage.getItem('devops_username') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('devops_token'));
  const [avatarData, setAvatarData] = useState(() => localStorage.getItem('devops_avatar') || '');
  const fileInputRef = useRef(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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
    setShowComments(prev => ({ ...prev, [taskId]: !prev[taskId] }));
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

  const grouped = groupBySection(filtered);
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

      <div className="content">
        <div className="header">
          <div className="header-top">
            <div className="header-left">
              <span className="brand-tag">// OGRENME YOLCULUGU</span>
              <h1 className="brand-title">DevOps <span>Roadmap</span></h1>
              <p className="brand-sub">Sifirdan uretim ortamina - her gorevi tamamla, her adimda buyu</p>
            </div>
            {username && isLoggedIn && (
              <div className="user-badge-area">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
                <div className="user-badge">
                  <span className="user-avatar" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }} title="Profil resmi yukle">
                    {avatarData ? <img src={avatarData} alt="avatar" /> : username.charAt(0).toUpperCase()}
                  </span>
                  <button className="avatar-upload-btn" onClick={() => fileInputRef.current.click()} title="Profil resmi yukle">
                    📷
                  </button>
                  <span className="user-name">{username}</span>
                  <span className="logout-icon" onClick={handleLogout} title="Cikis yap">↗</span>
                </div>
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

        <div className="footer-bar">
          <span className="footer-text">
            <span className="online-dot" />
            API · <a href={API_URL} target="_blank" rel="noreferrer">devops-roadmap-backend.onrender.com</a>
          </span>
          <span className="footer-text">PostgreSQL · Frankfurt (EU)</span>
        </div>
        <div className="created-by">created by HeaveZ :)</div>
      </div>
    </div>
  );
}
