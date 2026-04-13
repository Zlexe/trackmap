import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import MapPage from './pages/MapPage';
import './App.css';
import { Lens } from './pages/Lens';

// Компонент для подсветки активной ссылки
const MenuItem = ({ to, icon, name, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/' && location.pathname === '/lens');
  
  return (
    <li>
      <Link to={to} className={isActive ? 'active' : ''} onClick={onClick}>
        <span className="icon">{icon}</span>
        <span>{name}</span>
      </Link>
    </li>
  );
};

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { path: '/', name: 'Дашборд', icon: '📊' },
    { path: '/map', name: 'Карта', icon: '🗺️' }
  ];

  // Закрываем меню при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Блокируем скролл body при открытом мобильном меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const closeMenu = () => {
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  return (
    <BrowserRouter>
      <div className="app">
        {/* Кнопка для мобильного меню */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Меню"
        >
          ☰
        </button>
        
        <nav className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="logo">
            <h2>🚂 ЗСЖД</h2>
            <p>Мониторинг</p>
          </div>
          <ul>
            {menuItems.map((item) => (
              <MenuItem 
                key={item.path}
                to={item.path} 
                icon={item.icon} 
                name={item.name}
                onClick={closeMenu}
              />
            ))}
          </ul>
        </nav>
        
        {/* Оверлей для мобильного меню */}
        {isMobileMenuOpen && (
          <div 
            className="mobile-overlay"
            onClick={closeMenu}
          />
        )}
        
        <main className="content" onClick={closeMenu}>
          <Routes>
            <Route path="/" element={<Lens />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/lens" element={<Lens />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;