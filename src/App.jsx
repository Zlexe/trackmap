import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MapPage from './pages/MapPage';
import KPIPage from './pages/KPIPage';
import ParetoPage from './pages/ParetoPage';
import TimeSeriesPage from './pages/TimeSeriesPage';
import DevicesPage from './pages/DevicesPage';
import FailuresPage from './pages/FailuresPage';
import './App.css';

function App() {
  const menuItems = [
    { path: '/', name: 'Ключевые показатели (KPI)', icon: '📊' },
    { path: '/pareto', name: 'Парето-анализ', icon: '📈' },
    { path: '/timeseries', name: 'Временные ряды', icon: '📅' },
    { path: '/devices', name: 'Детализация по устройствам', icon: '🔧' },
    { path: '/failures', name: 'Причины отказов', icon: '⚠️' },
    { path: '/map', name: 'Карта', icon: '🗺️' }
  ];

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <h2>🚂 ЗСЖД</h2>
            <p>Мониторинг</p>
          </div>
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path}>
                  <span className="icon">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <main className="content">
          <Routes>
            <Route path="/" element={<KPIPage />} />
            <Route path="/pareto" element={<ParetoPage />} />
            <Route path="/timeseries" element={<TimeSeriesPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/failures" element={<FailuresPage />} />
            <Route path="/map" element={<MapPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;