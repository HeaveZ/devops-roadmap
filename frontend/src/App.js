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

  const filtered = tasks.filter(t => {
    if (filter === 'done') return t.completed;
    if (filter === 'todo') return !t.completed;
    return true;
  });

  const grouped = groupBySection(filtered);
  const doneCount = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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

        {!loading && Object.entries(grouped).map(([section, sectionTasks]) => (
          <div className="section" key={section}>
            <div className="section-label">
              {section}
              <span className="section-count">
                {sectionTasks.filter(t => t.completed).length}/{sectionTasks.length}
              </span>
            </div>
            {sectionTasks.map(task => (
              <div
                key={task.id}
                className={`task ${task.completed ? 'done' : ''}`}
                onClick={() => toggleTask(task)}
              >
                <div className="chk">{task.completed ? '✓' : ''}</div>
                <span className="task-name">{task.title || task.name}</span>
                <div className="task-tags">
                  <span className={`badge ${getLevelClass(task.level || task.difficulty)}`}>
                    {getLevelLabel(task.level || task.difficulty)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}

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
