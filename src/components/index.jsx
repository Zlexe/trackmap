import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './RailwayMap.css';

const REGION_BOUNDS = {
  minLat: 51.515905,
  maxLat: 58.278014,
  minLng: 71.261348,
  maxLng: 88.021917
};

const colorPalette = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#98D8C8', '#F7D794', '#F3A683', '#778beb', '#e77f67', '#63cdda',
  '#f5cd79', '#ea868f', '#596275', '#f7b731', '#786fa6', '#f3a683'
];

const riskColors = {
  critical: '#FF0000',
  high: '#FF4500',
  medium: '#FFA500',
  low: '#FFD700',
  minimal: '#90EE90'
};

const heatmapColors = [
  '#3b82f6',
  '#4c9aff',
  '#5db0ff',
  '#ffa64c',
  '#ff7b2c',
  '#ff4500',
  '#ff0000'
];

import { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
registerLocale('ru', ru);

const RailwayMap = () => {
  const [map, setMap] = useState(null);
  const [currentMapType, setCurrentMapType] = useState('scheme');
  
  const [allStations, setAllStations] = useState([]);
  const [csvLines, setCsvLines] = useState([]);
  const [geojsonLines, setGeojsonLines] = useState([]);
  const [autoLines, setAutoLines] = useState([]);
  
  const [failuresData, setFailuresData] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [filterMode, setFilterMode] = useState('single');
  const [filteredFailures, setFilteredFailures] = useState([]);
  
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedQuarters, setSelectedQuarters] = useState([]);
  
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [availableDevices, setAvailableDevices] = useState([]);
  const [showDeviceFilter, setShowDeviceFilter] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(null);
  const [showRiskFilter, setShowRiskFilter] = useState(false);
  
  const [selectedShch, setSelectedShch] = useState(new Set());
  const [selectedStations, setSelectedStations] = useState(new Set());
  const [showCsvLinesFlag, setShowCsvLinesFlag] = useState(true);
  const [showGeojsonFlag, setShowGeojsonFlag] = useState(true);
  const [showAutoLinesFlag, setShowAutoLinesFlag] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [stationSearch, setStationSearch] = useState('');
  const [status, setStatus] = useState({ message: '📁 Загрузите файлы для отображения данных', isError: false });
  const [progress, setProgress] = useState({ show: false, percent: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedStationDetails, setSelectedStationDetails] = useState(null);
  const [stationFailuresHistory, setStationFailuresHistory] = useState([]);
  
  const shchColors = useRef({});
  const colorIndex = useRef(0);
  
  const stationPlacemarks = useRef([]);
  const csvLineObjects = useRef([]);
  const geojsonLineObjects = useRef([]);
  const autoLineObjects = useRef([]);
  const failurePlacemarks = useRef([]);
  
  const mapInitialized = useRef(false);

  const isPointInRegion = useCallback((lat, lng) => {
    return lat >= REGION_BOUNDS.minLat && lat <= REGION_BOUNDS.maxLat &&
           lng >= REGION_BOUNDS.minLng && lng <= REGION_BOUNDS.maxLng;
  }, []);

  const getRiskLevel = useCallback((device) => {
    const text = (device || '').toLowerCase();
    if (text.includes('стрелка') || text.includes('светофор') || text.includes('централизация')) return 'high';
    if (text.includes('аппаратура') || text.includes('реле') || text.includes('питание') || text.includes('кабель')) return 'medium';
    if (text.includes('монтаж') || text.includes('настройка')) return 'low';
    if (text.includes('крушение') || text.includes('авария') || text.includes('пожар')) return 'critical';
    return 'minimal';
  }, []);

  const getRiskLevelText = (level) => {
    const levels = {
      critical: 'КРИТИЧЕСКИЙ 🔴',
      high: 'ВЫСОКИЙ 🟠',
      medium: 'СРЕДНИЙ 🟡',
      low: 'НИЗКИЙ 🟢',
      minimal: 'МИНИМАЛЬНЫЙ 🔵'
    };
    return levels[level] || 'НЕИЗВЕСТНЫЙ';
  };

  const getRiskColor = (riskLevel) => {
    const colors = {
      critical: '#FF0000',
      high: '#FF4500',
      medium: '#FFA500',
      low: '#FFD700',
      minimal: '#90EE90'
    };
    return colors[riskLevel] || '#FF0000';
  };

  const getColorForShch = useCallback((shch) => {
    if (!shchColors.current[shch]) {
      shchColors.current[shch] = colorPalette[colorIndex.current % colorPalette.length];
      colorIndex.current = (colorIndex.current + 1) % colorPalette.length;
    }
    return shchColors.current[shch];
  }, []);

  const showStatus = useCallback((message, isError = false, duration = 4000) => {
    setStatus({ message, isError });
    setTimeout(() => {
      setStatus(prev => prev.message === message ? { message: prev.message, isError: false } : prev);
    }, duration);
  }, []);

  const showProgress = useCallback((show, percent = 0) => {
    setProgress({ show, percent });
  }, []);

  const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    
    if (t < 0) return Math.hypot(px - x1, py - y1);
    if (t > 1) return Math.hypot(px - x2, py - y2);
    
    const ix = x1 + t * dx;
    const iy = y1 + t * dy;
    return Math.hypot(px - ix, py - iy);
  };

  const getSegmentColor = (count, maxCount) => {
    if (count === 0) return heatmapColors[0];
    const ratio = Math.min(count / maxCount, 1);
    const colorIndex = Math.floor(ratio * (heatmapColors.length - 1));
    return heatmapColors[colorIndex];
  };

  const calculateSegmentFailures = useCallback(() => {
    const counts = new Map();
    
    if (geojsonLines.length === 0 || filteredFailures.length === 0) return counts;
    
    filteredFailures.forEach(failure => {
      const station = allStations.find(s => 
        s.name.toLowerCase().includes(failure.station?.toLowerCase()) ||
        failure.station?.toLowerCase().includes(s.name.toLowerCase())
      );
      
      if (!station) return;
      
      let minDistance = Infinity;
      let closestKey = null;
      
      geojsonLines.forEach((line, lineIdx) => {
        for (let i = 0; i < line.points.length - 1; i++) {
          const p1 = line.points[i];
          const p2 = line.points[i + 1];
          const distance = pointToSegmentDistance(station.lat, station.lng, p1[0], p1[1], p2[0], p2[1]);
          
          if (distance < minDistance && distance < 5000) {
            minDistance = distance;
            closestKey = `${lineIdx}_${i}`;
          }
        }
      });
      
      if (closestKey) {
        counts.set(closestKey, (counts.get(closestKey) || 0) + 1);
      }
    });
    
    return counts;
  }, [geojsonLines, filteredFailures, allStations]);

  const showStationDetails = useCallback((stationName) => {
    let station = allStations.find(s => s.name === stationName);
    if (!station) {
      station = allStations.find(s => s.name.toLowerCase() === stationName.toLowerCase());
    }
    if (!station) {
      station = allStations.find(s => s.name.toLowerCase().includes(stationName.toLowerCase()) || 
                                   stationName.toLowerCase().includes(s.name.toLowerCase()));
    }
    
    if (!station) {
      showStatus(`⚠️ Станция "${stationName}" не найдена в базе`, true, 3000);
      return;
    }
    
    const stationFailures = failuresData.filter(f => {
      if (!f.station) return false;
      const fStation = f.station.toLowerCase();
      const sName = station.name.toLowerCase();
      return fStation.includes(sName) || sName.includes(fStation);
    });
    
    const sortedFailures = [...stationFailures].sort((a, b) => {
      const dateA = new Date(a.date.split('.').reverse().join('-'));
      const dateB = new Date(b.date.split('.').reverse().join('-'));
      return dateB - dateA;
    });
    
    setStationFailuresHistory(sortedFailures);
    setSelectedStationDetails(station);
  }, [allStations, failuresData, showStatus]);

  const closeStationDetails = () => {
    setSelectedStationDetails(null);
    setStationFailuresHistory([]);
  };

  useEffect(() => {
    window.showStationDetails = (stationName) => {
      setTimeout(() => showStationDetails(stationName), 0);
    };
    return () => {
      delete window.showStationDetails;
    };
  }, [showStationDetails]);

  const clearAllObjects = useCallback(() => {
    if (!map) return;
    stationPlacemarks.current.forEach(p => map.geoObjects.remove(p));
    csvLineObjects.current.forEach(l => map.geoObjects.remove(l));
    geojsonLineObjects.current.forEach(l => map.geoObjects.remove(l));
    autoLineObjects.current.forEach(l => map.geoObjects.remove(l));
    failurePlacemarks.current.forEach(p => map.geoObjects.remove(p));
    
    stationPlacemarks.current = [];
    csvLineObjects.current = [];
    geojsonLineObjects.current = [];
    autoLineObjects.current = [];
    failurePlacemarks.current = [];
  }, [map]);

  const renderRailways = useCallback(() => {
    if (!map) return;
    
    clearAllObjects();

    const filteredStations = allStations.filter(station => {
      if (selectedShch.size > 0 && !selectedShch.has(station.shch)) return false;
      if (selectedStations.size > 0 && !selectedStations.has(station.name)) return false;
      return true;
    });

    console.log('Отрисовка станций:', filteredStations.length);
    
    filteredStations.forEach(station => {
      const color = getColorForShch(station.shch);
      const placemark = new window.ymaps.Placemark([station.lat, station.lng], {
        balloonContent: `
          <div style="max-width: 350px;">
            <b style="font-size: 14px;">${station.name}</b><br>
            <span style="color: ${color}">●</span> Участок: ${station.shch}<br>
            📍 Координаты: ${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}<br>
            <hr style="margin: 8px 0;">
            <button 
              onclick="window.showStationDetails('${station.name.replace(/'/g, "\\'")}')" 
              style="width: 100%; padding: 8px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; margin-top: 5px;">
              📊 Подробная информация об отказах
            </button>
          </div>
        `,
        hintContent: station.name
      }, {
        preset: 'islands#circleIcon',
        iconColor: color,
        iconContent: '🚉'
      });
      map.geoObjects.add(placemark);
      stationPlacemarks.current.push(placemark);
    });

    if (showCsvLinesFlag) {
      console.log('Отрисовка CSV линий:', csvLines.length);
      csvLines.forEach(line => {
        if (selectedShch.size === 0 || selectedShch.has(line.shch)) {
          const polyline = new window.ymaps.Polyline(line.points, {
            balloonContent: `<b>Линия: ${line.id}</b><br>Участок: ${line.shch}`
          }, {
            strokeColor: line.color,
            strokeWidth: 3,
            strokeOpacity: 0.8
          });
          map.geoObjects.add(polyline);
          csvLineObjects.current.push(polyline);
        }
      });
    }

    if (showGeojsonFlag && geojsonLines.length > 0) {
      console.log('Отрисовка GeoJSON линий с тепловой картой:', geojsonLines.length);
      
      const segmentCounts = calculateSegmentFailures();
      const maxCount = Math.max(...Array.from(segmentCounts.values()), 1);
      
      geojsonLines.forEach((line, lineIdx) => {
        if (selectedShch.size === 0 || selectedShch.has(line.shch)) {
          let lineFailureCount = 0;
          for (let i = 0; i < line.points.length - 1; i++) {
            lineFailureCount += segmentCounts.get(`${lineIdx}_${i}`) || 0;
          }
          
          const lineColor = getSegmentColor(lineFailureCount, maxCount);
          
          const polyline = new window.ymaps.Polyline(line.points, {
            balloonContent: `
              <b>GeoJSON линия</b><br>
              Участок: ${line.shch}<br>
              <span style="color: ${lineColor}">●</span> Количество отказов: ${lineFailureCount}
            `,
            hintContent: `Отказов на линии: ${lineFailureCount}`
          }, {
            strokeColor: lineColor,
            strokeWidth: 3,
            strokeOpacity: 0.8
          });
          
          map.geoObjects.add(polyline);
          geojsonLineObjects.current.push(polyline);
        }
      });
    }

    if (showAutoLinesFlag) {
      autoLines.forEach(line => {
        if (selectedShch.size === 0 || selectedShch.has(line.shch)) {
          const polyline = new window.ymaps.Polyline(line.points, {
            balloonContent: `<b>Авто-линия</b><br>Участок: ${line.shch}`
          }, {
            strokeColor: '#00ff88',
            strokeWidth: 2,
            strokeOpacity: 0.6,
            strokeStyle: 'shortDash'
          });
          map.geoObjects.add(polyline);
          autoLineObjects.current.push(polyline);
        }
      });
    }
  }, [map, allStations, selectedShch, selectedStations, showCsvLinesFlag, showGeojsonFlag, showAutoLinesFlag, csvLines, geojsonLines, autoLines, getColorForShch, clearAllObjects, calculateSegmentFailures]);

  const renderFailures = useCallback(() => {
    if (!map) return;
    
    failurePlacemarks.current.forEach(p => map.geoObjects.remove(p));
    failurePlacemarks.current = [];
    
    if (!filteredFailures.length) return;
    
    console.log('Отрисовка отказов:', filteredFailures.length);
    
    const failuresByStation = new Map();
    
    filteredFailures.forEach(failure => {
      const station = allStations.find(s => 
        s.name.toLowerCase().includes(failure.station?.toLowerCase()) ||
        failure.station?.toLowerCase().includes(s.name.toLowerCase())
      );
      const stationName = station ? station.name : failure.station;
      if (!failuresByStation.has(stationName)) {
        failuresByStation.set(stationName, []);
      }
      failuresByStation.get(stationName).push(failure);
    });
    
    failuresByStation.forEach((failures, stationName) => {
      const station = allStations.find(s => s.name === stationName);
      let lat, lng;
      
      if (station) {
        lat = station.lat;
        lng = station.lng;
      } else if (failures[0].lat && failures[0].lng) {
        lat = failures[0].lat;
        lng = failures[0].lng;
      } else {
        return;
      }
      
      const maxRiskLevel = failures.reduce((max, f) => {
        const risk = getRiskLevel(f.device);
        const riskOrder = { critical: 5, high: 4, medium: 3, low: 2, minimal: 1 };
        return riskOrder[risk] > (riskOrder[max] || 0) ? risk : max;
      }, 'minimal');
      
      const uniqueDevices = [...new Set(failures.map(f => f.device).filter(d => d && d !== 'Не указано'))];
      const riskColor = getRiskColor(maxRiskLevel);
      
      const placemark = new window.ymaps.Placemark([lat, lng], {
        balloonContent: `
          <div style="max-width: 400px; max-height: 450px; overflow-y: auto;">
            <b style="color: #FF6B6B; font-size: 14px;">⚠️ Отказы на станции ${stationName}</b><br/>
            <hr/>
            <b>📊 Всего отказов:</b> ${failures.length}<br/>
            <b>⚠️ Уровень риска:</b> ${getRiskLevelText(maxRiskLevel)}<br/>
            <b>🔧 Устройства:</b> ${uniqueDevices.slice(0, 5).join(', ')}${uniqueDevices.length > 5 ? '...' : ''}<br/>
            <b>🏢 Подразделение:</b> ${failures[0]?.department || 'Не указано'}<br/>
            <hr/>
            <details open>
              <summary style="cursor: pointer; color: #3b82f6; font-weight: bold;">📋 Список всех отказов (${failures.length})</summary>
              <div style="margin-top: 10px; max-height: 300px; overflow-y: auto;">
                ${failures.slice(0, 50).map(f => `
                  <div style="margin-bottom: 10px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid ${riskColors[getRiskLevel(f.device)]};">
                    <div><b>📅 Дата:</b> ${f.date}</div>
                    <div><b>📝 Устройство:</b> ${f.device || 'Не указано'}</div>
                    ${f.department ? `<div><b>🏢 Отдел:</b> ${f.department}</div>` : ''}
                    ${f.duration ? `<div><b>⏱️ Длительность:</b> ${f.duration} час.</div>` : ''}
                    <div><b>⚠️ Риск:</b> <span style="color: ${riskColors[getRiskLevel(f.device)]}">${getRiskLevelText(getRiskLevel(f.device))}</span></div>
                  </div>
                `).join('')}
                ${failures.length > 50 ? `<div style="text-align: center; padding: 10px; color: #888;"><i>... и ещё ${failures.length - 50} отказов</i></div>` : ''}
              </div>
            </details>
            <button 
              onclick="window.showStationDetails('${stationName.replace(/'/g, "\\'")}')" 
              style="margin-top: 12px; width: 100%; padding: 8px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px;">
              🔍 Открыть полную информацию по станции
            </button>
          </div>
        `,
        hintContent: `⚠️ ${stationName}: ${failures.length} отказов, ${getRiskLevelText(maxRiskLevel)}`
      }, {
        iconLayout: 'default#image',
        iconImageHref: `data:image/svg+xml;base64,${btoa(`
          <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="7" fill="${riskColor}" stroke="#FFFFFF" stroke-width="1.5"/>
            <circle cx="8" cy="8" r="3" fill="#FFFFFF" opacity="0.6"/>
          </svg>
        `)}`,
        iconImageSize: [16, 16],
        iconImageOffset: [-8, -8]
      });
      
      map.geoObjects.add(placemark);
      failurePlacemarks.current.push(placemark);
    });
  }, [map, filteredFailures, allStations, getRiskLevel]);

  useEffect(() => {
    if (mapInitialized.current) return;
    mapInitialized.current = true;
    
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=d07e771d-d1d0-4fef-bce2-cddd2f2dd789&lang=ru_RU';
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
          console.error('Элемент map не найден');
          return;
        }
        
        const newMap = new window.ymaps.Map('map', {
          center: [(REGION_BOUNDS.minLat + REGION_BOUNDS.maxLat) / 2, 
                   (REGION_BOUNDS.minLng + REGION_BOUNDS.maxLng) / 2],
          zoom: 6,
          controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
        });
        
        newMap.setBounds([
          [REGION_BOUNDS.minLat, REGION_BOUNDS.minLng],
          [REGION_BOUNDS.maxLat, REGION_BOUNDS.maxLng]
        ], { checkZoomRange: true });
        newMap.setType('yandex#map');
        
        setMap(newMap);
        console.log('Карта успешно создана');
      });
    };
    script.onerror = () => {
      console.error('Ошибка загрузки Yandex Maps API');
      showStatus('❌ Ошибка загрузки карты', true);
    };
    document.head.appendChild(script);
  }, [showStatus]);

  useEffect(() => {
    if (map) {
      renderRailways();
      renderFailures();
    }
  }, [map, allStations, csvLines, geojsonLines, autoLines, filteredFailures, selectedShch, selectedStations, showCsvLinesFlag, showGeojsonFlag, showAutoLinesFlag, renderRailways, renderFailures]);

  const getWeekDates = (date) => {
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return { startDate, endDate };
  };

  const getAvailableYears = () => {
    if (failuresData.length === 0) return [];
    const years = new Set();
    failuresData.forEach(f => {
      if (f.parsedDate) years.add(f.parsedDate.getFullYear());
    });
    return Array.from(years).sort();
  };

  const toggleMonth = (year, month) => {
    setSelectedMonths(prev => {
      const exists = prev.some(m => m.year === year && m.month === month);
      if (exists) {
        return prev.filter(m => !(m.year === year && m.month === month));
      } else {
        return [...prev, { year, month }];
      }
    });
  };

  const toggleQuarter = (year, quarter) => {
    setSelectedQuarters(prev => {
      const exists = prev.some(q => q.year === year && q.quarter === quarter);
      if (exists) {
        return prev.filter(q => !(q.year === year && q.quarter === quarter));
      } else {
        return [...prev, { year, quarter }];
      }
    });
  };

  const toggleDevice = (device) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(device)) {
        newSet.delete(device);
      } else {
        newSet.add(device);
      }
      return newSet;
    });
  };

  const clearDeviceFilter = () => {
    setSelectedDevices(new Set());
  };

  const applyDateFilter = useCallback(() => {
    if (failuresData.length === 0) {
      setFilteredFailures([]);
      return;
    }

    let filtered = [...failuresData];

    switch (filterMode) {
      case 'single':
        if (selectedDates.length > 0) {
          const selectedDatesSet = new Set(selectedDates.map(d => d.toDateString()));
          filtered = filtered.filter(failure => 
            failure.parsedDate && selectedDatesSet.has(failure.parsedDate.toDateString())
          );
        }
        break;
      
      case 'range':
      case 'week':
      case 'year':
        if (dateRange.start && dateRange.end) {
          filtered = filtered.filter(failure => 
            failure.parsedDate && failure.parsedDate >= dateRange.start && failure.parsedDate <= dateRange.end
          );
        }
        break;
      
      case 'month':
        if (selectedMonths.length > 0) {
          filtered = filtered.filter(failure => {
            if (!failure.parsedDate) return false;
            return selectedMonths.some(month => 
              failure.parsedDate.getFullYear() === month.year && 
              failure.parsedDate.getMonth() === month.month
            );
          });
        }
        break;
      
      case 'quarter':
        if (selectedQuarters.length > 0) {
          filtered = filtered.filter(failure => {
            if (!failure.parsedDate) return false;
            const year = failure.parsedDate.getFullYear();
            const month = failure.parsedDate.getMonth();
            const quarter = Math.floor(month / 3) + 1;
            return selectedQuarters.some(q => q.year === year && q.quarter === quarter);
          });
        }
        break;
      
      default:
        break;
    }

    if (selectedDevices.size > 0) {
      filtered = filtered.filter(failure => {
        if (!failure.device || failure.device === 'Не указано') return false;
        const deviceStr = String(failure.device).toLowerCase();
        return Array.from(selectedDevices).some(device => 
          deviceStr.includes(device.toLowerCase())
        );
      });
    }

    if (selectedRiskLevel) {
      filtered = filtered.filter(failure => 
        getRiskLevel(failure.device) === selectedRiskLevel
      );
    }

    setFilteredFailures(filtered);
    const countText = filtered.length === 0 ? 'нет отказов' : `${filtered.length} отказов`;
    showStatus(`📅 ${countText}`, false, 2000);
  }, [failuresData, filterMode, selectedDates, dateRange, selectedMonths, selectedQuarters, selectedDevices, selectedRiskLevel, getRiskLevel, showStatus]);

  useEffect(() => {
    applyDateFilter();
  }, [applyDateFilter]);

  const handleSingleDateChange = (date) => {
    setSelectedDates(date ? [date] : []);
    setFilterMode('single');
  };

  const handleRangeChange = (dates) => {
    const [start, end] = dates;
    setDateRange({ start, end });
    setFilterMode('range');
  };

  const handleWeekSelect = (date) => {
    if (date) {
      const { startDate, endDate } = getWeekDates(date);
      setDateRange({ start: startDate, end: endDate });
      setFilterMode('week');
    }
  };

  const handleYearSelect = (year) => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    setDateRange({ start: startDate, end: endDate });
    setFilterMode('year');
  };

  const handleAllTimeSelect = () => {
    if (failuresData.length > 0) {
      const dates = failuresData.map(f => f.parsedDate).filter(d => d);
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      setDateRange({ start: minDate, end: maxDate });
      setFilterMode('range');
    }
  };

  const clearDateFilter = () => {
    setSelectedDates([]);
    setDateRange({ start: null, end: null });
    setSelectedMonths([]);
    setSelectedQuarters([]);
    setSelectedDevices(new Set());
    setSelectedRiskLevel(null);
    setFilterMode('single');
    setFilteredFailures([]);
    showStatus('📅 Все фильтры сброшены', false, 2000);
  };

  const handleFailuresFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showStatus(`📂 Загрузка ${file.name}...`);
    showProgress(true, 0);

    Papa.parse(file, {
      header: true,
      encoding: "UTF-8",
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const failures = [];
          const devicesSet = new Set();
          const data = results.data;
          
          data.forEach((row, idx) => {
            let dateTime = row['Дата, время'] || row['Дата'] || '';
            let station = row['Станция'] || '';
            let device = row['Отказавшее тех.средство (по КАС АНТ)'] || '';
            let duration = row['Про долж.'] || '';
            let department = row['Струк. подразд.'] || '';
            let lat = row['Широта_x'] || row['Широта_y'] || null;
            let lng = row['Долгота_x'] || row['Долгота_y'] || null;
            
            if (device && device.trim()) {
              device.split(/[,;]/).forEach(d => {
                const trimmed = d.trim();
                if (trimmed && trimmed.length > 2) devicesSet.add(trimmed);
              });
            }
            
            let parsedDate = null;
            let dateStr = '';
            
            if (dateTime) {
              const datePart = String(dateTime).split(' ')[0];
              dateStr = datePart;
              const match = datePart.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
              if (match) {
                parsedDate = new Date(match[3], match[2] - 1, match[1]);
              }
            }
            
            let parsedLat = lat ? parseFloat(String(lat).replace(',', '.')) : null;
            let parsedLng = lng ? parseFloat(String(lng).replace(',', '.')) : null;
            
            if (station && parsedDate) {
              failures.push({
                date: dateStr,
                parsedDate: parsedDate,
                station: String(station).trim(),
                device: String(device || ''),
                department: String(department || ''),
                duration: String(duration || ''),
                lat: parsedLat,
                lng: parsedLng
              });
            }
            
            if (idx % 500 === 0) {
              showProgress(true, (idx / data.length) * 100);
            }
          });
          
          setFailuresData(failures);
          setAvailableDevices(Array.from(devicesSet).sort());
          showProgress(false);
          showStatus(`✅ Загружено отказов: ${failures.length}`, false, 5000);
          
        } catch (err) {
          console.error('Ошибка:', err);
          showProgress(false);
          showStatus(`❌ Ошибка: ${err.message}`, true);
        }
      }
    });
  };

  const generateAutoLines = useCallback(() => {
    if (allStations.length === 0) {
      showStatus('⚠️ Сначала загрузите файл со станциями!', true);
      return;
    }

    showStatus('🔄 Генерация автоматических линий...');
    showProgress(true, 0);

    setTimeout(() => {
      const newAutoLines = [];
      const stationsByShch = new Map();

      allStations.forEach(station => {
        if (!stationsByShch.has(station.shch)) {
          stationsByShch.set(station.shch, []);
        }
        stationsByShch.get(station.shch).push(station);
      });

      let processed = 0;
      const total = stationsByShch.size;

      for (const [shch, stations] of stationsByShch.entries()) {
        if (stations.length < 2) {
          processed++;
          showProgress(true, (processed / total) * 100);
          continue;
        }

        const color = getColorForShch(shch);
        stations.sort((a, b) => {
          const centerLat = (REGION_BOUNDS.minLat + REGION_BOUNDS.maxLat) / 2;
          const centerLng = (REGION_BOUNDS.minLng + REGION_BOUNDS.maxLng) / 2;
          return Math.abs(a.lat - centerLat) + Math.abs(a.lng - centerLng) - 
                 (Math.abs(b.lat - centerLat) + Math.abs(b.lng - centerLng));
        });

        for (let i = 0; i < stations.length - 1; i++) {
          newAutoLines.push({
            id: `${shch}_${i}`,
            shch: shch,
            points: [[stations[i].lat, stations[i].lng], [stations[i + 1].lat, stations[i + 1].lng]],
            color: color,
            stations: [stations[i].name, stations[i + 1].name]
          });
        }

        processed++;
        showProgress(true, (processed / total) * 100);
      }

      setAutoLines(newAutoLines);
      showProgress(false);
      showStatus(`✅ Сгенерировано авто-линий: ${newAutoLines.length}`);
    }, 100);
  }, [allStations, getColorForShch, showStatus, showProgress]);

  const updateFilterPanel = useCallback(() => {
    const shchSet = new Set();
    allStations.forEach(s => shchSet.add(s.shch));
    const shchList = Array.from(shchSet).sort();

    const shchContainer = document.getElementById('shchFilterList');
    if (shchContainer) {
      shchContainer.innerHTML = shchList.map(shch => `
        <div class="filter-item">
          <input type="checkbox" value="${shch}" id="shch_${shch.replace(/\s/g, '_')}" ${selectedShch.has(shch) ? 'checked' : ''}>
          <span class="color-badge" style="background: ${getColorForShch(shch)}"></span>
          <label for="shch_${shch.replace(/\s/g, '_')}">${shch}</label>
          <span style="font-size: 10px; color: #888;">(${allStations.filter(s => s.shch === shch).length})</span>
        </div>
      `).join('');

      shchContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const shch = e.target.value;
          setSelectedShch(prev => {
            const newSet = new Set(prev);
            if (e.target.checked) newSet.add(shch);
            else newSet.delete(shch);
            return newSet;
          });
        });
      });
    }

    const searchTerm = stationSearch.toLowerCase();
    const filteredStationsForList = allStations.filter(s => 
      s.name.toLowerCase().includes(searchTerm)
    ).sort((a, b) => a.name.localeCompare(b.name));

    const stationContainer = document.getElementById('stationFilterList');
    if (stationContainer) {
      stationContainer.innerHTML = filteredStationsForList.map(station => `
        <div class="filter-item">
          <input type="checkbox" value="${station.name}" id="station_${station.name.replace(/\s/g, '_')}" ${selectedStations.has(station.name) ? 'checked' : ''}>
          <span class="color-badge" style="background: ${getColorForShch(station.shch)}"></span>
          <label for="station_${station.name.replace(/\s/g, '_')}">${station.name}</label>
        </div>
      `).join('');

      stationContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const stationName = e.target.value;
          setSelectedStations(prev => {
            const newSet = new Set(prev);
            if (e.target.checked) newSet.add(stationName);
            else newSet.delete(stationName);
            return newSet;
          });
        });
      });
    }
  }, [allStations, selectedShch, selectedStations, stationSearch, getColorForShch]);

  useEffect(() => {
    updateFilterPanel();
  }, [allStations, selectedShch, selectedStations, stationSearch, updateFilterPanel]);

  const handleStationsFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showStatus(`📂 Загрузка ${file.name}...`);
    showProgress(true, 10);

    Papa.parse(file, {
      header: true,
      encoding: "UTF-8",
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        try {
          const stations = [];
          const data = results.data;

          data.forEach((row, idx) => {
            let lat = row.Широта || row.lat || row.Latitude;
            let lng = row.Долгота || row.lon || row.Longitude;
            let name = row.Станция || row.name || row.station;
            let shch = row.ШЧ || row.branch || 'Неизвестно';

            if (lat && lng && !isNaN(lat) && !isNaN(lng) && name && isPointInRegion(lat, lng)) {
              stations.push({ name: String(name), lat, lng, shch: String(shch) });
            }

            if (idx % 100 === 0) {
              showProgress(true, 10 + (idx / data.length) * 80);
            }
          });

          setAllStations(stations);
          showProgress(false);
          showStatus(`✅ Загружено станций: ${stations.length}`, false, 3000);
        } catch (err) {
          showProgress(false);
          showStatus(`❌ Ошибка: ${err.message}`, true);
        }
      }
    });
  };

  const handleRoutesFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showStatus(`🔄 Обработка ${file.name}...`);
    showProgress(true, 0);

    const linesMap = new Map();
    let processedRows = 0;

    Papa.parse(file, {
      header: true,
      encoding: "UTF-8",
      skipEmptyLines: true,
      dynamicTyping: true,
      step: (results) => {
        const row = results.data;
        processedRows++;

        if (processedRows % 10000 === 0) {
          showProgress(true, Math.min((processedRows / 240000) * 100, 90));
        }

        let lineId = row.line_id || row.lineId || row.LINE_ID;
        let order = row.point_ordlon || row.order || 0;
        let lat = row.lat || row.Latitude;
        let lng = row.lon || row.Longitude;
        let shch = row.branch || row.ШЧ;

        if (row.geopoint && !lat) {
          try {
            const coords = JSON.parse(row.geopoint);
            if (Array.isArray(coords) && coords.length === 2) {
              lat = coords[0];
              lng = coords[1];
            }
          } catch(e) {}
        }

        if (lineId && lat && lng && !isNaN(lat) && !isNaN(lng) && isPointInRegion(lat, lng)) {
          if (!linesMap.has(lineId)) {
            linesMap.set(lineId, []);
          }
          linesMap.get(lineId).push({ order: order || 0, lat, lng, shch });
        }
      },
      complete: () => {
        const newCsvLines = [];

        for (const [lineId, points] of linesMap.entries()) {
          points.sort((a, b) => a.order - b.order);
          if (points.length >= 2) {
            const latLngs = points.map(p => [p.lat, p.lng]);
            const shch = points[0]?.shch || 'Неизвестно';
            const color = getColorForShch(shch);

            newCsvLines.push({
              id: lineId,
              shch: shch,
              points: latLngs,
              color: color
            });
          }
        }

        setCsvLines(newCsvLines);
        showProgress(false);
        showStatus(`✅ Загружено линий: ${newCsvLines.length}`);
      }
    });
  };

  const handleGeojsonFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    showStatus(`🔄 Загрузка ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        const newGeojsonLines = [];

        const processCoordinates = (coords) => {
          if (!coords || coords.length === 0) return null;
          let isLngLat = false;
          if (coords.length > 0 && Math.abs(coords[0][0]) <= 180 && Math.abs(coords[0][1]) <= 90) {
            isLngLat = true;
          }
          const result = coords.map(coord => {
            const lat = isLngLat ? coord[1] : coord[0];
            const lng = isLngLat ? coord[0] : coord[1];
            return isPointInRegion(lat, lng) ? [lat, lng] : null;
          }).filter(p => p !== null);
          
          return result.length >= 2 ? result : null;
        };

        if (data.type === 'FeatureCollection') {
          data.features.forEach(feature => {
            if (feature.geometry && feature.geometry.type === 'LineString') {
              const points = processCoordinates(feature.geometry.coordinates);
              if (points && points.length >= 2) {
                newGeojsonLines.push({
                  id: feature.properties?.id || feature.properties?.name,
                  points: points,
                  color: '#3b82f6',
                  shch: feature.properties?.shch || 'GeoJSON'
                });
              }
            }
          });
        }

        setGeojsonLines(newGeojsonLines);
        showStatus(`✅ Загружено GeoJSON линий: ${newGeojsonLines.length}`);
      } catch (err) {
        showStatus(`❌ Ошибка: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
  };

  const switchMapLayer = (type) => {
    if (!map) return;
    map.setType(type === 'scheme' ? 'yandex#map' : 'yandex#satellite');
    setCurrentMapType(type);
  };

  const resetView = () => {
    if (!map) return;
    map.setBounds([
      [REGION_BOUNDS.minLat, REGION_BOUNDS.minLng],
      [REGION_BOUNDS.maxLat, REGION_BOUNDS.maxLng]
    ], { checkZoomRange: true });
    showStatus('🗺️ Вид установлен на регион ЗСЖД');
  };

  const selectAllShch = () => setSelectedShch(new Set(allStations.map(s => s.shch)));
  const clearAllShch = () => setSelectedShch(new Set());
  const selectAllStations = () => setSelectedStations(new Set(allStations.map(s => s.name)));
  const clearAllStations = () => setSelectedStations(new Set());

  const stats = useMemo(() => ({
    stations: allStations.length,
    csvLines: csvLines.length,
    geojsonLines: geojsonLines.length,
    autoLines: autoLines.length,
    failures: failuresData.length,
    devices: availableDevices.length
  }), [allStations.length, csvLines.length, geojsonLines.length, autoLines.length, failuresData.length, availableDevices.length]);

  return (
    <div className="railway-map">
      <div className="railway-map__header">
        <h1 className="railway-map__title">
          <i className="fas fa-train"></i> Западно-Сибирская железная дорога
        </h1>
        <div className="railway-map__controls">
          <label className="railway-map__file-label">
            <i className="fas fa-database"></i> stations.csv
            <input type="file" accept=".csv" onChange={handleStationsFile} />
          </label>
          <label className="railway-map__file-label">
            <i className="fas fa-road"></i> routes_points.csv
            <input type="file" accept=".csv" onChange={handleRoutesFile} />
          </label>
          <label className="railway-map__file-label">
            <i className="fas fa-map"></i> Puti-2.geojson
            <input type="file" accept=".geojson,.json" onChange={handleGeojsonFile} />
          </label>
          <label className="railway-map__file-label railway-map__file-label--failures">
            <i className="fas fa-exclamation-triangle"></i> failures_complete.csv
            <input type="file" accept=".csv" onChange={handleFailuresFile} />
          </label>
          <div className="railway-map__layer-switcher">
            <i className="fas fa-layer-group"></i>
            <button className={currentMapType === 'scheme' ? 'active' : ''} onClick={() => switchMapLayer('scheme')}>Схема</button>
            <button className={currentMapType === 'satellite' ? 'active' : ''} onClick={() => switchMapLayer('satellite')}>Спутник</button>
          </div>
          <button onClick={generateAutoLines} className="railway-map__action-button">
            <i className="fas fa-magic"></i> Авто-прорисовка
          </button>
          <button onClick={() => setShowFilterPanel(!showFilterPanel)}>
            <i className="fas fa-filter"></i> Фильтры
          </button>
          <button onClick={resetView}>
            <i className="fas fa-globe"></i> Сброс
          </button>
        </div>
        <div className="railway-map__legend">
          <span><i className="railway-map__station-marker"></i> Станции</span>
          <span><i className="railway-map__line-color csv"></i> Пути (CSV)</span>
          <span><i className="railway-map__line-color geojson"></i> GeoJSON пути (тепловая карта)</span>
          <span><i className="railway-map__line-color auto"></i> Авто-линии</span>
          <span><i className="railway-map__failure-marker-critical"></i> Критический</span>
          <span><i className="railway-map__failure-marker-high"></i> Высокий</span>
          <span><i className="railway-map__failure-marker-medium"></i> Средний</span>
          <span><i className="railway-map__failure-marker-low"></i> Низкий</span>
          <span><i className="railway-map__failure-marker-minimal"></i> Минимальный</span>
        </div>
      </div>

      <div className="railway-map__calendar-container">
        <div className="railway-map__calendar-wrapper">
          <div className="railway-map__calendar-tabs">
            <button className={`railway-map__tab-btn ${filterMode === 'single' ? 'active' : ''}`} onClick={() => setFilterMode('single')}>
              <i className="fas fa-calendar-day"></i> Один день
            </button>
            <button className={`railway-map__tab-btn ${filterMode === 'range' ? 'active' : ''}`} onClick={() => setFilterMode('range')}>
              <i className="fas fa-calendar-week"></i> Диапазон
            </button>
            <button className={`railway-map__tab-btn ${['week', 'month', 'quarter', 'year'].includes(filterMode) ? 'active' : ''}`} onClick={() => setFilterMode('week')}>
              <i className="fas fa-chart-line"></i> Периоды
            </button>
          </div>

          {filterMode === 'single' && (
            <div className="railway-map__date-single">
              <DatePicker
                selected={selectedDates[0] || null}
                onChange={handleSingleDateChange}
                dateFormat="dd.MM.yyyy"
                placeholderText="Выберите дату"
                className="railway-map__calendar-input"
                isClearable
                showYearDropdown
                locale="ru"
              />
            </div>
          )}

          {filterMode === 'range' && (
            <div className="railway-map__date-range">
              <DatePicker
                selectsRange={true}
                startDate={dateRange.start}
                endDate={dateRange.end}
                onChange={handleRangeChange}
                dateFormat="dd.MM.yyyy"
                placeholderText="Выберите диапазон дат"
                className="railway-map__calendar-input railway-map__calendar-input--range"
                isClearable
                showYearDropdown
                locale="ru"
              />
              <button className="railway-map__all-time-btn" onClick={handleAllTimeSelect}>Весь период</button>
            </div>
          )}

          {filterMode === 'week' && (
            <div className="railway-map__period-selector">
              <div className="railway-map__period-buttons">
                <button className={`railway-map__period-btn ${filterMode === 'week' ? 'active' : ''}`} onClick={() => setFilterMode('week')}>Неделя</button>
                <button className={`railway-map__period-btn ${filterMode === 'month' ? 'active' : ''}`} onClick={() => setFilterMode('month')}>Месяц</button>
                <button className={`railway-map__period-btn ${filterMode === 'quarter' ? 'active' : ''}`} onClick={() => setFilterMode('quarter')}>Квартал</button>
                <button className={`railway-map__period-btn ${filterMode === 'year' ? 'active' : ''}`} onClick={() => setFilterMode('year')}>Год</button>
              </div>
              <DatePicker
                selected={dateRange.start}
                onChange={handleWeekSelect}
                dateFormat="dd.MM.yyyy"
                placeholderText="Выберите любую дату недели"
                className="railway-map__calendar-input"
                locale="ru"
              />
            </div>
          )}

          {filterMode === 'month' && (
            <div className="railway-map__period-selector">
              <div className="railway-map__period-buttons">
                <button className={`railway-map__period-btn ${filterMode === 'week' ? 'active' : ''}`} onClick={() => setFilterMode('week')}>Неделя</button>
                <button className={`railway-map__period-btn ${filterMode === 'month' ? 'active' : ''}`} onClick={() => setFilterMode('month')}>Месяц</button>
                <button className={`railway-map__period-btn ${filterMode === 'quarter' ? 'active' : ''}`} onClick={() => setFilterMode('quarter')}>Квартал</button>
                <button className={`railway-map__period-btn ${filterMode === 'year' ? 'active' : ''}`} onClick={() => setFilterMode('year')}>Год</button>
              </div>
              <div className="railway-map__month-multi-selector">
                <div className="railway-map__multi-select-header">
                  <span>Выберите месяцы (можно несколько):</span>
                  {selectedMonths.length > 0 && (
                    <button className="railway-map__clear-btn-small" onClick={() => setSelectedMonths([])}>Очистить все</button>
                  )}
                </div>
                <div className="railway-map__months-grid">
                  {getAvailableYears().map(year => (
                    <div key={year} className="railway-map__year-group">
                      <div className="railway-map__year-title">{year}</div>
                      <div className="railway-map__months-row">
                        {[0,1,2,3,4,5,6,7,8,9,10,11].map(month => {
                          const isSelected = selectedMonths.some(m => m.year === year && m.month === month);
                          const monthName = new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'short' });
                          return (
                            <button key={`${year}-${month}`} className={`railway-map__month-btn ${isSelected ? 'active' : ''}`} onClick={() => toggleMonth(year, month)}>
                              {monthName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filterMode === 'quarter' && (
            <div className="railway-map__period-selector">
              <div className="railway-map__period-buttons">
                <button className={`railway-map__period-btn ${filterMode === 'week' ? 'active' : ''}`} onClick={() => setFilterMode('week')}>Неделя</button>
                <button className={`railway-map__period-btn ${filterMode === 'month' ? 'active' : ''}`} onClick={() => setFilterMode('month')}>Месяц</button>
                <button className={`railway-map__period-btn ${filterMode === 'quarter' ? 'active' : ''}`} onClick={() => setFilterMode('quarter')}>Квартал</button>
                <button className={`railway-map__period-btn ${filterMode === 'year' ? 'active' : ''}`} onClick={() => setFilterMode('year')}>Год</button>
              </div>
              <div className="railway-map__quarter-multi-selector">
                <div className="railway-map__multi-select-header">
                  <span>Выберите кварталы (можно несколько):</span>
                  {selectedQuarters.length > 0 && (
                    <button className="railway-map__clear-btn-small" onClick={() => setSelectedQuarters([])}>Очистить все</button>
                  )}
                </div>
                <div className="railway-map__quarters-grid">
                  {getAvailableYears().map(year => (
                    <div key={year} className="railway-map__year-group">
                      <div className="railway-map__year-title">{year}</div>
                      <div className="railway-map__quarters-row">
                        {[1,2,3,4].map(quarter => {
                          const isSelected = selectedQuarters.some(q => q.year === year && q.quarter === quarter);
                          const quarterNames = {1:'I',2:'II',3:'III',4:'IV'};
                          return (
                            <button key={`${year}-${quarter}`} className={`railway-map__quarter-btn ${isSelected ? 'active' : ''}`} onClick={() => toggleQuarter(year, quarter)}>
                              {quarterNames[quarter]} квартал
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {filterMode === 'year' && (
            <div className="railway-map__period-selector">
              <div className="railway-map__period-buttons">
                <button className={`railway-map__period-btn ${filterMode === 'week' ? 'active' : ''}`} onClick={() => setFilterMode('week')}>Неделя</button>
                <button className={`railway-map__period-btn ${filterMode === 'month' ? 'active' : ''}`} onClick={() => setFilterMode('month')}>Месяц</button>
                <button className={`railway-map__period-btn ${filterMode === 'quarter' ? 'active' : ''}`} onClick={() => setFilterMode('quarter')}>Квартал</button>
                <button className={`railway-map__period-btn ${filterMode === 'year' ? 'active' : ''}`} onClick={() => setFilterMode('year')}>Год</button>
              </div>
              <select className="railway-map__select" onChange={(e) => handleYearSelect(parseInt(e.target.value))} value={dateRange.start?.getFullYear() || ''}>
                <option value="">Выберите год</option>
                {getAvailableYears().map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          )}

          <div className="railway-map__filter-buttons-row">
            <button className="railway-map__clear-all-filters" onClick={clearDateFilter}>
              <i className="fas fa-eraser"></i> Сбросить все фильтры
            </button>
            {failuresData.length > 0 && (
              <div className="railway-map__failures-stats">
                <i className="fas fa-chart-bar"></i> Всего: {failuresData.length} | Отфильтровано: {filteredFailures.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {availableDevices.length > 0 && (
        <div className="railway-map__filters-row">
          <button className={`railway-map__filter-toggle ${showDeviceFilter ? 'active' : ''}`} onClick={() => { setShowDeviceFilter(!showDeviceFilter); setShowRiskFilter(false); }}>
            <i className="fas fa-microchip"></i> Устройства {selectedDevices.size > 0 && <span className="badge">{selectedDevices.size}</span>}
          </button>
          <button className={`railway-map__filter-toggle ${showRiskFilter ? 'active' : ''}`} onClick={() => { setShowRiskFilter(!showRiskFilter); setShowDeviceFilter(false); }}>
            <i className="fas fa-exclamation-triangle"></i> Уровень риска {selectedRiskLevel && <span className="badge">1</span>}
          </button>
        </div>
      )}

      {showDeviceFilter && (
        <div className="railway-map__device-filter-panel">
          <div className="railway-map__device-filter-header">
            <span>Выберите устройства (можно несколько):</span>
            {selectedDevices.size > 0 && <button className="clear-btn" onClick={clearDeviceFilter}>Очистить все</button>}
          </div>
          <div className="railway-map__devices-list">
            {availableDevices.map(device => (
              <button key={device} className={`device-item ${selectedDevices.has(device) ? 'active' : ''}`} onClick={() => toggleDevice(device)}>
                {device.length > 40 ? device.substring(0, 37) + '...' : device}
              </button>
            ))}
          </div>
        </div>
      )}

      {showRiskFilter && (
        <div className="railway-map__risk-filter-panel">
          <div className="railway-map__risk-filter-header">
            <span>Уровень риска:</span>
            {selectedRiskLevel && <button className="clear-btn" onClick={() => setSelectedRiskLevel(null)}>Сбросить</button>}
          </div>
          <div className="railway-map__risk-buttons">
            <button className={`risk-btn critical ${selectedRiskLevel === 'critical' ? 'active' : ''}`} onClick={() => setSelectedRiskLevel('critical')}>🔴 Критический</button>
            <button className={`risk-btn high ${selectedRiskLevel === 'high' ? 'active' : ''}`} onClick={() => setSelectedRiskLevel('high')}>🟠 Высокий</button>
            <button className={`risk-btn medium ${selectedRiskLevel === 'medium' ? 'active' : ''}`} onClick={() => setSelectedRiskLevel('medium')}>🟡 Средний</button>
            <button className={`risk-btn low ${selectedRiskLevel === 'low' ? 'active' : ''}`} onClick={() => setSelectedRiskLevel('low')}>🟢 Низкий</button>
            <button className={`risk-btn minimal ${selectedRiskLevel === 'minimal' ? 'active' : ''}`} onClick={() => setSelectedRiskLevel('minimal')}>🔵 Минимальный</button>
          </div>
        </div>
      )}

      <div id="map" style={{ flex: 1, width: '100%', minHeight: '400px' }}></div>

      {selectedStationDetails && (
        <div className="railway-map__modal-overlay" onClick={closeStationDetails}>
          <div className="railway-map__modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="railway-map__modal-header">
              <h3>🚉 {selectedStationDetails.name}</h3>
              <button className="modal-close" onClick={closeStationDetails}>✕</button>
            </div>
            <div className="railway-map__modal-body">
              <div className="station-info">
                <div className="station-info-grid">
                  <div><strong>📍 Участок:</strong> {selectedStationDetails.shch}</div>
                  <div><strong>📊 Всего отказов:</strong> {stationFailuresHistory.length}</div>
                  <div><strong>📅 Период:</strong> {stationFailuresHistory.length > 0 ? `${stationFailuresHistory[stationFailuresHistory.length-1]?.date} - ${stationFailuresHistory[0]?.date}` : 'Нет данных'}</div>
                  <div><strong>🔄 Уникальных устройств:</strong> {new Set(stationFailuresHistory.map(f => f.device).filter(d => d)).size}</div>
                </div>
              </div>
              <div className="failures-list">
                <h4>📋 Полная история отказов ({stationFailuresHistory.length})</h4>
                <div className="failures-table-container">
                  <table className="failures-table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Устройство</th>
                        <th>Подразделение</th>
                        <th>Длительность</th>
                        <th>Риск</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationFailuresHistory.map((f, i) => (
                        <tr key={i}>
                          <td>{f.date}</td>
                          <td title={f.device}>{f.device?.substring(0, 50) || '-'}{f.device?.length > 50 ? '...' : ''}</td>
                          <td>{f.department || '-'}</td>
                          <td>{f.duration || '-'}</td>
                          <td><span className={`risk-badge ${getRiskLevel(f.device)}`}>{getRiskLevelText(getRiskLevel(f.device))}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFilterPanel && (
        <div className="railway-map__filter-panel">
          <button className="railway-map__close-filter" onClick={() => setShowFilterPanel(false)}>✕</button>
          <h3>Фильтры</h3>
          <div className="railway-map__filter-section">
            <h4>Участки (ШЧ)</h4>
            <div className="railway-map__filter-buttons"><button onClick={selectAllShch}>Выбрать все</button><button onClick={clearAllShch}>Снять все</button></div>
            <div id="shchFilterList" className="railway-map__filter-list"></div>
          </div>
          <div className="railway-map__filter-section">
            <h4>Станции</h4>
            <div className="railway-map__filter-buttons"><button onClick={selectAllStations}>Выбрать все</button><button onClick={clearAllStations}>Снять все</button></div>
            <input type="text" placeholder="Поиск станции..." value={stationSearch} onChange={(e) => setStationSearch(e.target.value)} className="railway-map__station-search" />
            <div id="stationFilterList" className="railway-map__filter-list" style={{ maxHeight: '250px' }}></div>
          </div>
          <div className="railway-map__filter-section">
            <h4>Тип линий</h4>
            <label><input type="checkbox" checked={showCsvLinesFlag} onChange={(e) => setShowCsvLinesFlag(e.target.checked)} /> Показать пути из CSV</label>
            <label><input type="checkbox" checked={showGeojsonFlag} onChange={(e) => setShowGeojsonFlag(e.target.checked)} /> Показать пути из GeoJSON (с тепловой картой)</label>
            <label><input type="checkbox" checked={showAutoLinesFlag} onChange={(e) => setShowAutoLinesFlag(e.target.checked)} /> Показать автоматические линии</label>
          </div>
        </div>
      )}

      <div className={`railway-map__status-panel ${status.isError ? 'error' : 'success'}`}>{status.message}</div>
      <div className="railway-map__stats">
        📍 Станции: {stats.stations}<br />
        🛤️ Треки (CSV): {stats.csvLines}<br />
        🗺️ GeoJSON: {stats.geojsonLines}<br />
        🔗 Авто-линии: {stats.autoLines}<br />
        ⚠️ Отказы: {stats.failures}<br />
        🔧 Устройств: {stats.devices}
      </div>
      {progress.show && <div className="railway-map__progress-bar"><div className="railway-map__progress-fill" style={{ width: `${progress.percent}%` }}></div></div>}
    </div>
  );
};

export default RailwayMap;