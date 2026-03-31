import React from 'react';

const FailuresPage = () => {
  const failures = [
    { date: '2024-03-15', device: 'Стрелка С-124', cause: 'Износ механизма', severity: 'high', duration: 45 },
    { date: '2024-03-14', device: 'Светофор С-45', cause: 'Сбой питания', severity: 'medium', duration: 20 },
    { date: '2024-03-13', device: 'Рельсовая цепь', cause: 'Короткое замыкание', severity: 'high', duration: 120 },
    { date: '2024-03-12', device: 'Подстанция ТП-56', cause: 'Перегрузка', severity: 'medium', duration: 35 },
    { date: '2024-03-11', device: 'Автоблокировка', cause: 'Сбой ПО', severity: 'low', duration: 15 }
  ];

  const getSeverityStyle = (severity) => {
    switch(severity) {
      case 'high': return { color: '#ff5252', text: '🔴 Высокий' };
      case 'medium': return { color: '#ffb74d', text: '🟡 Средний' };
      case 'low': return { color: '#4caf50', text: '🟢 Низкий' };
      default: return { color: '#666', text: 'Неизвестно' };
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Причины отказов</h1>
      
      <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ background: '#ff5252', padding: '15px', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div>Высокий уровень</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>2</div>
        </div>
        <div style={{ background: '#ffb74d', padding: '15px', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div>Средний уровень</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>2</div>
        </div>
        <div style={{ background: '#4caf50', padding: '15px', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div>Низкий уровень</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>1</div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: '#1e3c5c', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Дата</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Устройство</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Причина</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Уровень</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Длительность (мин)</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((failure, idx) => {
              const severity = getSeverityStyle(failure.severity);
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{failure.date}</td>
                  <td style={{ padding: '12px' }}>{failure.device}</td>
                  <td style={{ padding: '12px' }}>{failure.cause}</td>
                  <td style={{ padding: '12px', color: severity.color }}>{severity.text}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{failure.duration}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '30px', background: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
        <h3>💡 Рекомендации</h3>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Провести плановое ТО стрелочных переводов</li>
          <li>Проверить систему питания светофоров</li>
          <li>Обновить ПО автоблокировки</li>
        </ul>
      </div>
    </div>
  );
};

export default FailuresPage;