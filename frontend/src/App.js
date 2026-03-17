import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://devops-roadmap-backend.onrender.com';

const SECTIONS_ORDER = [
  'Linux Temelleri',
  'Versiyon Kontrolü',
  'Container & Docker',
  'CI/CD Pipeline',
  'Altyapı Otomasyonu (IaC)',
  'Bulut Platformları',
  'İzleme & Logging',
  'Güvenlik (DevSecOps)',
  'Orkestrasyon',
];

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
  if (l.includes('ileri') || l.includes('advanced')) return 'İleri';
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

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedTasks, setExpandedTasks] = useState({});
  const [subtaskInput, setSubtaskInput] = useState({});
  const [showSubtaskForm, setShowSubtaskForm] = useState({});

  useEffect(() => {
    fetch(`${API_URL}/api/tasks`)
      .then(r => r.json())
      .then(data => {
        setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError('Backend\'e bağlanılamadı. Lütfen tekrar deneyin.');
        setLoading(false);
      });
  }, []);

  const toggleTask = async (task) => {
    const updated = tasks.map(t =>
      t.id === task.id ? { ...t, completed: !t.completed } : t
    );
    setTasks(updated);
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
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

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
        : t
    ));
    setSubtaskInput(prev => ({ ...prev, [taskId]: '' }));
    setShowSubtaskForm(prev => ({ ...prev, [taskId]: false }));

    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const created = await res.json();
      // Replace temp with real
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === tempId ? created : st) }
          : t
      ));
    } catch {
      // Rollback
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== tempId) }
          : t
      ));
    }
  };

  const toggleSubtask = async (taskId, subtask) => {
    const newCompleted = !subtask.completed;
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtask.id ? { ...st, completed: newCompleted } : st) }
        : t
    ));
    try {
      await fetch(`${API_URL}/api/subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });
    } catch {
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtask.id ? { ...st, completed: subtask.completed } : st) }
          : t
      ));
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    const prev = tasks;
    setTasks(p => p.map(t =>
      t.id === taskId
        ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) }
        : t
    ));
    try {
      await fetch(`${API_URL}/api/subtasks/${subtaskId}`, { method: 'DELETE' });
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

  // Progress: tasks + subtasks
  const allSubtasks = tasks.flatMap(t => t.subtasks || []);
  const totalItems = tasks.length + allSubtasks.length;
  const doneItems = tasks.filter(t => t.completed).length + allSubtasks.filter(st => st.completed).length;
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // Stats row still shows task-level counts
  const doneCount = tasks.filter(t => t.completed).length;
  const total = tasks.length;

  return (
    <div className="app">
      <div className="grid-bg" />
      <div className="content">
        <div className="header">
          <span className="brand-tag">// ÖĞRENME YOLCULUĞU</span>
          <h1 className="brand-title">DevOps <span>Roadmap</span></h1>
          <p className="brand-sub">Sıfırdan üretim ortamına — her görevi tamamla, her adımda büyü</p>
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
            <span className="progress-label">GENEL İLERLEME</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
        </div>

        <div className="tabs">
          {[
            { key: 'all', label: `Tümü (${total})` },
            { key: 'todo', label: `Yapılacak (${total - doneCount})` },
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

        {loading && (
          <div className="loading-screen">
            <div className="spinner" />
            Backend'e bağlanıyor...
          </div>
        )}

        {error && <div className="error-box">⚠ {error}</div>}

        {!loading && !error && Object.keys(grouped).length === 0 && (
          <div className="empty-state">// Bu filtrede görev bulunamadı</div>
        )}

        {!loading && Object.entries(grouped).map(([section, sectionTasks]) => {
          const sectionSubs = sectionTasks.flatMap(t => t.subtasks || []);
          const sectionTotal = sectionTasks.length + sectionSubs.length;
          const sectionDone = sectionTasks.filter(t => t.completed).length + sectionSubs.filter(st => st.completed).length;

          return (
            <div className="section" key={section}>
              <div className="section-label">
                {section}
                <span className="section-count">
                  {sectionDone}/{sectionTotal}
                </span>
              </div>
              {sectionTasks.map(task => {
                const subtasks = task.subtasks || [];
                const isExpanded = expandedTasks[task.id];
                const subDone = subtasks.filter(st => st.completed).length;

                return (
                  <div className="task-wrapper" key={task.id}>
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
                      <div className="task-tags">
                        <span className={`badge ${getLevelClass(task.level || task.difficulty)}`}>
                          {getLevelLabel(task.level || task.difficulty)}
                        </span>
                      </div>
                      <button
                        className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                        title={isExpanded ? 'Kapat' : 'Alt görevler'}
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="subtask-area">
                        {subtasks.map(st => (
                          <div key={st.id} className={`subtask ${st.completed ? 'done' : ''}`}>
                            <div
                              className="chk"
                              onClick={() => toggleSubtask(task.id, st)}
                            >
                              {st.completed ? '✓' : ''}
                            </div>
                            <span className="subtask-name">{st.title}</span>
                            <button
                              className="subtask-delete-btn"
                              onClick={() => deleteSubtask(task.id, st.id)}
                              title="Sil"
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        {showSubtaskForm[task.id] ? (
                          <div className="subtask-form">
                            <input
                              className="subtask-input"
                              type="text"
                              placeholder="Alt görev başlığı..."
                              value={subtaskInput[task.id] || ''}
                              onChange={(e) => setSubtaskInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') createSubtask(task.id);
                                if (e.key === 'Escape') toggleSubtaskForm(task.id);
                              }}
                              autoFocus
                            />
                            <button className="subtask-create-btn" onClick={() => createSubtask(task.id)}>
                              Create
                            </button>
                            <button className="subtask-cancel-btn" onClick={() => toggleSubtaskForm(task.id)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="add-subtask-btn" onClick={() => toggleSubtaskForm(task.id)}>
                            + Alt görev ekle
                          </button>
                        )}
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
