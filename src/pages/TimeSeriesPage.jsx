import React from 'react';

const TimeSeriesPage = () => {
  const data = [
    { month: 'Янв', failures: 12, delays: 45 },
    { month: 'Фев', failures: 10, delays: 38 },
    { month: 'Мар', failures: 15, delays: 52 },
    { month: 'Апр', failures: 8, delays: 35 },
    { month: 'Май', failures: 11, delays: 42 },
    { month: 'Июн', failures: 9, delays: 40 }
  ];

  const maxFailures = Math.max(...data.map(d => d.failures));
  const maxDelays = Math.max(...data.map(d => d.delays));

  return (
    <div style={{ padding: '20px' }}>
      <h1>Временные ряды</h1>
      <p style={{ marginBottom: '30px', color: '#666' }}>Динамика отказов и задержек по месяцам</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#ff5252', padding: '15px', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div>Максимум отказов</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{maxFailures}</div>
          <div>в марте</div>
        </div>
        <div style={{ background: '#ffb74d', padding: '15px', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div>Максимум задержек</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{maxDelays} мин</div>
          <div>в марте</div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: '#1e3c5c', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Месяц</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Отказы</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Задержки (мин)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item.month}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#ff5252' }}>{item.failures}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#ffb74d' }}>{item.delays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '30px', background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
        <h3>📈 Тенденции</h3>
        <p>Среднее количество отказов: <strong>{(data.reduce((sum, d) => sum + d.failures, 0) / data.length).toFixed(1)}</strong></p>
        <p>Среднее время задержек: <strong>{(data.reduce((sum, d) => sum + d.delays, 0) / data.length).toFixed(1)} мин</strong></p>
        <p style={{ marginTop: '10px' }}>Наилучший месяц: <strong>апрель</strong> (8 отказов, 35 мин задержек)</p>
      </div>
    </div>
  );
};

export default TimeSeriesPage;