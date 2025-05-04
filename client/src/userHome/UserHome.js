import React, { useState, useEffect } from 'react';
import './UserHome.css';
import userIcon from '../images/userIcon.png';
import menuIcon from '../images/menuIcon.png';
import addIcon from '../images/add.png';
import analysisIcon from '../images/analysis.png';
import devicesIcon from '../images/devices.png';
import logoutIcon from '../images/logout.png'
import hasNotif from '../images/hasNotif.png'
import noNotif from '../images/noNotif.png'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { data, UNSAFE_createClientRoutesWithHMRRevalidationOptOut, useNavigate } from 'react-router-dom';
import {auth, database, fireStoreDb} from '../firebaseConfig';
import { Database, get, limitToFirst, limitToLast, onValue, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';
import { sendEmailVerification } from 'firebase/auth';
import { arrayRemove, collectionGroup, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';

// Add at the top of your file
let lastToastTime = 0;
const TOAST_DEBOUNCE_MS = 1000;

//userInfo:
//
//email
//firstname
//lastname
//userId
//username

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
        case 'turb': return 'Turbidity';
        case 'watlvl': return 'Water Level';
        default: return type;
    }
};

// Add this helper function near your other helper functions at the top
const addSettingsChangeNotification = async (deviceId, action, user = auth.currentUser.email) => {
  try {
    const notificationRef = ref(database, `/devices/${deviceId}/notifications`);
    await push(notificationRef, {
      type: 'settings',
      action: action,
      user: user,
      time: Date.now().toString(),
      isRead: false
    });
  } catch (error) {
    console.error("Error adding settings change notification:", error);
  }
};

// Add this near your other helper functions at the top of your file

