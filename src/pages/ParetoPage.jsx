import React from 'react';

const ParetoPage = () => {
  const data = [
    { cause: 'Износ оборудования', count: 45, percent: 32 },
    { cause: 'Человеческий фактор', count: 32, percent: 23 },
    { cause: 'Погодные условия', count: 28, percent: 20 },
    { cause: 'Сбои ПО', count: 15, percent: 11 },
    { cause: 'Питание', count: 12, percent: 9 },
    { cause: 'Прочее', count: 8, percent: 5 }
  ];

  let cumulative = 0;
  const dataWithCumulative = data.map(item => {
    cumulative += item.percent;
    return { ...item, cumulative };
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>Парето-анализ (80/20)</h1>
      <p style={{ marginBottom: '30px', color: '#666' }}>80% проблем вызваны 20% причин</p>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: '#1e3c5c', color: 'white' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Причина</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Количество</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Доля %</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Накоплено %</th>
            </tr>
          </thead>
          <tbody>
            {dataWithCumulative.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{item.cause}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{item.count}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{item.percent}%</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: item.cumulative <= 80 ? 'bold' : 'normal', color: item.cumulative <= 80 ? '#ff7b2c' : '#666' }}>
                  {item.cumulative}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: '30px', background: '#e8f5e9', padding: '20px', borderRadius: '8px' }}>
        <h3>📊 Рекомендации</h3>
        <p>Основное внимание уделить устранению:</p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Износ оборудования (32% проблем)</li>
          <li>Человеческий фактор (23% проблем)</li>
          <li>Погодные условия (20% проблем)</li>
        </ul>
        <p style={{ marginTop: '10px' }}>Это позволит решить <strong>75%</strong> всех проблем.</p>
      </div>
    </div>
  );
};

export default ParetoPage;