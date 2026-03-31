import React, { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
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

const RailwayMap = () => {
  const [map, setMap] = useState(null);
  const [currentMapType, setCurrentMapType] = useState('scheme');
  const [allStations, setAllStations] = useState([]);
  const [csvLines, setCsvLines] = useState([]);
  const [geojsonLines, setGeojsonLines] = useState([]);
  const [autoLines, setAutoLines] = useState([]);
  
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
  
  const shchColors = useRef({});
  const colorIndex = useRef(0);
  const stationPlacemarks = useRef([]);
  const csvLineObjects = useRef([]);
  const geojsonLineObjects = useRef([]);
  const autoLineObjects = useRef([]);

  const isPointInRegion = useCallback((lat, lng) => {
    return lat >= REGION_BOUNDS.minLat && lat <= REGION_BOUNDS.maxLat &&
           lng >= REGION_BOUNDS.minLng && lng <= REGION_BOUNDS.maxLng;
  }, []);

  const getColorForShch = useCallback((shch) => {
    if (!shchColors.current[shch]) {
      shchColors.current[shch] = colorPalette[colorIndex.current % colorPalette.length];
      colorIndex.current++;
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

  const clearAllObjects = useCallback(() => {
    if (!map) return;
    
    stationPlacemarks.current.forEach(p => map.geoObjects.remove(p));
    csvLineObjects.current.forEach(l => map.geoObjects.remove(l));
    geojsonLineObjects.current.forEach(l => map.geoObjects.remove(l));
    autoLineObjects.current.forEach(l => map.geoObjects.remove(l));
    
    stationPlacemarks.current = [];
    csvLineObjects.current = [];
    geojsonLineObjects.current = [];
    autoLineObjects.current = [];
  }, [map]);

  const applyFilters = useCallback(() => {
    if (isProcessing || !map) return;
    setIsProcessing(true);

    setTimeout(() => {
      clearAllObjects();

      const filteredStations = allStations.filter(station => {
        if (selectedShch.size > 0 && !selectedShch.has(station.shch)) return false;
        if (selectedStations.size > 0 && !selectedStations.has(station.name)) return false;
        return true;
      });

      filteredStations.forEach(station => {
        const color = getColorForShch(station.shch);
        const placemark = new window.ymaps.Placemark([station.lat, station.lng], {
          balloonContent: `
            <b>${station.name}</b><br>
            <span style="color: ${color}">●</span> Участок: ${station.shch}<br>
            📍 ${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}
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
        csvLines.forEach(line => {
          if (selectedShch.size === 0 || selectedShch.has(line.shch)) {
            const polyline = new window.ymaps.Polyline(line.points, {
              balloonContent: `<b>Линия: ${line.id}</b><br>Участок: ${line.shch}<br>Точек: ${line.points.length}`
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

      if (showGeojsonFlag) {
        geojsonLines.forEach(line => {
          if (selectedShch.size === 0 || selectedShch.has(line.shch)) {
            const polyline = new window.ymaps.Polyline(line.points, {
              balloonContent: `<b>GeoJSON линия</b><br>${line.id ? `ID: ${line.id}` : ''}`
            }, {
              strokeColor: line.color || '#3b82f6',
              strokeWidth: 2.5,
              strokeOpacity: 0.7
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
              balloonContent: `<b>Авто-линия</b><br>Участок: ${line.shch}<br>Станции: ${line.stations.join(' → ')}`
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

      setIsProcessing(false);
    }, 0);
  }, [map, isProcessing, allStations, selectedShch, selectedStations, showCsvLinesFlag, showGeojsonFlag, showAutoLinesFlag, csvLines, geojsonLines, autoLines, clearAllObjects, getColorForShch]);

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
          const distA = Math.abs(a.lat - centerLat) + Math.abs(a.lng - centerLng);
          const distB = Math.abs(b.lat - centerLat) + Math.abs(b.lng - centerLng);
          return distA - distB;
        });

        for (let i = 0; i < stations.length - 1; i++) {
          const points = [
            [stations[i].lat, stations[i].lng],
            [stations[i + 1].lat, stations[i + 1].lng]
          ];
          newAutoLines.push({
            id: `${shch}_${i}`,
            shch: shch,
            points: points,
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
          if (e.target.checked) {
            setSelectedShch(prev => new Set([...prev, shch]));
          } else {
            setSelectedShch(prev => {
              const newSet = new Set(prev);
              newSet.delete(shch);
              return newSet;
            });
          }
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
          if (e.target.checked) {
            setSelectedStations(prev => new Set([...prev, stationName]));
          } else {
            setSelectedStations(prev => {
              const newSet = new Set(prev);
              newSet.delete(stationName);
              return newSet;
            });
          }
        });
      });
    }
  }, [allStations, selectedShch, selectedStations, stationSearch, getColorForShch]);

  useEffect(() => {
    updateFilterPanel();
  }, [allStations, selectedShch, selectedStations, stationSearch, updateFilterPanel]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters, allStations, csvLines, geojsonLines, autoLines, selectedShch, selectedStations, showCsvLinesFlag, showGeojsonFlag, showAutoLinesFlag]);

  // Инициализация карты
  useEffect(() => {
    const initMap = () => {
      if (!window.ymaps) return;
      
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
        
        const bounds = [
          [REGION_BOUNDS.minLat, REGION_BOUNDS.minLng],
          [REGION_BOUNDS.maxLat, REGION_BOUNDS.maxLng]
        ];
        newMap.setBounds(bounds, { checkZoomRange: true });
        newMap.setType('yandex#map');
        
        setMap(newMap);
      });
    };

    if (window.ymaps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://api-maps.yandex.ru/2.1/?apikey=d07e771d-d1d0-4fef-bce2-cddd2f2dd789&lang=ru_RU';
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, []);

  const switchMapLayer = (type) => {
    if (!map) return;
    if (type === 'scheme') {
      map.setType('yandex#map');
      setCurrentMapType('scheme');
    } else if (type === 'satellite') {
      map.setType('yandex#satellite');
      setCurrentMapType('satellite');
    }
  };

  const resetView = () => {
    if (!map) return;
    const bounds = [
      [REGION_BOUNDS.minLat, REGION_BOUNDS.minLng],
      [REGION_BOUNDS.maxLat, REGION_BOUNDS.maxLng]
    ];
    map.setBounds(bounds, { checkZoomRange: true });
    showStatus('🗺️ Вид установлен на регион ЗСЖД');
  };

  const selectAllShch = () => {
    const shchSet = new Set(allStations.map(s => s.shch));
    setSelectedShch(shchSet);
  };

  const clearAllShch = () => {
    setSelectedShch(new Set());
  };

  const selectAllStations = () => {
    setSelectedStations(new Set(allStations.map(s => s.name)));
  };

  const clearAllStations = () => {
    setSelectedStations(new Set());
  };

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
          showStatus(`✅ Загружено станций: ${stations.length} (отфильтровано по региону)`);
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

    showStatus(`🔄 Обработка ${file.name} (фильтрация по региону)...`);
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
        showStatus(`✅ Загружено линий из CSV: ${newCsvLines.length} (отфильтровано по региону)`);
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
              if (points) {
                newGeojsonLines.push({
                  id: feature.properties?.id || feature.properties?.name,
                  points: points,
                  color: '#3b82f6',
                  shch: 'GeoJSON'
                });
              }
            }
          });
        }

        setGeojsonLines(newGeojsonLines);
        showStatus(`✅ Загружено линий из GeoJSON: ${newGeojsonLines.length} (отфильтровано по региону)`);
      } catch (err) {
        showStatus(`❌ Ошибка: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
  };

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
          <div className="railway-map__layer-switcher">
            <i className="fas fa-layer-group"></i>
            <button 
              className={currentMapType === 'scheme' ? 'active' : ''} 
              onClick={() => switchMapLayer('scheme')}
            >
              Схема
            </button>
            <button 
              className={currentMapType === 'satellite' ? 'active' : ''} 
              onClick={() => switchMapLayer('satellite')}
            >
              Спутник
            </button>
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
          <span><i className="railway-map__station-marker" style={{ background: '#ff3333' }}></i> Станции</span>
          <span><i className="railway-map__line-color" style={{ background: '#ff7b2c' }}></i> Пути (CSV)</span>
          <span><i className="railway-map__line-color" style={{ background: '#3b82f6' }}></i> GeoJSON пути</span>
          <span><i className="railway-map__line-color" style={{ background: '#00ff88' }}></i> Авто-линии</span>
        </div>
      </div>

      <div id="map" style={{ flex: 1, width: '100%' }}></div>

      {showFilterPanel && (
        <div className="railway-map__filter-panel">
          <button className="railway-map__close-filter" onClick={() => setShowFilterPanel(false)}>
            <i className="fas fa-times"></i>
          </button>
          <h3><i className="fas fa-sliders-h"></i> Фильтры</h3>
          
          <div className="railway-map__filter-section">
            <h4><i className="fas fa-layer-group"></i> Участки (ШЧ)</h4>
            <div className="railway-map__filter-buttons">
              <button onClick={selectAllShch}>Выбрать все</button>
              <button onClick={clearAllShch}>Снять все</button>
            </div>
            <div id="shchFilterList" className="railway-map__filter-list"></div>
          </div>
          
          <div className="railway-map__filter-section">
            <h4><i className="fas fa-train"></i> Станции</h4>
            <div className="railway-map__filter-buttons">
              <button onClick={selectAllStations}>Выбрать все</button>
              <button onClick={clearAllStations}>Снять все</button>
            </div>
            <input 
              type="text" 
              id="stationSearch" 
              placeholder="Поиск станции..." 
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              className="railway-map__station-search"
            />
            <div id="stationFilterList" className="railway-map__filter-list" style={{ maxHeight: '250px' }}></div>
          </div>
          
          <div className="railway-map__filter-section">
            <h4><i className="fas fa-chart-line"></i> Тип линий</h4>
            <label className="railway-map__checkbox-label">
              <input type="checkbox" checked={showCsvLinesFlag} onChange={(e) => setShowCsvLinesFlag(e.target.checked)} /> 
              Показать пути из CSV
            </label>
            <label className="railway-map__checkbox-label">
              <input type="checkbox" checked={showGeojsonFlag} onChange={(e) => setShowGeojsonFlag(e.target.checked)} /> 
              Показать пути из GeoJSON
            </label>
            <label className="railway-map__checkbox-label">
              <input type="checkbox" checked={showAutoLinesFlag} onChange={(e) => setShowAutoLinesFlag(e.target.checked)} /> 
              Показать автоматические линии
            </label>
          </div>
        </div>
      )}

      <div className={`railway-map__status-panel ${status.isError ? 'railway-map__status-panel--error' : 'railway-map__status-panel--success'}`}>
        {status.message}
      </div>
      
      <div className="railway-map__stats">
        📍 Станции: {allStations.length}<br />
        🛤️ Треки (CSV): {csvLines.length} линий<br />
        🗺️ GeoJSON: {geojsonLines.length} линий<br />
        🔗 Авто-линии: {autoLines.length}
      </div>
      
      {progress.show && (
        <div className="railway-map__progress-bar">
          <div className="railway-map__progress-fill" style={{ width: `${progress.percent}%` }}></div>
        </div>
      )}
    </div>
  );
};

export default RailwayMap;