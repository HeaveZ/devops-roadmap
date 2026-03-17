import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = 'https://devops-roadmap-backend.onrender.com';

const SECTION_ICONS = {
  "Linux & OS": "🐧",
  Networking: "🌐",
  "Git & VCS": "📦",
  "CI/CD": "🔄",
  Containers: "🐳",
  Orchestration: "☸️",
  Cloud: "☁️",
  IaC: "🏗️",
  Monitoring: "📊",
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(API_URL);
      setTasks(res.data);
    } catch (err) {
      console.error("Görevler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (id, currentStatus) => {
    try {
      const res = await axios.patch(`${API_URL}/${id}`, {
        completed: !currentStatus,
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    } catch (err) {
      console.error("Görev güncellenemedi:", err);
    }
  };

  const grouped = tasks.reduce((acc, task) => {
    if (!acc[task.section]) acc[task.section] = [];
    acc[task.section].push(task);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).reduce(
    (acc, [section, sectionTasks]) => {
      const filtered = sectionTasks.filter((t) => {
        if (filter === "done") return t.completed;
        if (filter === "todo") return !t.completed;
        return true;
      });
      if (filtered.length > 0) acc[section] = filtered;
      return acc;
    },
    {}
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>DevOps Roadmap</h1>
        <p className="subtitle">Adim adim DevOps yolculugun</p>
      </header>

      <div className="progress-container">
        <div className="progress-info">
          <span>Ilerleme</span>
          <span>
            {completedTasks} / {totalTasks} gorev ({progress}%)
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="filter-bar">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          Tumu ({totalTasks})
        </button>
        <button
          className={filter === "todo" ? "active" : ""}
          onClick={() => setFilter("todo")}
        >
          Yapilacak ({totalTasks - completedTasks})
        </button>
        <button
          className={filter === "done" ? "active" : ""}
          onClick={() => setFilter("done")}
        >
          Tamamlanan ({completedTasks})
        </button>
      </div>

      <div className="sections">
        {Object.entries(filteredGrouped).map(([section, sectionTasks]) => {
          const sectionDone = sectionTasks.filter((t) => t.completed).length;
          const sectionTotal = grouped[section]?.length || sectionTasks.length;
          return (
            <div key={section} className="section">
              <div className="section-header">
                <h2>
                  {SECTION_ICONS[section] || "📌"} {section}
                </h2>
                <span className="section-count">
                  {sectionDone}/{sectionTotal}
                </span>
              </div>
              <div className="task-list">
                {sectionTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-card ${task.completed ? "completed" : ""}`}
                    onClick={() => toggleTask(task.id, task.completed)}
                  >
                    <div className="checkbox">
                      {task.completed ? "✅" : "⬜"}
                    </div>
                    <span className="task-title">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(filteredGrouped).length === 0 && (
        <div className="empty-state">
          {filter === "done"
            ? "Henuz tamamlanan gorev yok. Hadi basla!"
            : "Tum gorevler tamamlandi! Harikasin!"}
        </div>
      )}
    </div>
  );
}

export default App;