function getAISuggestion(sensors, thresholds = null) {
  // Create default thresholds if none provided
  const defaultThresholds = {
    ph: { min: 6.5, max: 8.5 },
    temp: { min: 20, max: 30 },
    tds: { min: 150, max: 500 },
    turb: { min: 30, max: 100 },
    watlvl: { min: 70, max: 100 }
  };
  
  // Use provided thresholds or defaults
  const t = thresholds || defaultThresholds;
  
  // Initialize results
  const issues = [];
  let severity = "healthy"; // "healthy", "attention", "warning", "critical"
  
  // pH analysis
  if (sensors.ph < t.ph.min - 1.0) {
    issues.push("Critical: pH is extremely low. Perform immediate 30% water change and add limestone or pH buffer.");
    severity = "critical";
  } else if (sensors.ph < t.ph.min - 0.5) {
    issues.push("Warning: pH is too low. Add limestone or pH buffer to raise pH levels.");
    severity = severity === "healthy" ? "warning" : severity;
  } else if (sensors.ph < t.ph.min) {
    issues.push("pH is slightly below ideal range. Consider adding a small amount of pH buffer.");
    severity = severity === "healthy" ? "attention" : severity;
  } else if (sensors.ph > t.ph.max + 1.0) {
    issues.push("Critical: pH is extremely high. Perform immediate 30% water change to reduce pH.");
    severity = "critical";
  } else if (sensors.ph > t.ph.max + 0.5) {
    issues.push("Warning: pH is too high. Perform a partial water change to reduce pH.");
    severity = severity === "healthy" ? "warning" : severity;
  } else if (sensors.ph > t.ph.max) {
    issues.push("pH is slightly above ideal range. Consider a small water change.");
    severity = severity === "healthy" ? "attention" : severity;
  }
  
  // Temperature analysis
  if (sensors.temp < t.temp.min - 3) {
    issues.push("Critical: Water temperature is dangerously low. Install a heater immediately.");
    severity = "critical";
  } else if (sensors.temp < t.temp.min) {
    issues.push("Water temperature is below ideal range. Consider adding a heater.");
    severity = severity === "healthy" ? "attention" : severity;
  } else if (sensors.temp > t.temp.max + 3) {
    issues.push("Critical: Water temperature is dangerously high. Add shade, increase aeration, and consider cooling methods.");
    severity = "critical";
  } else if (sensors.temp > t.temp.max) {
    issues.push("Water temperature is above ideal range. Add shade or increase aeration.");
    severity = severity === "healthy" ? "attention" : severity;
  }
  
  // TDS analysis
  if (sensors.tds < t.tds.min - 50) {
    issues.push("TDS is very low. Consider adding minerals or supplements to increase water hardness.");
    severity = severity === "healthy" ? "attention" : severity;
  } else if (sensors.tds > t.tds.max + 200) {
    issues.push("Critical: TDS is extremely high. Perform a large water change and check for contaminants.");
    severity = "critical";
  } else if (sensors.tds > t.tds.max) {
    issues.push("TDS is high. Check feeding regimen and consider a partial water change.");
    severity = severity === "healthy" ? "attention" : severity;
  }
  
  // Turbidity analysis
  if (sensors.turb > t.turb.max + 50) {
    issues.push("Critical: Water is extremely cloudy. Clean filters, reduce feeding, and perform water change.");
    severity = "critical";
  } else if (sensors.turb > t.turb.max) {
    issues.push("Water turbidity is high. Check and clean filtration system.");
    severity = severity === "healthy" ? "attention" : severity;
  }
  
  // Water level analysis
  if (sensors.watlvl < t.watlvl.min - 20) {
    issues.push("Critical: Water level is dangerously low. Add water immediately.");
    severity = "critical";
  } else if (sensors.watlvl < t.watlvl.min) {
    issues.push("Water level is below ideal range. Add water to maintain proper levels.");
    severity = severity === "healthy" ? "attention" : severity;
  }
  
  // Combined parameter analysis
  if (sensors.ph > 8.0 && sensors.temp > 28) {
    issues.push("Warning: High pH combined with high temperature increases ammonia toxicity risk. Monitor ammonia levels closely.");
    severity = severity === "critical" ? severity : "warning";
  }
  
  if (sensors.turb > 80 && sensors.tds > 400) {
    issues.push("High turbidity and TDS together suggest overfeeding or poor filtration. Reduce feeding and check filters.");
    severity = severity === "critical" ? severity : "warning";
  }
  
  if (sensors.ph < 6.5 && sensors.tds < 100) {
    issues.push("Low pH with low TDS indicates soft, acidic water. Consider adding minerals and pH buffer.");
    severity = severity === "critical" ? severity : "warning";
  }
  
  // Generate final message
  if (issues.length === 0) {
    return {
      message: "All parameters are within optimal range. Your pond appears healthy!",
      severity: "healthy",
      issues: []
    };
  }
  
  return {
    message: issues.join(" "),
    severity: severity,
    issues: issues
  };
}

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
    const [selectedDevice, setSelectedDevice] = useState('');
    const [deviceToManage, setDeviceToManage] = useState('');
    const [devicesPopUp, setDevicesPopUp] = useState('');
    const [refreshTime, setRefreshTime] = useState(Date.now());
    const [device, setDevice] = useState({
        deviceId: '',
        deviceName: '',
        isOnline: '',
        isWarning: '',
        lastUpdate: '',
        sensors: {
            ph: 0,
            tds: 0,
            temp: 0,
            turb: 0,
            watlvl: 0,
        },
        threshold: {
            ph: {min: 0, max: 0},
            tds: {min: 0, max: 0},
            temp: {min: 0, max: 0},
            turb: {min: 0, max: 0},
            watlvl: {min: 0, max: 0}
        }
    })
    const [userInfo, setUserInfo] = useState();
    const [deviceInfo, setDeviceInfo] = useState({
        deviceId: '',
        deviceName: ''
    })
    const [notifs, setNotifs] = useState([])
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA')); // Default to today

    // Add this state to track power saving mode
    const [isPowerSaving, setIsPowerSaving] = useState(false);

    // Add this state to track threshold enable/disable
    const [isThresholdEnabled, setIsThresholdEnabled] = useState(true);

    // Add this with your other state declarations in the UserHome component
    const [pondSuggestion, setPondSuggestion] = useState({ message: "Analyzing...", severity: "healthy", issues: [] });

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

        if(item === 'logout') {
            auth.signOut()
        }

        if(item === 'analysis'){
            if(userInfo?.devices.length === 0) {
                toast.error('You have no devices yet.', {position: 'bottom-center', pauseOnHover: false, autoClose: 2000})
            }
        }
    };

    const handleManageDevice = (e) => {
        if(userInfo?.devices){
            const index = userInfo.devices.findIndex(dev => dev.devId === e.currentTarget.dataset.value)
            setDevice(userInfo.devices[index])
        }
        setDeviceToManage(e.currentTarget.dataset.value);
        setDevicesPopUp('manage');
    }

    const handleAddDevice = (e) => {
        const {name, value} = e.target

        setDeviceInfo((prev) => ({
            ...prev,
            [name]: value
        }))
    }

    // Add this state near your other state declarations
    const [showNotifications, setShowNotifications] = useState(false);

    // Add this helper function for timestamp formatting
    const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    };

    // Add this helper to determine notification type
    const getNotificationType = (sensor, sensorVal, min, max) => {
    if (sensorVal < min || sensorVal > max) {
        // Critical thresholds - very far from acceptable range
        const criticalOffset = {
        ph: 1.0, 
        temp: 3,
        tds: 50,
        turb: 10,
        watlvl: 15
        };
        
        const offset = criticalOffset[sensor] || 0;
        
        if (sensorVal < min - offset || sensorVal > max + offset) {
        return 'critical';
        }
        return 'warning';
    }
    return 'info';
    };

    // Add this function to get sensor unit
    const getSensorUnit = (sensor) => {
    switch(sensor) {
        case 'ph': return '';
        case 'temp': return '°C';
        case 'tds': return 'ppm';
        case 'turb': return 'NTU';
        case 'watlvl': return '%';
        default: return '';
    }
    };

    const insertDeviceToDb = async () => {

        if(deviceInfo.deviceId === '' && deviceInfo.deviceName === ''){
            toast.error('Please fill out all the fields.', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
            return
        }

        if(userInfo?.devices){ //If user has existing devices
            const hasSameName = (userInfo.devices.findIndex(dev => dev.devName === deviceInfo.deviceName) !== -1)
            const hasSameId = (userInfo.devices.findIndex(dev => dev.devId === deviceInfo.deviceId) !== -1)
    
            if(userInfo && hasSameName){
                toast.error('Device name is already used.', {position: 'bottom-center', autoClose: 0, pauseOnHover: false})
                return
            }
    
            if(userInfo && hasSameId){
                toast.error('Device ID is already used.', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                return
            }
        }

        // if(userInfo == null){
        //     alert('Something wrong with the user.')
        //     return
        // }
        // if(userInfo.devices.findIndex(dev => dev.deviceId === deviceInfo.deviceId) !== -1){
        //     alert('Device ID is already added to your devices')
        //     return
        // }
        // if(userInfo.devices.findIndex(dev => dev.deviceName === deviceInfo.deviceName) !== -1){
        //     alert('Device name is already used on within your devices')
        //     return
        // }

        try{
            //DEVICCE CHECKING IF IT EXISTS

            const deviceRef = ref(database, `/devices/${deviceInfo.deviceId}`)
            const snapshot = await get(deviceRef)

            if(!snapshot.exists()){
                toast.error('Device does not exist.', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                return
            }

            const newDevice = {
                devName: deviceInfo.deviceName,
                devId: deviceInfo.deviceId
            }

            setUserInfo(prev => ({
                ...prev,
                devices: [...(prev?.devices || []), newDevice]
            }))

            const docRef = doc(fireStoreDb, 'users', auth.currentUser.uid)
            const docData = await getDoc(docRef)
            const data = docData.data()

            if(!data?.devices){
                await setDoc(docRef, {
                    ...data,
                    devices: [newDevice]
                })
            }else{
                await updateDoc(doc(fireStoreDb, 'users', auth.currentUser.uid), {
                    devices: [...data.devices, newDevice]
                })
                .then(async () => {
                    toast.success('Device Added Successfully', {position: 'top-center', autoClose: 2000, pauseOnHover: false})
                })
                .catch(e => {
                    toast.error('Error Occured', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                })   
            }

            //Inserting users to he devices for device notification
            const devRef = ref(database, `/devices/${deviceInfo.deviceId}/users`)
            await push(devRef, auth.currentUser.email)
            .catch((e) => {
                toast.error('Error Occured', {position: 'top-center', autoClose: 2000, pauseOnHover: false})
            })

            setDeviceInfo({
                deviceId: '',
                deviceName: ''
            })

            setDevicesPopUp('')
            return

        }catch(e){
            alert(e);
        }
    }

    // Sensor options for the dropdown
    const sensorOptions = [
        { value: 'all', label: 'All Sensors' },
        { value: 'ph', label: 'pH Sensor' },
        { value: 'temp', label: 'Temperature Sensor' },
        { value: 'dissolved solids', label: 'TDS Sensor' },
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
        { value: 'daily', label: 'Today' },
        { value: 'weekly', label: 'Last 7 days' },
        { value: 'monthly', label: 'Last 30 days' },
        { value: 'custom', label: 'Custom Date' },
    ];

    // Calculate average values based on chartData
    const calculateAverages = () => {
        if (!userInfo?.devices || userInfo.devices.length === 0) return {};
        if (!Array.isArray(chartData) || chartData.length === 0) return {};
        
        // Match these names to your Firebase data structure
        const sensors = ['ph', 'temp', 'tds', 'turb', 'watlvl'];
        const averages = {};
        
        sensors.forEach(sensor => {
            const values = chartData
                .filter(item => item[sensor] !== undefined)
                .map(item => {
                    // Handle percentage strings like "85%"
                    if (typeof item[sensor] === 'string' && item[sensor].includes('%')) {
                        return parseFloat(item[sensor]);
                    }
                    return item[sensor];
                });

            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                averages[sensor] = sum / values.length;
            }
        });
        
        return averages;
    };

    useEffect(() => {
        if (!userInfo?.devices || userInfo.devices.length === 0) {
            setChartData([]);
        }
    }, [userInfo?.devices]);

    const fetchData = async () => {
        try {
            const data = await generateData();
            if (Array.isArray(data)) {
                setChartData(data);
            } else {
                setChartData([]);
            }
        } catch (error) {
            toast.error("Error fetching chart data", {position: 'bottom-center', autoClose: 2000, pauseOnHover: false});
            setChartData([]);
        }
    };

    useEffect(() => {
        if(activeItem === 'analysis' && userInfo?.devices?.length > 0){
            fetchData();
        }
    }, [selectedSensor, timePeriod, selectedDevice, selectedDate, activeItem, userInfo?.devices?.length]);
    
    useEffect(() => {
        if(userInfo?.devices?.length === 0){
            toast.error('You currently have no device registered', {position: 'bottom-center', pauseOnHover: false, autoClose: 2000})
        }
    }, [selectedSensor, timePeriod, selectedDevice])

    // Generate sample data based on selected sensor
    const generateData = async () => {

        const data = [];

        //selectedDevice == devId
        //timePeriod = daily, weekly, monthly

        if(timePeriod === 'daily') {
            const currDate = new Date(Date.now()).toISOString().split('T')[0] // YYYY-MM-DD
            const devRecordRef = ref(database, `/devices/${selectedDevice}/records/${currDate}`)
            
            try{
                const snapshot = await get(devRecordRef)

                // Then in your generateData() function:
                if(!snapshot.exists()){
                    const now = Date.now();
                    if (now - lastToastTime > TOAST_DEBOUNCE_MS) {
                        toast.info(`No data found for today (${currDate})`, {
                            position: 'bottom-center', 
                            autoClose: 2000,
                            pauseOnHover: false
                        });
                        lastToastTime = now;
                    }
                    return [];
                }

                if(snapshot.exists()){
                    const recordData = snapshot.val()
                    Object.keys(recordData).forEach(hour => {
                        const record = {
                            date: hour,
                            ...recordData[hour]
                        }
    
                        data.push(record)
                    })
    
                    data.sort((a, b) => {
                        const timeA = a.date.split(':').map(Number);
                        const timeB = b.date.split(':').map(Number);
                        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                    });
    
                } else{
                    toast.info(`No data found for today (${currDate})`, {
                        position: 'bottom-center', 
                        autoClose: 2000,
                        pauseOnHover: false
                    })
                    return []
                }
            }catch (error){
                
            }
        }

        // Add to generateData function
        if(timePeriod === 'weekly') {
            // Get data for the past 7 days
            const today = new Date();
            const data = [];
            
            for(let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
                
                const devRecordRef = ref(database, `/devices/${selectedDevice}/records/${formattedDate}`);
                const snapshot = await get(devRecordRef);
                
                if(snapshot.exists()) {
                    // Calculate daily averages
                    const dailyData = snapshot.val();
                    const dailyAverages = {
                        date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                        ph: 0, temp: 0, tds: 0, turb: 0, watlvl: 0,
                        count: { ph: 0, temp: 0, tds: 0, turb: 0, watlvl: 0 }
                    };
                    
                    // Sum all readings for this day
                    Object.values(dailyData).forEach(hourData => {
                        if(hourData.ph) { dailyAverages.ph += parseFloat(hourData.ph); dailyAverages.count.ph++; }
                        if(hourData.temp) { dailyAverages.temp += parseFloat(hourData.temp); dailyAverages.count.temp++; }
                        if(hourData.tds) { dailyAverages.tds += parseFloat(hourData.tds); dailyAverages.count.tds++; }
                        if(hourData.turb) { dailyAverages.turb += parseFloat(hourData.turb); dailyAverages.count.turb++; }
                        
                        // Handle percentage string in watlvl
                        if(hourData.watlvl !== undefined && hourData.watlvl !== null) {
                            let watlvlValue;
                            if (typeof hourData.watlvl === 'string') {
                                watlvlValue = parseFloat(hourData.watlvl);
                            } else {
                                watlvlValue = hourData.watlvl;
                            }
                            dailyAverages.watlvl += watlvlValue;
                            dailyAverages.count.watlvl++;
                        }
                    });
                    
                    // Calculate averages
                    if(dailyAverages.count.ph > 0) dailyAverages.ph /= dailyAverages.count.ph;
                    if(dailyAverages.count.temp > 0) dailyAverages.temp /= dailyAverages.count.temp;
                    if(dailyAverages.count.tds > 0) dailyAverages.tds /= dailyAverages.count.tds;
                    if(dailyAverages.count.turb > 0) dailyAverages.turb /= dailyAverages.count.turb;
                    if(dailyAverages.count.watlvl > 0) dailyAverages.watlvl /= dailyAverages.count.watlvl;
                    
                    // Remove count property
                    delete dailyAverages.count;
                    
                    data.push(dailyAverages);
                }
            }
            
            return data;
        }
        
        if(timePeriod === 'monthly') {
            // Get data for the past 30 days (similar approach to weekly)
            const today = new Date();
            const data = [];
            
            for(let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
                
                const devRecordRef = ref(database, `/devices/${selectedDevice}/records/${formattedDate}`);
                const snapshot = await get(devRecordRef);
                
                if(snapshot.exists()) {
                    // Similar averaging logic as weekly
                    const dailyData = snapshot.val();
                    const dailyAverages = {
                        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        ph: 0, temp: 0, tds: 0, turb: 0, watlvl: 0,
                        count: { ph: 0, temp: 0, tds: 0, turb: 0, watlvl: 0 }
                    };
                    
                    // Calculate averages (same as weekly)
                    Object.values(dailyData).forEach(hourData => {
                        if(hourData.ph) { dailyAverages.ph += parseFloat(hourData.ph); dailyAverages.count.ph++; }
                        if(hourData.temp) { dailyAverages.temp += parseFloat(hourData.temp); dailyAverages.count.temp++; }
                        if(hourData.tds) { dailyAverages.tds += parseFloat(hourData.tds); dailyAverages.count.tds++; }
                        if(hourData.turb) { dailyAverages.turb += parseFloat(hourData.turb); dailyAverages.count.turb++; }
                        
                        if(hourData.watlvl !== undefined && hourData.watlvl !== null) {
                            let watlvlValue;
                            if (typeof hourData.watlvl === 'string') {
                                watlvlValue = parseFloat(hourData.watlvl);
                            } else {
                                watlvlValue = hourData.watlvl;
                            }
                            dailyAverages.watlvl += watlvlValue;
                            dailyAverages.count.watlvl++;
                        }
                    });
                    
                    // Calculate final averages
                    if(dailyAverages.count.ph > 0) dailyAverages.ph /= dailyAverages.count.ph;
                    if(dailyAverages.count.temp > 0) dailyAverages.temp /= dailyAverages.count.temp;
                    if(dailyAverages.count.tds > 0) dailyAverages.tds /= dailyAverages.count.tds;
                    if(dailyAverages.count.turb > 0) dailyAverages.turb /= dailyAverages.count.turb;
                    if(dailyAverages.count.watlvl > 0) dailyAverages.watlvl /= dailyAverages.count.watlvl;
                    
                    delete dailyAverages.count;
                    data.push(dailyAverages);
                }
            }
            
            return data;
        }

        if(timePeriod === 'custom') {
            // Format: YYYY-MM-DD
            const formattedDate = selectedDate;
            const devRecordRef = ref(database, `/devices/${selectedDevice}/records/${formattedDate}`);
            
            try {
                const snapshot = await get(devRecordRef);
                
                if(snapshot.exists()) {
                    const recordData = snapshot.val();
                    Object.keys(recordData).forEach(hour => {
                        const record = {
                            date: hour,
                            ...recordData[hour]
                        };
                        data.push(record);
                    });
                    
                    data.sort((a, b) => {
                        const timeA = a.date.split(':').map(Number);
                        const timeB = b.date.split(':').map(Number);
                        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                    });

                } else {
                    toast.info(`No records found for ${formattedDate}`, {
                        position: 'bottom-center', 
                        autoClose: 2000,
                        pauseOnHover: false
                    });
                    return [];
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Error loading data', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false});
                return [];
            }
        }


        return data;
    };

    useEffect(() => {

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if(user){
                const docRef = doc(fireStoreDb, 'users', auth.currentUser.uid)
                const userData = await getDoc(docRef)
                const data = userData.data()
        
                setUserInfo(data)

            }else {
                toast.error('Signed Out', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false, pauseOnHover: false})
                navigate('/')

            }
        })

        return(() => {{
            unsubscribe()
        }})
    }, [navigate]);

    useEffect(() => {
        const unsubscribes = [];

        if(userInfo?.devices){
            userInfo.devices.forEach(device => {
                const userDeviceRef = ref(database, `/devices/${device.devId}`)
                
                const unsubscribe = onValue(userDeviceRef, (snapshot) => {
                    const deviceData = snapshot.val()

                    setUserInfo(prev => {

                        const deviceIndex = prev.devices.findIndex(d => d.devId === device.devId);
                        
                        if(deviceIndex === -1) return prev;

                        const lastUpdateTime = new Date(parseInt(deviceData?.lastUpdate));
                        const currentTime = new Date(Date.now());
                        const timeDifference = currentTime - lastUpdateTime;
                        const isOnline = timeDifference < 60000;

                        const updatedDevices = [...prev.devices];

                        updatedDevices[deviceIndex] = {
                            ...updatedDevices[deviceIndex],
                            ...deviceData,
                            isOnline
                        };
                        
                        return {
                            ...prev,
                            devices: updatedDevices
                        };
                    });

                })
                unsubscribes.push(unsubscribe);
            })
        }

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [refreshTime, userInfo?.devices?.length])
    
    //Refresher
    useEffect(() => {
        const interval = setInterval(() => {
        setRefreshTime(Date.now());
        }, 60000); 
        return () => clearInterval(interval);
    }, []);

    //For notifications
    useEffect(() => {
        const unsubs = []
        const MAX_NOTIFICATIONS = 50 // Limit number of notifications to avoid memory issues
        const deviceNameMap = {}; // Map to store device IDs to names

        // Create a map of current devices for fast lookup
        if(userInfo?.devices) {
            userInfo.devices.forEach(device => {
                deviceNameMap[device.devId] = device.devName;
            });
            
            userInfo.devices.forEach(device => {
                const devRef = ref(database, `/devices/${device.devId}/notifications`)
                const notifQuery = query(devRef, orderByChild('time'), limitToLast(20))
                
                const unsub = onValue(notifQuery, (snapshot) => {
                    if (snapshot.exists()) {
                        const notifData = snapshot.val()
                        
                        // Convert Firebase object to array
                        const notifArray = Object.keys(notifData).map(key => ({
                            id: key,
                            name: device.devName,
                            ...notifData[key]
                        }))
                        
                        // Sort by time (newest first)
                        notifArray.sort((a, b) => b.time - a.time)
                        
                        // Update state with sorted notifications, limiting the total number
                        setNotifs(prev => {
                            // Filter out notifications from devices that are no longer in the user's device list
                            const validNotifications = prev.filter(n => 
                                Object.values(deviceNameMap).includes(n.name)
                            );
                            
                            const combinedNotifs = [...notifArray, ...validNotifications.filter(n => 
                                !notifArray.some(newNotif => newNotif.id === n.id)
                            )]
                            
                            // Return only the most recent notifications to avoid memory issues
                            return combinedNotifs.slice(0, MAX_NOTIFICATIONS)
                        })
                    }
                }, (error) => {
                    console.error(`Error getting notifications for device ${device.devId}:`, error)
                })

                unsubs.push(unsub)
            })
        } else {
            // If there are no devices, clear all notifications
            setNotifs([]);
        }

        return () => {
            unsubs.forEach(unsub => unsub())
        }
    }, [userInfo?.devices?.length])

    useEffect(() => {
        if (userInfo?.devices && userInfo.devices.length > 0) {
            if (!selectedDevice || !userInfo.devices.some(d => d.devId === selectedDevice)) {
                // If no device is selected or the selected device was removed, select the first one
                setSelectedDevice(userInfo.devices[0].devId);
            }
        } else {
            // Reset selection if there are no devices
            setSelectedDevice('');
        }
    }, [userInfo?.devices, selectedDevice]);

    // Add this state for notification filtering
    const [notificationFilter, setNotificationFilter] = useState('all');

    // Add this handler for notification filter changes
    const handleNotificationFilterChange = (e) => {
        setNotificationFilter(e.target.value);
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    // Add this useEffect to fetch the initial power saving state
    useEffect(() => {
        if (selectedDevice) {
            const powerSavingRef = ref(database, `/devices/${selectedDevice}/isPowerSaving`);
            get(powerSavingRef).then((snapshot) => {
                if (snapshot.exists()) {
                    setIsPowerSaving(snapshot.val());
                }
            }).catch(error => {
                console.error("Error fetching power saving mode:", error);
            });
        }
    }, [selectedDevice]);

    // Update handlePowerSavingToggle function
const handlePowerSavingToggle = async () => {
    try {
        const newValue = !isPowerSaving;
        const powerSavingRef = ref(database, `/devices/${selectedDevice}/isPowerSaving`);
        await set(powerSavingRef, newValue);
        setIsPowerSaving(newValue);
        
        // Add notification for this change
        await addSettingsChangeNotification(
            selectedDevice, 
            `Power saving mode ${newValue ? 'enabled' : 'disabled'}`
        );
        
        toast.success(`Power saving mode ${newValue ? 'enabled' : 'disabled'}`, {
            position: 'top-center',
            autoClose: 2000,
            pauseOnHover: false
        });
    } catch (error) {
        console.error("Error updating power saving mode:", error);
        toast.error("Failed to update power saving mode", {
            position: 'bottom-center',
            autoClose: 2000
        });
    }
};

    // Add this function to handle threshold enable toggle
    const handleThresholdEnableToggle = async () => {
        try {
            const newValue = !isThresholdEnabled;
            setIsThresholdEnabled(newValue);
            
            // Also update in the database
            const thresholdRef = ref(database, `/devices/${deviceToManage}/threshold/isEnabled`);
            await set(thresholdRef, newValue);
            
            // Add notification for this change
            await addSettingsChangeNotification(
                deviceToManage,
                `Threshold notifications ${newValue ? 'enabled' : 'disabled'}`
            );
            
            toast.success(`Threshold notifications ${newValue ? 'enabled' : 'disabled'}`, {
                position: 'top-center',
                autoClose: 2000,
                pauseOnHover: false
            });
        } catch (error) {
            console.error("Error updating threshold enable state:", error);
            toast.error("Failed to update threshold enable state", {
                position: 'bottom-center',
                autoClose: 2000
            });
        }
    };

    const averages = calculateAverages();

    // Add this useEffect after your state declarations and before your return statement

useEffect(() => {
    if (deviceToManage && devicesPopUp === 'manage') {
        // Fetch the threshold object for the selected device
        const thresholdRef = ref(database, `/devices/${deviceToManage}/threshold`);
        get(thresholdRef).then((snapshot) => {
            const data = snapshot.val();
            // If threshold exists and isEnabled is true, check the box; otherwise, uncheck
            if (data && typeof data.isEnabled === 'boolean') {
                setIsThresholdEnabled(data.isEnabled);
            } else {
                setIsThresholdEnabled(false); // Default to unchecked if not set
            }
        }).catch(() => {
            setIsThresholdEnabled(false); // On error, default to unchecked
        });
    }
}, [deviceToManage, devicesPopUp]);

// Add this useEffect after your other useEffects, near the power saving logic

useEffect(() => {
    if (selectedDevice) {
        const powerSavingRef = ref(database, `/devices/${selectedDevice}/isPowerSaving`);
        // Listen for real-time changes
        const unsubscribe = onValue(powerSavingRef, (snapshot) => {
            if (snapshot.exists()) {
                setIsPowerSaving(snapshot.val());
            }
        });
        // Cleanup listener on unmount or device change
        return () => unsubscribe();
    }
}, [selectedDevice]);

// Add this useEffect after your other useEffects, near the chartData logic

useEffect(() => {
    if (!selectedDevice) return;

    let recordsRef;
    let unsubscribe;

    // Listen for changes based on the selected time period
    if (timePeriod === 'daily') {
        const currDate = new Date(selectedDate || Date.now()).toISOString().split('T')[0];
        recordsRef = ref(database, `/devices/${selectedDevice}/records/${currDate}`);
        unsubscribe = onValue(recordsRef, () => {
            fetchData(); // fetchData already updates chartData
        });
    } else if (timePeriod === 'weekly' || timePeriod === 'monthly') {
        // Listen to the whole records node for the device
        recordsRef = ref(database, `/devices/${selectedDevice}/records`);
        unsubscribe = onValue(recordsRef, () => {
            fetchData();
        });
    } else if (timePeriod === 'custom') {
        const customDate = selectedDate;
        recordsRef = ref(database, `/devices/${selectedDevice}/records/${customDate}`);
        unsubscribe = onValue(recordsRef, () => {
            fetchData();
        });
    }

    // Cleanup listener on unmount or when dependencies change
    return () => {
        if (unsubscribe) unsubscribe();
    };
}, [selectedDevice, timePeriod, selectedDate]);

useEffect(() => {
    if (!selectedDevice) return;

    const thresholdRef = ref(database, `/devices/${selectedDevice}/threshold/isEnabled`);
    // Listen for real-time changes to isEnabled
    const unsubscribe = onValue(thresholdRef, (snapshot) => {
        if (snapshot.exists()) {
            setIsThresholdEnabled(snapshot.val());
        }
    });

    // Cleanup listener on unmount or device change
    return () => unsubscribe();
}, [selectedDevice]);

useEffect(() => {
    // Don't need to call fetchData() here as the listener will handle it
    // Just make sure charts are cleared when devices change
    if (activeItem === 'analysis' && userInfo?.devices?.length === 0) {
        setChartData([]);
    }
}, [selectedSensor, timePeriod, selectedDevice, selectedDate, activeItem, userInfo?.devices?.length]);

// Add this useEffect in the UserHome component
useEffect(() => {
  if (activeItem === 'analysis' && selectedDevice && userInfo?.devices) {
    const device = userInfo.devices.find(d => d.devId === selectedDevice);
    if (device && device.sensors) {
      // Generate suggestion based on current sensor values
      const suggestion = getAISuggestion(device.sensors, device.threshold);
      setPondSuggestion(suggestion);
    }
  }
}, [activeItem, selectedDevice, userInfo, refreshTime]);

    return (
        <div className="userHome">
            <div className='above-nav'>
                <img 
                  className='notifs' 
                  src={notifs.length === 0 ? noNotif : hasNotif} 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  style={{ cursor: 'pointer' }}
                />
                <div className='user-cont'>
                    <img src={userIcon}/>
                    <div className='identity-cont'>
                        {auth.currentUser ? (
                            <>
                                <h4>{auth.currentUser.displayName || auth.currentUser.email}</h4>
                                <h6>{auth.currentUser.displayName ? auth.currentUser.email : ''}</h6>
                            </>
                        ) : (
                            <h4>Loading user...</h4>
                        )}
                    </div>
                </div>
            </div>

            {/* Add the notification popup */}
            {showNotifications && (
              <div className="notification-popup-overlay" onClick={() => setShowNotifications(false)}>
                <div className="notification-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="notification-popup-header">
                    <h3>Notifications</h3>
                    <button className="close-btn" onClick={() => setShowNotifications(false)}>×</button>
                  </div>
                  <div className="notification-popup-content">
                    {notifs.length === 0 ? (
                      <div className="empty-notifications">
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifs.map((notification) => {
                        // Handle settings notifications differently
                        if (notification.type === 'settings') {
                            return (
                                <div key={notification.id} className="notification-item info">
                                    <div className="notification-icon-wrapper">
                                        <div className="notification-icon">⚙️</div>
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-top-row">
                                            <span className="notification-title">Settings Changed</span>
                                            <span className="notification-time">{formatNotificationTime(parseInt(notification.time))}</span>
                                        </div>
                                        <p className="notification-message">{notification.action}</p>
                                        <div className="notification-footer">
                                            <span className="notification-device">{notification.name}</span>
                                            <span className="notification-user">{notification.user || 'Unknown user'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // For regular sensor notifications, use the existing code
                        const notificationType = getNotificationType(
                            notification.sensor,
                            notification.sensorVal,
                            notification.min,
                            notification.max
                        );
                        
                        let title = '';
                        let message = '';
                        const sensorUnit = getSensorUnit(notification.sensor);
                        
                        if (notification.sensorVal < notification.min) {
                          title = `${notificationType === 'critical' ? 'Critical: ' : 'Warning: '}Low ${getSensorName(notification.sensor)}`;
                          message = `${getSensorName(notification.sensor)} value ${notification.sensorVal.toFixed(1)}${sensorUnit} is below minimum threshold (${notification.min}${sensorUnit})`;
                        } else if (notification.sensorVal > notification.max) {
                          title = `${notificationType === 'critical' ? 'Critical: ' : 'Warning: '}High ${getSensorName(notification.sensor)}`;
                          message = `${getSensorName(notification.sensor)} value ${notification.sensorVal.toFixed(1)}${sensorUnit} is above maximum threshold (${notification.max}${sensorUnit})`;
                        } else {
                          title = `${getSensorName(notification.sensor)} normal range`;
                          message = `${getSensorName(notification.sensor)} is at ${notification.sensorVal.toFixed(1)}${sensorUnit}, within acceptable range`;
                        }
                        
                        return (
                          <div key={notification.id} className={`notification-item ${notificationType}`}>
                            <div className="notification-icon-wrapper">
                              <div className="notification-icon">
                                {notificationType === 'info' ? 'i' : '!'}
                              </div>
                            </div>
                            <div className="notification-content">
                              <div className="notification-top-row">
                                <span className="notification-title">{title}</span>
                                <span className="notification-time">{formatNotificationTime(parseInt(notification.time))}</span>
                              </div>
                              <p className="notification-message">{message}</p>
                              <div className="notification-footer">
                                <span className="notification-device">{notification.name}</span>
                                <span className="notification-sensor" style={{ color: getSensorConfig(notification.sensor).color }}>
                                  {getSensorName(notification.sensor)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {/* Enhanced Opening/Welcome Page */}
            {(activeItem === '') && (
                <div className='welcome-container'>
                    <div className='welcome-header'>
                        <h1 className='welcome-title'>
                            Welcome to <span className="highlight">PondPal</span>!
                        </h1>
                        <div className="welcome-subtitle">Your Smart Water Monitoring Assistant</div>
                    </div>
                    
                    <div className="welcome-content">
                        <div className="welcome-card">
                            <div className="card-icon">
                                <i className="feature-icon monitoring"></i>
                            </div>
                            <h3>Real-Time Monitoring</h3>
                            <p>PondPal continuously tracks your water quality parameters including pH, temperature, TDS, turbidity, and water level.</p>
                        </div>
                        
                        <div className="welcome-card">
                            <div className="card-icon">
                                <i className="feature-icon alerts"></i>
                            </div>
                            <h3>Smart Alerts</h3>
                            <p>Get instant notifications when any parameter falls outside the optimal range, allowing you to take quick action.</p>
                        </div>
                        
                        <div className="welcome-card">
                            <div className="card-icon">
                                <i className="feature-icon analytics"></i>
                            </div>
                            <h3>Data Analytics</h3>
                            <p>View detailed charts and analytics to understand trends and make informed decisions for your aquatic environment.</p>
                        </div>
                    </div>
                    
                    <div className="welcome-footer">
                        <p className="welcome-description">
                            PondPal is your go-to solution for keeping your fish happy and your pond healthy. Our system helps you maintain a safe and thriving environment for your aquatic life by monitoring essential water parameters and alerting you to potential issues before they become problems.
                        </p>
                        <button className="get-started-btn" onClick={() => handleItemClick('device')}>
                            Get Started
                            <span className="arrow-icon">→</span>
                        </button>
                    </div>
                </div>
            )}
            
            {/* view devices */}
            {(activeItem === 'device') && (
                <div className='devices-container'>
                    {(!userInfo?.devices || userInfo?.devices.length === 0) ? (
                        <div className="empty-devices-message">
                            <h3>No Devices Registered</h3>
                            <p>Please add a device to monitor your pond conditions.</p>
                        </div>
                    ) : (
                        <>
                            <h2 className='devices-title'>Your Devices</h2>
                            <div className='devices'>
                                {userInfo.devices.map(device => (
                                    <div className='device-card' key={device?.devId}>
                                        <div className='device-header'>
                                            <div className='device-name-section'>
                                                <h3>{device?.devName}</h3>
                                                <div className="device-status-wrapper">
                                                    <span className={`device-status ${device?.isOnline ? (device?.isWarning ? 'warning' : 'online') : 'offline'}`}>
                                                        <span className='status-dot'></span>
                                                        {device?.isOnline ? (device?.isWarning ? 'Warning' : 'Online') : 'Offline'}
                                                    </span>
                                                    <span className="device-id-badge">{device?.devId}</span>
                                                </div>
                                            </div>
                                            <div className='device-icon' data-value={device?.devId} onClick={deviceAnalytics}>
                                                <img src={analysisIcon} alt="Device icon"/>
                                            </div>
                                        </div>
                                        
                                        <div className='device-stats'>
                                            <div className='stat-item'>
                                                <span className='stat-label'>pH</span>
                                                <span className='stat-value'>{device.sensors?.ph.toFixed(1)}</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>Temp</span>
                                                <span className='stat-value'>{device.sensors?.temp.toFixed(1)}°C</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>TDS</span>
                                                <span className='stat-value'>{device.sensors?.tds.toFixed(1)}</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>Turbidity</span>
                                                <span className='stat-value'>{device.sensors?.turb.toFixed(1)}</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>Water Level</span>
                                                <span className='stat-value'>
                                                    {(() => {
                                                        const threshold = device.threshold;
                                                        const isThresholdEnabled = threshold?.isEnabled;
                                                        const value = device.sensors?.watlvl?.toFixed(1);

                                                        // Show cm when threshold is disabled or doesn't exist
                                                        if (!threshold || isThresholdEnabled === false) {
                                                            return `${value} cm`;
                                                        } else {
                                                            return `${value}%`;
                                                        }
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className='device-actions'>
                                            <button className='action-btn manage-btn' 
                                                    data-value={device.devId}
                                                    onClick={(e) => handleManageDevice(e)}>
                                                Manage
                                            </button>

                                            <button className='action-btn delete-btn'
                                                    data-value={device.devId}
                                                    onClick={async (e) => {
                                                        try {
                                                            const devId = e.currentTarget.dataset.value
                                                            const index = userInfo.devices.findIndex(d => d.devId === devId)
                                                            
                                                            if (index === -1) {
                                                                toast.error('Device not found', {position: 'bottom-center', autoClose: 2000})
                                                                return
                                                            }
                                                            
                                                            // Store device info before removing from state
                                                            const deviceToRemove = {
                                                                devId: userInfo.devices[index].devId,
                                                                devName: userInfo.devices[index].devName
                                                            }
                                                            
                                                            // Update Firestore first
                                                            await updateDoc(doc(fireStoreDb, 'users', auth.currentUser.uid), {
                                                                devices: arrayRemove(deviceToRemove)
                                                            })
                                                            
                                                            //removes user email to device users
                                                            const snapshot = await get(ref(database, `/devices/${devId}/users`))
                                                            const users = snapshot.val()

                                                            for (const uid of Object.keys(users)) {
                                                                if(users[uid] === auth.currentUser.email){
                                                                    await remove(ref(database, `/devices/${devId}/users/${uid}`));
                                                                }
                                                            }

                                                            // Then update local state
                                                            setUserInfo(prev => {
                                                                const newArray = [...prev.devices]
                                                                newArray.splice(index, 1)
                                                                return {
                                                                    ...prev,
                                                                    devices: newArray
                                                                }
                                                            })
                                                            
                                                            // ADDED CODE: Clean up notifications for deleted device
                                                            setNotifs(prev => prev.filter(notif => notif.name !== deviceToRemove.devName))
                                                            
                                                            setSelectedDevice('')
                                                            toast.success('Device Removed', {position: 'top-center', autoClose: 2000, pauseOnHover: false})
                                                        } catch (error) {
                                                            console.error('Error removing device:', error)
                                                            toast.error('Error occurred while removing device', {position: 'bottom-center', autoClose: 2000})
                                                        }
                                                    }}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* add-device*/}
                    <div className='add-cont'>
                        <button className='add-device' onClick={() => {setDevicesPopUp('add-device')}}>
                            <img src={addIcon} alt="Add Device"/>
                            <h1>Add Device</h1>
                        </button>
                    </div>

                    {/* manage POP UP */}
                    {(devicesPopUp === 'manage') && ( 
                        <div className="popup-overlay">
                            <div className="threshold-popup">
                                <div className="popup-header">
                                    <h2>Manage Device Thresholds</h2>
                                    <button className="close-btn" onClick={() => setDevicesPopUp('')}>×</button>
                                </div>
                                
                                <div className="device-name-display">
                                    <span className="device-name">{device.devName}</span>
                                    <span className={`device-status ${device.isOnline? (device.isWarning? 'warning' : 'online') : 'offline'}`}>
                                        <span className="status-dot"></span>
                                        {device.isOnline? (device.isWarning? 'Warning' : 'Online') : 'Offline'}
                                    </span>
                                </div>
                                
                                <div className="threshold-enable-toggle">
                                    <label className="toggle-container">
                                        <input 
                                            type="checkbox" 
                                            checked={isThresholdEnabled}
                                            onChange={handleThresholdEnableToggle}
                                        />
                                        <span className="toggle-text">Enable Thresholds</span>
                                    </label>
                                    <p className="threshold-status-text">
                                        {isThresholdEnabled 
                                            ? "Threshold notifications are enabled. Device will alert when values are outside safe range." 
                                            : "Threshold notifications are disabled. No alerts will be sent for this device."}
                                    </p>
                                </div>
                                
                                {isThresholdEnabled && (
                                    <div className="threshold-form">
                                        <div className="threshold-group">
                                            <h3>pH Level</h3>
                                            <div className="threshold-inputs">
                                                <div className="input-group">
                                                    <label>Minimum</label>
                                                    <input type="number" step="0.1" min="1" defaultValue={device.threshold?.ph?.min || "6.5"} />
                                                </div>
                                                <div className="input-group">
                                                    <label>Maximum</label>
                                                    <input type="number" step="0.1" min="1" defaultValue={device.threshold?.ph?.max || "8.5"} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="threshold-group">
                                            <h3>Temperature</h3>
                                            <div className="threshold-inputs">
                                                <div className="input-group">
                                                    <label>Minimum</label>
                                                    <input type="number" step="0.1" min="1" defaultValue={device.threshold?.temp?.min || "20"} />
                                                    <span className="unit">°C</span>
                                                </div>
                                                <div className="input-group">
                                                    <label>Maximum</label>
                                                    <input type="number" step="0.1" min="1" defaultValue={device.threshold?.temp?.max || "30"} />
                                                    <span className="unit">°C</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="threshold-group">
                                            <h3>TDS</h3>
                                            <div className="threshold-inputs">
                                                <div className="input-group">
                                                    <label>Minimum</label>
                                                    <input type="number" min="1" defaultValue={device.threshold?.tds?.min || "150"} />
                                                    <span className="unit">ppm</span>                                        
                                                </div>
                                                <div className="input-group">
                                                    <label>Maximum</label>
                                                    <input type="number" min="1" defaultValue={device.threshold?.tds?.max || "500"} />
                                                    <span className="unit">ppm</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="threshold-group">
                                            <h3>Turbidity</h3>
                                            <div className="threshold-inputs">
                                                <div className="input-group">
                                                    <label>Minimum</label>
                                                    <input type="number" step="0.1" min="1" defaultValue={device.threshold?.turb?.min || "30"} />
                                                    <span className="unit">NTU</span>
                                                </div>
                                                <div className="input-group">
                                                    <label>Maximum</label>
                                                    <input type="number" step="0.1" min="1" defaultValue={device.threshold?.turb?.max || "100"} />
                                                    <span className="unit">NTU</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="threshold-group">
                                            <h3>Water Level</h3>
                                            <div className="threshold-inputs">
                                                <div className="input-group">
                                                    <label>Minimum</label>
                                                    <input type="number" min="1" defaultValue={device.threshold?.watlvl?.min || "70"} />
                                                    <span className="unit">%</span>
                                                </div>
                                                <div className="input-group">
                                                    <label>Maximum</label>
                                                    <input type="number" min="1" defaultValue={device.threshold?.watlvl?.max || "100"} />
                                                    <span className="unit">%</span>
                                                </div>
                                            </div>
                                            <div className="threshold-inputs single-input">
                                                <div className="input-group full-width">
                                                    <label>Depth</label>
                                                    <input type="number" min="0.5" defaultValue={device.threshold?.watlvl?.depth || "1"} />
                                                    <span className="unit">cm</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="popup-actions">
                                    <button className="action-btn delete-btn" onClick={() => setDevicesPopUp('')}>Cancel</button>
                                    <button className="action-btn manage-btn" onClick={async () => {
                                        try {
                                            // Create a basic thresholds object with isEnabled flag
                                            let thresholdValues = {
                                                isEnabled: isThresholdEnabled
                                            };
                                            
                                            // Only try to collect form values if the threshold form is visible/enabled
                                            if (isThresholdEnabled) {
                                                // Collect and validate threshold values
                                                const formValues = {
                                                    ph: { 
                                                        min: parseFloat(document.querySelector('.threshold-group:nth-child(1) .input-group:nth-child(1) input').value),
                                                        max: parseFloat(document.querySelector('.threshold-group:nth-child(1) .input-group:nth-child(2) input').value)
                                                    },
                                                    temp: { 
                                                        min: parseFloat(document.querySelector('.threshold-group:nth-child(2) .input-group:nth-child(1) input').value),
                                                        max: parseFloat(document.querySelector('.threshold-group:nth-child(2) .input-group:nth-child(2) input').value)
                                                    },
                                                    tds: { 
                                                        min: parseFloat(document.querySelector('.threshold-group:nth-child(3) .input-group:nth-child(1) input').value),
                                                        max: parseFloat(document.querySelector('.threshold-group:nth-child(3) .input-group:nth-child(2) input').value)
                                                    },
                                                    turb: { 
                                                        min: parseFloat(document.querySelector('.threshold-group:nth-child(4) .input-group:nth-child(1) input').value),
                                                        max: parseFloat(document.querySelector('.threshold-group:nth-child(4) .input-group:nth-child(2) input').value)
                                                    },
                                                    watlvl: { 
                                                        min: parseFloat(document.querySelector('.threshold-group:nth-child(5) .input-group:nth-child(1) input').value),
                                                        max: parseFloat(document.querySelector('.threshold-group:nth-child(5) .input-group:nth-child(2) input').value),
                                                        depth: parseFloat(document.querySelector('.threshold-group:nth-child(5) .single-input .full-width input').value)
                                                    }
                                                };
                                                
                                                // Validate the thresholds
                                                if (Object.values(formValues).some(sensor => 
                                                    (isNaN(sensor.min) || isNaN(sensor.max) || 
                                                    sensor.min > sensor.max || 
                                                    sensor.min < 1 || sensor.max < 1))) {
                                                    throw new Error("Invalid threshold values");
                                                }

                                                if(formValues.watlvl.depth < 0.5){
                                                    throw new Error("watlvl");
                                                }
                                                
                                                // If validation passes, merge with the thresholdValues
                                                thresholdValues = {
                                                    ...formValues,
                                                    isEnabled: isThresholdEnabled
                                                };
                                            } else {
                                                // If thresholds are disabled, use the device's existing threshold values
                                                thresholdValues = {
                                                    ...device.threshold,
                                                    isEnabled: false
                                                };
                                            }
                                            
                                            const deviceRef = ref(database, `/devices/${deviceToManage}/threshold`);
                                            await set(deviceRef, thresholdValues);
                                            
                                            // Add notification about threshold changes
                                            await addSettingsChangeNotification(
                                                deviceToManage,
                                                `Device threshold settings updated`
                                            );
                                            
                                            toast.success('Settings Updated', {position: 'top-center', autoClose: 2000, pauseOnHover: false});
                                            
                                            // Close popup
                                            setDevicesPopUp('');
                                        } catch (error) {
                                            if(error.message === "watlvl"){
                                                toast.error('Minimum value for depth is 0.5 meters', {position: 'bottom-center', autoClose: 3000, pauseOnHover: false})
                                                return;
                                            }

                                            console.error("Error updating thresholds:", error);
                                            toast.error('Error: Ensure all values are at least 1 and maximum values are greater than minimum values', {position: 'bottom-center', autoClose: 3000, pauseOnHover: false})
                                        }
                                    }}>Save Settings</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* add-device POP UP*/}
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
                                            placeholder="Enter device ID" 
                                            className="form-input"
                                            name='deviceId'
                                            required
                                            value={deviceInfo.deviceId}
                                            onChange={handleAddDevice}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="deviceName">Device Name</label>
                                        <input 
                                            type="text" 
                                            id="deviceName" 
                                            placeholder="Enter a name for your device" 
                                            className="form-input"
                                            name='deviceName'
                                            required
                                            value={deviceInfo.deviceName}
                                            onChange={handleAddDevice}
                                        />
                                    </div>
                                </div>
                                
                                <div className="popup-actions">
                                    <button className="action-btn delete-btn" onClick={() => setDevicesPopUp('')}>
                                        Cancel
                                    </button>
                                    <button className="action-btn manage-btn" onClick={() => {
                                        setDevicesPopUp('');
                                        insertDeviceToDb();
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
                        {(!userInfo?.devices || userInfo.devices.length === 0) ? (
                            <div className="no-devices-message">
                                <h2>No Devices Available</h2>
                                <p>Add a device in the Devices panel to see analytics.</p>
                            </div>
                        ) : (
                            <>
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
                                            
                                            <div className="power-saving-toggle">
                                                <span className="toggle-label">Power Saving</span>
                                                <label className="toggle-switch">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isPowerSaving} 
                                                        onChange={handlePowerSavingToggle}
                                                        disabled={!selectedDevice} 
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
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
                                                            dataKey="turb" 
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
                                                            dataKey="watlvl" 
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
                                                    {userInfo?.devices.map(device => (
                                                        <option key={device.devId} value={device.devId}>
                                                            {device.devName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {timePeriod === 'custom' && (
                                                <div className="filter-group">
                                                    <h4>Select Date</h4>
                                                    <input
                                                        type="date"
                                                        value={selectedDate}
                                                        onChange={handleDateChange}
                                                        className="filter-select"
                                                        max={new Date().toLocaleDateString('en-CA')}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className='average-data'>
                                            <h3>Average Sensor Values</h3>
                                            <div className="averages-container">
                                                {Object.keys(averages).map(sensor => {
                                                    const config = getSensorConfig(sensor);
                                                    return (
                                                        <div className="average-item" key={sensor}>
                                                            <div className="average-icon    " style={{ backgroundColor: config.color }}></div>
                                                            <div className="average-details">
                                                                <span className="average-name">{getSensorName(sensor)}</span>
                                                                <span className="average-value">{averages[sensor].toFixed(1)} {config.unit}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className='pond-suggestions'>
                                            <h3>Smart Pond Suggestions</h3>
                                            <div className={`suggestion-box ${pondSuggestion.severity}`}>
                                                <div className="suggestion-header">
                                                    <div className="suggestion-icon">
                                                        {pondSuggestion.severity === 'healthy' && '✓'}
                                                        {pondSuggestion.severity === 'attention' && 'i'}
                                                        {pondSuggestion.severity === 'warning' && '!'}
                                                        {pondSuggestion.severity === 'critical' && '!!'}
                                                    </div>
                                                    <div className="suggestion-status">
                                                        {pondSuggestion.severity === 'healthy' && 'Pond Health: Excellent'}
                                                        {pondSuggestion.severity === 'attention' && 'Pond Health: Good - Minor Adjustments Needed'}
                                                        {pondSuggestion.severity === 'warning' && 'Pond Health: Warning - Action Required'}
                                                        {pondSuggestion.severity === 'critical' && 'Pond Health: Critical - Immediate Action Required'}
                                                    </div>
                                                </div>
                                                <div className="suggestion-content">
                                                    {pondSuggestion.issues && pondSuggestion.issues.length > 0 ? (
                                                        <ul className="suggestions-list">
                                                            {pondSuggestion.issues.map((issue, index) => (
                                                                <li key={index} className="suggestion-item">
                                                                    {issue}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="suggestion-message">{pondSuggestion.message}</p>
                                                    )}
                                                </div>
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
                                                <select 
                                                    className='notification-filter'
                                                    value={notificationFilter}
                                                    onChange={handleNotificationFilterChange}
                                                >
                                                    <option value="all">All Notifications</option>
                                                    <option value="warning">Warnings</option>
                                                    <option value="critical">Critical Alerts</option>
                                                    <option value="info">Normal Range & Settings</option>
                                                    <option value="settings">Settings Changes Only</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className='notification-list'>
                                            {notifs.length === 0 ? (
                                                <div className="empty-notifications">
                                                    <p>No notifications available</p>
                                                </div>
                                            ) : (
                                                // Filter notifications to only show ones from the selected device
                                                notifs
                                                    .filter(notification => {
                                                        // Find the current device name based on selectedDevice ID
                                                        const selectedDeviceName = userInfo?.devices?.find(
                                                            device => device.devId === selectedDevice
                                                        )?.devName;
                                                        
                                                        // First filter by device
                                                        const deviceMatch = notification.name === selectedDeviceName;
                                                        
                                                        // For settings notifications, handle differently
                                                        if (notification.type === 'settings') {
                                                            if (notificationFilter === 'settings') {
                                                                return deviceMatch;  // Only show settings notifications when "Settings Changes Only" is selected
                                                            }
                                                            return deviceMatch && (notificationFilter === 'all' || notificationFilter === 'info');
                                                        }

                                                        // For sensor notifications, use existing filtering
                                                        if (notificationFilter === 'all') {
                                                            return deviceMatch;
                                                        } else {
                                                            const notificationType = getNotificationType(
                                                                notification.sensor,
                                                                notification.sensorVal,
                                                                notification.min,
                                                                notification.max
                                                            );
                                                            return deviceMatch && notificationType === notificationFilter;
                                                        }
                                                    })
                                                    .map((notification) => {
                                                        // Handle settings notifications differently
                                                        if (notification.type === 'settings') {
                                                            return (
                                                                <div key={notification.id} className="notification-item info">
                                                                    <div className="notification-icon-wrapper">
                                                                        <div className="notification-icon">⚙️</div>
                                                                    </div>
                                                                    <div className="notification-content">
                                                                        <div className="notification-top-row">
                                                                            <span className="notification-title">Settings Changed</span>
                                                                            <span className="notification-time">{formatNotificationTime(parseInt(notification.time))}</span>
                                                                        </div>
                                                                        <p className="notification-message">{notification.action}</p>
                                                                        <div className="notification-footer">
                                                                            <span className="notification-device">{notification.name}</span>
                                                                            <span className="notification-user">{notification.user || 'Unknown user'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // For regular sensor notifications, use the existing code
                                                        const notificationType = getNotificationType(
                                                            notification.sensor,
                                                            notification.sensorVal,
                                                            notification.min,
                                                            notification.max
                                                        );
                                                        
                                                        let title = '';
                                                        let message = '';
                                                        const sensorUnit = getSensorUnit(notification.sensor);
                                                        
                                                        if (notification.sensorVal < notification.min) {
                                                            title = `${notificationType === 'critical' ? 'Critical: ' : 'Warning: '}Low ${getSensorName(notification.sensor)}`;
                                                            message = `${getSensorName(notification.sensor)} value ${notification.sensorVal.toFixed(1)}${sensorUnit} is below minimum threshold (${notification.min}${sensorUnit})`;
                                                        } else if (notification.sensorVal > notification.max) {
                                                            title = `${notificationType === 'critical' ? 'Critical: ' : 'Warning: '}High ${getSensorName(notification.sensor)}`;
                                                            message = `${getSensorName(notification.sensor)} value ${notification.sensorVal.toFixed(1)}${sensorUnit} is above maximum threshold (${notification.max}${sensorUnit})`;
                                                        } else {
                                                            title = `${getSensorName(notification.sensor)} normal range`;
                                                            message = `${getSensorName(notification.sensor)} is at ${notification.sensorVal.toFixed(1)}${sensorUnit}, within acceptable range`;
                                                        }
                                                        
                                                        return (
                                                            <div key={notification.id} className={`notification-item ${notificationType}`}>
                                                                <div className="notification-icon-wrapper">
                                                                    <div className="notification-icon">
                                                                        {notificationType === 'info' ? 'i' : '!'}
                                                                    </div>
                                                                </div>
                                                                <div className="notification-content">
                                                                    <div className="notification-top-row">
                                                                        <span className="notification-title">{title}</span>
                                                                        <span className="notification-time">{formatNotificationTime(parseInt(notification.time))}</span>
                                                                    </div>
                                                                    <p className="notification-message">{message}</p>
                                                                    <div className="notification-footer">
                                                                        <span className="notification-device">{notification.name}</span>
                                                                        <span className="notification-sensor" style={{ color: getSensorConfig(notification.sensor).color }}>
                                                                            {getSensorName(notification.sensor)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            )}
                                        </div>
                                    </div>
                                </div> 
                            </>
                        )}                   
                </div>
            )} 
        </div>
    )
}

export default UserHome;