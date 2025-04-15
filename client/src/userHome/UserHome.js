import React, { useState, useEffect } from 'react';
import './UserHome.css';
import userIcon from '../images/userIcon.png';
import menuIcon from '../images/menuIcon.png';
import addIcon from '../images/add.png';
import analysisIcon from '../images/analysis.png';
import devicesIcon from '../images/devices.png';
import logoutIcon from '../images/logout.png'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define getSensorConfig outside both components so it can be used by CustomTooltip
const getSensorConfig = (type) => {
    switch(type) {
        case 'ph': return { color: '#6366F1', unit: 'pH' };         // Modern indigo
        case 'temp': return { color: '#F97316', unit: '°C' };       // Modern orange
        case 'tds': return { color: '#10B981', unit: 'ppm' };       // Modern emerald
        case 'turbidity': return { color: '#0EA5E9', unit: 'NTU' }; // Modern sky blue
        case 'waterLevel': return { color: '#8B5CF6', unit: '%' };  // Modern purple
        default: return { color: '#6366F1', unit: '' };
    }
};

// Helper function to get readable sensor names
const getSensorName = (type) => {
    switch(type) {
        case 'ph': return 'pH';
        case 'temp': return 'Temperature';
        case 'tds': return 'TDS';
        case 'turbidity': return 'Turbidity';
        case 'waterLevel': return 'Water Level';
        default: return type;
    }
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="tooltip-date">{label}</div>
        <div className="tooltip-content">
          {payload.map((entry, index) => {
            const config = entry.name ? 
              getSensorConfig(entry.name.toLowerCase().replace(' ', '')) : 
              { color: '#000', unit: '' };
              
            return (
              <div className="tooltip-item" key={`item-${index}`}>
                <div className="tooltip-color" style={{ backgroundColor: entry.color }}></div>
                <div className="tooltip-text">
                  <span className="tooltip-name">{entry.name}</span>
                  <span className="tooltip-value" style={{ color: entry.color }}>
                    {entry.value.toFixed(1)} {config.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

const UserHome = () => {
    const [activeItem, setActiveItem] = useState('');
    const [selectedSensor, setSelectedSensor] = useState('all');
    const [chartData, setChartData] = useState([]);
    const [timePeriod, setTimePeriod] = useState('weekly');
    const [selectedDevice, setSelectedDevice] = useState('all');
    const [deviceToManage, setDeviceToManage] = useState('');
    const [devicesPopUp, setDevicesPopUp] = useState('');

    // Handler for sensor selection change
    const handleSensorChange = (e) => {
        setSelectedSensor(e.target.value);
    };

    // Handler for time period change
    const handleTimePeriodChange = (e) => {
        setTimePeriod(e.target.value);
    };

    // Handler for device change
    const handleDeviceChange = (e) => {
        //currentTarget.dataset = target.value
        //This is for divs        This is for input or select  

        if (e.currentTarget.dataset.value != undefined) { //for divs
            setSelectedDevice(e.currentTarget.dataset.value);
        }
        else { //for selects and inputs
            setSelectedDevice(e.target.value);
        }

    };

    const deviceAnalytics = (e) => {
        handleDeviceChange(e);
        setActiveItem('analysis');
    }

    const handleItemClick = (item) => {
        setActiveItem(item);
    };

    const handleManageDevice = (e) => {
        setDeviceToManage(e.currentTarget.dataset.value);
        setDevicesPopUp('manage');
    }

    // Sensor options for the dropdown
    const sensorOptions = [
        { value: 'all', label: 'All Sensors' },
        { value: 'ph', label: 'pH Sensor' },
        { value: 'temp', label: 'Temperature Sensor' },
        { value: 'dissolved solids', label: 'TSD Sensor' },
        { value: 'turbidity', label: 'Turbidity Sensor' },
        { value: 'water level', label: 'Water Level' }
    ];

    // Sample devices list - would come from API in real app
    const devices = [
        { id: 'device1', name: 'Pond 1' },
        { id: 'device2', name: 'Aquarium 2' },
        { id: 'device3', name: 'Fish Tank 3' },
    ];

    // Time period options
    const timePeriodOptions = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
    ];

    // Calculate average values based on chartData
    const calculateAverages = () => {
        if (chartData.length === 0) return {};
        
        const sensors = ['ph', 'temp', 'tds', 'turbidity', 'waterLevel'];
        const averages = {};
        
        sensors.forEach(sensor => {
            const values = chartData.filter(item => item[sensor] !== undefined)
                                    .map(item => item[sensor]);

            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                averages[sensor] = sum / values.length;
            }
        });
        
        return averages;
    };

    // Generate sample data based on selected sensor
    const generateData = () => { // THIS FUNCTION CREATES ONLY A SAMPLE DATA
        const data = [];
        
        // Determine number of data points based on time period
        const dataPoints = timePeriod === 'daily' ? 24 : 
                        timePeriod === 'weekly' ? 7 : 
                        30; // monthly
        
        // Create timestamps based on time period
        for (let i = dataPoints - 1; i >= 0; i--) {
            const date = new Date();
            let formattedDate;
            
            if (timePeriod === 'daily') {
                date.setHours(date.getHours() - i);
                formattedDate = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } else if (timePeriod === 'weekly') {
                date.setDate(date.getDate() - i);
                formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric'
                });
            } else {
                date.setDate(date.getDate() - i);
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            // Generate different data patterns based on selected sensor
            let entry = { date: formattedDate };
            
            // Add slight variance based on device selection
            const deviceVariance = selectedDevice === 'device1' ? 0 : 
                                    selectedDevice === 'device2' ? -0.5 : 
                                    selectedDevice === 'device3' ? 0 : 0.5;
            
            if (selectedSensor === 'all' || selectedSensor === 'ph') {
                entry.ph = 6 + Math.random() * 2 + deviceVariance; // pH between 6-8
            }
            if (selectedSensor === 'all' || selectedSensor === 'temp') {
                entry.temp = 20 + Math.random() * 8 + deviceVariance; // Temp between 20-28°C
            }
            if (selectedSensor === 'all' || selectedSensor === 'dissolved solids') {
                entry.tds = 150 + Math.random() * 100 + (deviceVariance * 20); // TDS between 150-250 ppm
            }
            if (selectedSensor === 'all' || selectedSensor === 'turbidity') {
                entry.turbidity = 5 + Math.random() * 15 + (deviceVariance * 3); // Turbidity between 5-20 NTU
            }
            if (selectedSensor === 'all' || selectedSensor === 'water level') {
                entry.waterLevel = 70 + Math.random() * 20 + (deviceVariance * 5); // Water level between 70-90%
            }
            
            data.push(entry);
        }
        
        return data;
    };

    // Update chart data when sensor selection changes
    useEffect(() => {
        setChartData(generateData());
    }, [selectedSensor, timePeriod, selectedDevice]);

    const averages = calculateAverages();

    return (
        <div className="userHome">

            {/* Sidebar */}
            <div className='sidebar'>
                <div 
                    className={`device items ${activeItem === 'device' ? 'active' : ''}`}
                    onClick={() => handleItemClick('device')}
                >
                    <img className='icon' src={devicesIcon} alt="Device"/>
                    <h3>View Device</h3>
                </div>
                <div 
                    className={`analysis items ${activeItem === 'analysis' ? 'active' : ''}`}
                    onClick={() => handleItemClick('analysis')}
                >
                    <img className='icon' src={analysisIcon} alt="Analysis"/>
                    <h3>View Analysis</h3>
                </div>
                <div 
                    className={`log-out items ${activeItem === 'logout' ? 'active' : ''}`}
                    onClick={() => handleItemClick('logout')}
                >
                    <img className='icon' src={logoutIcon} alt="Log Out"/>
                    <h3>Log Out</h3>
                </div>
            </div>

            {/* Opening */}
            {(activeItem === '') && (
                <div className='content'>
                    <h1 className='title'>
                        Welcome, <br/>
                        user
                    </h1>

                    <p>
                    PondPal is your go-to solution for keeping your fish happy and your pond healthy. Our system continuously monitors essential water quality parameters such as pH level, temperature, dissolved oxygen, and turbidity to ensure a safe and thriving environment for your aquatic life.
                    Using smart sensors and real-time data, PondPal alerts you whenever conditions go beyond the safe range – so you can act fast and avoid problems like fish stress, disease, or water pollution.
                    Whether you're managing a small backyard pond or a large fish farm, PondPal helps you stay in control, anytime, anywhere.
                    </p>
                </div>
            )}
            
            {/* view devices */}
            {(activeItem === 'device') && (
                <div className='devices-container'>
                    <h2 className='devices-title'>Your Devices</h2>
                    {/* devices */}
                    <div className='devices'>
                        {/* Device 1 */}
                        <div className='device-card'>
                            <div className='device-header'>
                                <div className='device-name-section'>
                                    <h3>Pond 1</h3>
                                    <span className='device-status online'>
                                        <span className='status-dot'></span>
                                        Online
                                    </span>
                                </div>
                                <div className='device-icon' data-value='device1' onClick={deviceAnalytics}>
                                    <img src={analysisIcon} alt="Device icon"/>
                                </div>
                            </div>
                            
                            <div className='device-stats'>
                                <div className='stat-item'>
                                    <span className='stat-label'>pH</span>
                                    <span className='stat-value'>7.2</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Temp</span>
                                    <span className='stat-value'>24°C</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>TDS</span>
                                    <span className='stat-value'>180</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Turbidity</span>
                                    <span className='stat-value'>90</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Water Level</span>
                                    <span className='stat-value'>90%</span>
                                </div>
                            </div>
                            
                            <div className='device-actions'>
                                <button className='action-btn manage-btn' 
                                        data-value='device1' 
                                        onClick={(e) => handleManageDevice(e)}>
                                    Manage
                                </button>
                                <button className='action-btn delete-btn'>
                                    Delete
                                </button>
                            </div>
                        </div>
                        
                        {/* Device 2 */}
                        <div className='device-card'>
                            <div className='device-header'>
                                <div className='device-name-section'>
                                    <h3>Aquarium 2</h3>
                                    <span className='device-status offline'>
                                        <span className='status-dot'></span>
                                        Offline
                                    </span>
                                </div>
                                <div className='device-icon' data-value='device2' onClick={deviceAnalytics}>
                                    <img src={analysisIcon} alt="Device icon"/>
                                </div>
                            </div>
                            
                            <div className='device-stats'>
                                <div className='stat-item'>
                                    <span className='stat-label'>pH</span>
                                    <span className='stat-value'>6.8</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Temp</span>
                                    <span className='stat-value'>26°C</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>TDS</span>
                                    <span className='stat-value'>220</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Turbidity</span>
                                    <span className='stat-value'>90</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Water Level</span>
                                    <span className='stat-value'>90%</span>
                                </div>
                            </div>
                            
                            <div className='device-actions'>
                                <button className='action-btn manage-btn' 
                                        data-value='device2' 
                                        onClick={(e) => handleManageDevice(e)}>
                                    Manage
                                </button>
                                <button className='action-btn delete-btn'>
                                    Delete
                                </button>
                            </div>
                        </div>
                        
                        {/* Device 3 */}
                        <div className='device-card'>
                            <div className='device-header'>
                                <div className='device-name-section'>
                                    <h3>Fish Tank 3</h3>
                                    <span className='device-status warning'>
                                        <span className='status-dot'></span>
                                        Warning
                                    </span>
                                </div>
                                <div className='device-icon' data-value='device3' onClick={deviceAnalytics}>
                                    <img src={analysisIcon} alt="Device icon"/>
                                </div>
                            </div>
                            
                            <div className='device-stats'>
                                <div className='stat-item'>
                                    <span className='stat-label'>pH</span>
                                    <span className='stat-value'>8.1</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Temp</span>
                                    <span className='stat-value'>22°C</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>TDS</span>
                                    <span className='stat-value'>190</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Turbidity</span>
                                    <span className='stat-value'>90</span>
                                </div>
                                <div className='stat-item'>
                                    <span className='stat-label'>Water Level</span>
                                    <span className='stat-value'>90%</span>
                                </div>
                            </div>
                            
                            <div className='device-actions'>
                                <button className='action-btn manage-btn' 
                                        data-value='device3' 
                                        onClick={(e) => handleManageDevice(e)}>
                                    Manage
                                </button>
                                <button className='action-btn delete-btn'>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* add-device*/}
                    <div className='add-cont'>
                        <button className='add-device' onClick={() => setDevicesPopUp('add-device')}>
                            <img src={addIcon} alt="Add Device"/>
                            <h1>Add Device</h1>
                        </button>
                    </div>

                    {/* manage */}
                    {(devicesPopUp === 'manage') && ( //refer to deviceToManage for the chosen device name
                        <div className="popup-overlay">
                            <div className="threshold-popup">
                                <div className="popup-header">
                                    <h2>Manage Device Thresholds</h2>
                                    <button className="close-btn" onClick={() => setDevicesPopUp('')}>×</button>
                                </div>
                                
                                <div className="device-name-display">
                                    <span className="device-name">{devices.find(dev => dev.id === deviceToManage)?.name || 'Device'}</span>
                                    <span className={`device-status ${deviceToManage.includes('1') ? 'online' : deviceToManage.includes('3') ? 'warning' : 'offline'}`}>
                                        <span className="status-dot"></span>
                                        {deviceToManage.includes('1') ? 'Online' : deviceToManage.includes('3') ? 'Warning' : 'Offline'}
                                    </span>
                                </div>
                                
                                <div className="threshold-form">
                                    <div className="threshold-group">
                                        <h3>pH Level</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" step="0.1" defaultValue="6.5" />
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" step="0.1" defaultValue="8.0" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>Temperature</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" step="0.1" defaultValue="20.0" />
                                                <span className="unit">°C</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" step="0.1" defaultValue="28.0" />
                                                <span className="unit">°C</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>TDS</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" defaultValue="150" />
                                                <span className="unit">ppm</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" defaultValue="250" />
                                                <span className="unit">ppm</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>Turbidity</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" step="0.1" defaultValue="0" />
                                                <span className="unit">NTU</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" step="0.1" defaultValue="20.0" />
                                                <span className="unit">NTU</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>Water Level</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" defaultValue="70" />
                                                <span className="unit">%</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" defaultValue="100" />
                                                <span className="unit">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="popup-actions">
                                    <button className="action-btn delete-btn" onClick={() => setDevicesPopUp('')}>Cancel</button>
                                    <button className="action-btn manage-btn" onClick={() => {
                                        // Here you would save the threshold values
                                        setDevicesPopUp('');
                                    }}>Save Thresholds</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* add-device */}
                    {(devicesPopUp === 'add-device') && (
                        <div className="popup-overlay">
                            <div className="threshold-popup">
                                <div className="popup-header">
                                    <h2>Add New Device</h2>
                                    <button className="close-btn" onClick={() => setDevicesPopUp('')}>×</button>
                                </div>
                                
                                <div className="add-device-form">
                                    <div className="form-group">
                                        <label htmlFor="deviceId">Device ID</label>
                                        <input 
                                            type="text" 
                                            id="deviceId" 
                                            placeholder="Enter device ID (e.g., PP-001)" 
                                            className="form-input"
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="deviceName">Device Name</label>
                                        <input 
                                            type="text" 
                                            id="deviceName" 
                                            placeholder="Enter a name for your device" 
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                                
                                <div className="popup-actions">
                                    <button className="action-btn delete-btn" onClick={() => setDevicesPopUp('')}>
                                        Cancel
                                    </button>
                                    <button className="action-btn manage-btn" onClick={() => {
                                        // Here you would save the new device
                                        // For now we'll just close the popup
                                        setDevicesPopUp('');
                                        // Display a success message
                                        alert('Device added successfully!');
                                    }}>
                                        Add Device
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* View Analysis */}
            {(activeItem === 'analysis') && (
                <div className='analysis-pnl'>
                    <div className='analysis-top'>

                        {/* graph */}
                        <div className='analysis-left'>
                            <div className='filters'>
                                <div className="sensor-dropdown">
                                    <select 
                                        value={selectedSensor} 
                                        onChange={handleSensorChange}
                                        className="sensor-select"
                                    >
                                        {sensorOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className='chart-area'>
                                <ResponsiveContainer width="95%" height="95%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={true} />
                                        <XAxis 
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#888', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#888', fontSize: 12 }}
                                            dx={-10}
                                        />
                                        <Tooltip 
                                            content={<CustomTooltip />}
                                            cursor={{ stroke: '#ddd', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />
                                        <Legend 
                                            wrapperStyle={{ 
                                                fontSize: '12px',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                flexDirection: 'row',
                                            }}
                                            iconType="circle"
                                            iconSize={8}
                                        />
                                        
                                        {selectedSensor === 'all' || selectedSensor === 'ph' ? (
                                            <Line 
                                                type="monotone" 
                                                dataKey="ph" 
                                                name="pH" 
                                                stroke={getSensorConfig('ph').color}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                animationDuration={1500}
                                            />
                                        ) : null}
                                        
                                        {selectedSensor === 'all' || selectedSensor === 'temp' ? (
                                            <Line 
                                                type="monotone" 
                                                dataKey="temp" 
                                                name="Temperature" 
                                                stroke={getSensorConfig('temp').color}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                animationDuration={1500}
                                            />
                                        ) : null}
                                        
                                        {selectedSensor === 'all' || selectedSensor === 'dissolved solids' ? (
                                            <Line 
                                                type="monotone" 
                                                dataKey="tds" 
                                                name="TDS" 
                                                stroke={getSensorConfig('tds').color}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                animationDuration={1500}
                                            />
                                        ) : null}
                                        
                                        {selectedSensor === 'all' || selectedSensor === 'turbidity' ? (
                                            <Line 
                                                type="monotone" 
                                                dataKey="turbidity" 
                                                name="Turbidity" 
                                                stroke={getSensorConfig('turbidity').color}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                animationDuration={1500}
                                            />
                                        ) : null}
                                        
                                        {selectedSensor === 'all' || selectedSensor === 'water level' ? (
                                            <Line 
                                                type="monotone" 
                                                dataKey="waterLevel" 
                                                name="Water Level" 
                                                stroke={getSensorConfig('waterLevel').color}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                animationDuration={1500}
                                            />
                                        ) : null}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Average */}
                        <div className='analysis-right'>
                            <div className='filters-container'>
                                <div className="filter-group">
                                    <h4>Time Period</h4>
                                    <select 
                                        value={timePeriod}
                                        onChange={handleTimePeriodChange}
                                        className="filter-select"
                                    >
                                        {timePeriodOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-group">
                                    <h4>Device</h4>
                                    <select 
                                        value={selectedDevice}
                                        onChange={handleDeviceChange}
                                        className="filter-select"
                                    >
                                        {devices.map(device => (
                                            <option key={device.id} value={device.id}>
                                                {device.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className='average-data'>
                                <h3>Average Sensor Values</h3>
                                <div className="averages-container">
                                    {Object.keys(averages).map(sensor => {
                                        const config = getSensorConfig(sensor);
                                        return (
                                            <div className="average-item" key={sensor}>
                                                <div className="average-icon" style={{ backgroundColor: config.color }}></div>
                                                <div className="average-details">
                                                    <span className="average-name">{getSensorName(sensor)}</span>
                                                    <span className="average-value">{averages[sensor].toFixed(1)} {config.unit}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        
                    </div>

                    {/* notification */}
                    <div className='analysis-bottom'>
                        <div className='notification-container'>
                            <div className='notification-header'>
                                <h3>Notification History</h3>
                                <div className='notification-controls'>
                                    <select className='notification-filter'>
                                        <option value="all">All Notifications</option>
                                        <option value="warning">Warnings</option>
                                        <option value="critical">Critical Alerts</option>
                                        <option value="info">Information</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className='notification-list'>
                                {/* Critical notification */}
                                <div className='notification-item critical'>
                                    <div className='notification-icon-wrapper'>
                                        <div className='notification-icon'>!</div>
                                    </div>
                                    <div className='notification-content'>
                                        <div className='notification-top-row'>
                                            <span className='notification-title'>Critical: High pH Level</span>
                                            <span className='notification-time'>Apr 11, 10:45 AM</span>
                                        </div>
                                        <p className='notification-message'>pH value 9.2 is critically high in Pond 1. Immediate action required.</p>
                                        <div className='notification-footer'>
                                            <span className='notification-device'>Pond 1</span>
                                            <span className='notification-sensor' style={{ color: '#6366F1' }}>pH</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Warning notification */}
                                <div className='notification-item warning'>
                                    <div className='notification-icon-wrapper'>
                                        <div className='notification-icon'>!</div>
                                    </div>
                                    <div className='notification-content'>
                                        <div className='notification-top-row'>
                                            <span className='notification-title'>Warning: Temperature Rising</span>
                                            <span className='notification-time'>Apr 10, 3:22 PM</span>
                                        </div>
                                        <p className='notification-message'>Temperature 27.8°C is above optimal range for this species.</p>
                                        <div className='notification-footer'>
                                            <span className='notification-device'>Aquarium 2</span>
                                            <span className='notification-sensor' style={{ color: '#F97316' }}>Temperature</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Info notification */}
                                <div className='notification-item info'>
                                    <div className='notification-icon-wrapper'>
                                        <div className='notification-icon'>i</div>
                                    </div>
                                    <div className='notification-content'>
                                        <div className='notification-top-row'>
                                            <span className='notification-title'>Normal Readings</span>
                                            <span className='notification-time'>Apr 9, 9:15 AM</span>
                                        </div>
                                        <p className='notification-message'>All sensors within optimal range for Fish Tank 3.</p>
                                        <div className='notification-footer'>
                                            <span className='notification-device'>Fish Tank 3</span>
                                            <span className='notification-sensor' style={{ color: '#10B981' }}>System</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>                    
                </div>
            )} 
        </div>
    )
}

export default UserHome;