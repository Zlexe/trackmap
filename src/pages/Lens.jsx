// pages/Lens.jsx
import DATALENS_CONFIG from '../config/datalens';

export function Lens() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0f1a'
    }}>
      <iframe 
        frameBorder="0" 
        width="100%" 
        height="100%" 
        src={DATALENS_CONFIG.failuresDashboard}
        title="DataLens Dashboard - Отказы ОТС и ALSN"
        style={{ 
          border: 'none',
          borderRadius: '12px'
        }}
      />
    </div>
  );
}