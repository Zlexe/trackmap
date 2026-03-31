import React, { useState } from 'react';

const DevicesPage = () => {
  const [filter, setFilter] = useState('all');
  
  const devices = [
    { name: 'Стрелка С-124', type: 'Стрелка', location: 'Новосибирск', status: 'normal', failures: 2 },
    { name: 'Светофор С-45', type: 'Светофор', location: 'Омск', status: 'warning', failures: 5 },
    { name: 'Рельсовая цепь', type: 'Цепь', location: 'Томск', status: 'error', failures: 8 },
    { name: 'Подстанция ТП-56', type: 'Подстанция', location: 'Кемерово', status: 'normal', failures: 1 },
    { name: 'Автоблокировка', type: 'Блокировка', location: 'Барнаул', status: 'warning', failures: 3 }
  ];

  const filteredDevices = filter === 'all' ? devices : devices.filter(d => d.status === filter);
  
  const getStatusStyle = (status) => {
    switch(status) {
      case 'normal': return { color: '#4caf50', text: '✅ Норма' };
      case 'warning': return { color: '#ffb74d', text: '⚠️ Внимание' };
      case 'error': return { color: '#ff5252', text: '❌ Отказ' };
      default: return { color: '#666', text: 'Неизвестно' };
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Детализация по устройствам</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '8px 16px', background: filter === 'all' ? '#ff7b2c' : '#2c5270', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Все</button>
        <button onClick={() => setFilter('normal')} style={{ padding: '8px 16px', background: filter === 'normal' ? '#ff7b2c' : '#2c5270', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Норма</button>
        <button onClick={() => setFilter('warning')} style={{ padding: '8px 16px', background: filter === 'warning' ? '#ff7b2c' : '#2c5270', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Внимание</button>
        <button onClick={() => setFilter('error')} style={{ padding: '8px 16px', background: filter === 'error' ? '#ff7b2c' : '#2c5270', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Отказ</button>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: '#1e3c5c', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Устройство</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Тип</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Расположение</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Статус</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Отказов</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((device, idx) => {
              const status = getStatusStyle(device.status);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{device.name}</td>
                  <td style={{ padding: '12px' }}>{device.type}</td>
                  <td style={{ padding: '12px' }}>{device.location}</td>
                  <td style={{ padding: '12px', color: status.color }}>{status.text}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{device.failures}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DevicesPage;