import React from 'react';

const KPIPage = () => {
  const stats = {
    stations: 245,
    routes: 128,
    distance: 3420,
    reliability: 94.2,
    failures: 38,
    avgSpeed: 58.5
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Ключевые показатели (KPI)</h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        <div style={{ background: '#1e3c5c', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <div>🚉 Станции</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.stations}</div>
        </div>
        
        <div style={{ background: '#2c5270', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <div>🛤️ Маршруты</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.routes}</div>
        </div>
        
        <div style={{ background: '#ff7b2c', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <div>📏 Длина (км)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.distance}</div>
        </div>
        
        <div style={{ background: '#4caf50', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <div>✅ Надежность</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.reliability}%</div>
        </div>
        
        <div style={{ background: '#ff5252', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <div>⚠️ Отказы</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.failures}</div>
        </div>
        
        <div style={{ background: '#2196f3', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <div>⚡ Средняя скорость</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.avgSpeed} км/ч</div>
        </div>
      </div>
    </div>
  );
};

export default KPIPage;