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
            console.log('annalysis clicked', userInfo)
            if(userInfo?.devices.length === 0) {
                toast.error('You have no devices yet.', {position: 'bottom-center', pauseOnHover: false, autoClose: 2000})
            }
        }
    };

    const handleManageDevice = (e) => {
        if(userInfo?.devices){
            const index = userInfo.devices.findIndex(dev => dev.devId === e.currentTarget.dataset.value)
            setDevice(userInfo.devices[index])
            console.log(index)
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
                toast.error('Device name is already used.', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
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

            // //REGISTERING CURRENT USER TO THE DEVICE'S USERS
            // const deviceUserRef = ref(database, `/devices/${deviceInfo.deviceId}/users`)
            // const uniqueKey = await push(deviceUserRef, userInfo?.username)
            // console.log('User is registered to the device successfully!')

            // //ADDING DEVICE TO USER'S DEVICE
            // const userDevicesRef = ref(database, `/user/${userInfo?.userId}/devices`)
            // push(userDevicesRef, {
            //                         deviceId: deviceInfo.deviceId,
            //                         deviceName: deviceInfo.deviceName
            //                     })
            // console.log('Device is registered to the user successfully!')

            // console.log('Updating user info...')

            // setUserInfo(prev => ({
            //     ...prev,
            //     devices: [...prev.devices, {
            //                                 deviceId: deviceInfo.deviceId,
            //                                 deviceName: deviceInfo.deviceName
            //                                 }]
            // }))

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
                    console.log(e)
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
        { value: 'daily', label: 'Today' },
        { value: 'weekly', label: 'Last 7 days' },
        { value: 'monthly', label: 'Last 30 days' },
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
    }, [selectedSensor, timePeriod, selectedDevice, activeItem, userInfo?.devices?.length]);
    
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
    
                    console.log(data)
                } else{
                    console.log(`No data for ${currDate}`)
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

        console.log(data)
        return data;
    };

    useEffect(() => {

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if(user){
                const docRef = doc(fireStoreDb, 'users', auth.currentUser.uid)
                const userData = await getDoc(docRef)
                const data = userData.data()
        
                setUserInfo(data)
                console.log('User Logged in', user)
                console.log(userInfo)
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

                        const lastUpdateTime = new Date(deviceData?.lastUpdate);
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
                    console.log(userInfo)
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
            console.log('refresh')
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
        console.log(notifs)
    }, [notifs])

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

    const averages = calculateAverages();

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
                                <span className="notification-time">{formatNotificationTime(notification.time)}</span>
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
                                                <span className={`device-status ${device?.isOnline ? (device?.isWarning ? 'warning' : 'online') : 'offline'}`}>
                                                    <span className='status-dot'></span>
                                                    {device?.isOnline ? (device?.isWarning ? 'Warning' : 'Online') : 'Offline'}
                                                </span>
                                            </div>
                                            <div className='device-icon' data-value={device?.devId} onClick={deviceAnalytics}>
                                                <img src={analysisIcon} alt="Device icon"/>
                                            </div>
                                        </div>
                                        
                                        <div className='device-stats'>
                                            <div className='stat-item'>
                                                <span className='stat-label'>pH</span>
                                                <span className='stat-value'>{device.sensors?.ph}</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>Temp</span>
                                                <span className='stat-value'>{device.sensors?.temp}°C</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>TDS</span>
                                                <span className='stat-value'>{device.sensors?.tds}</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>Turbidity</span>
                                                <span className='stat-value'>{device.sensors?.turb}</span>
                                            </div>
                                            <div className='stat-item'>
                                                <span className='stat-label'>Water Level</span>
                                                <span className='stat-value'>{device.sensors?.watlvl}%</span>
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
                    {(devicesPopUp === 'manage') && ( //refer to deviceToManage for the chosen device name
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
                                
                                <div className="threshold-form">
                                    <div className="threshold-group">
                                        <h3>pH Level</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" step="0.1" defaultValue={device.threshold?.ph.min || "6.5"} />
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" step="0.1" defaultValue={device.threshold?.ph.max || "8.0"} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>Temperature</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" step="0.1" defaultValue={device.threshold?.temp.min || "20"} />
                                                <span className="unit">°C</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" step="0.1" defaultValue={device.threshold?.temp.max || "28"} />
                                                <span className="unit">°C</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>TDS</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" defaultValue={device.threshold?.tds.min || "150"} />
                                                <span className="unit">ppm</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" defaultValue={device.threshold?.tds.max || "250"} />
                                                <span className="unit">ppm</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>Turbidity</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" step="0.1" defaultValue={device.threshold?.turb.min || "0"} />
                                                <span className="unit">NTU</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" step="0.1" defaultValue={device.threshold?.turb.max || "20"} />
                                                <span className="unit">NTU</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="threshold-group">
                                        <h3>Water Level</h3>
                                        <div className="threshold-inputs">
                                            <div className="input-group">
                                                <label>Minimum</label>
                                                <input type="number" defaultValue={device.threshold?.watlvl.min || "70"} />
                                                <span className="unit">%</span>
                                            </div>
                                            <div className="input-group">
                                                <label>Maximum</label>
                                                <input type="number" defaultValue={device.threshold?.watlvl.max || "100"} />
                                                <span className="unit">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="popup-actions">
                                    <button className="action-btn delete-btn" onClick={() => setDevicesPopUp('')}>Cancel</button>
                                    <button className="action-btn manage-btn" onClick={async () => {
                                        try {
                                            // Get all form inputs by their labels rather than indexes
                                            const newThresholds = {
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
                                                    max: parseFloat(document.querySelector('.threshold-group:nth-child(5) .input-group:nth-child(2) input').value)
                                                }
                                            };
                                            
                                            // Validate thresholds
                                            if (Object.values(newThresholds).some(sensor => 
                                                isNaN(sensor.min) || isNaN(sensor.max) || sensor.min > sensor.max)) {
                                                throw new Error("Invalid threshold values");
                                            }
                                            
                                            const deviceRef = ref(database, `/devices/${deviceToManage}/threshold`)
                                            await set(deviceRef, newThresholds)
                                            toast.success('Threshold Updated', {position: 'top-center', autoClose: 2000, pauseOnHover: false})
                                            
                                            // Close popup
                                            setDevicesPopUp('');
                                        } catch (error) {
                                            console.error("Error updating thresholds:", error);
                                            toast.error('Error Updating Thresholds', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                                        }
                                    }}>Save Thresholds</button>
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
                                                <select 
                                                    className='notification-filter'
                                                    value={notificationFilter}
                                                    onChange={handleNotificationFilterChange}
                                                >
                                                    <option value="all">All Notifications</option>
                                                    <option value="warning">Warnings</option>
                                                    <option value="critical">Critical Alerts</option>
                                                    <option value="info">Normal Range</option>
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
                                                        
                                                        // Then apply notification type filter
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
                                                                        <span className="notification-time">{formatNotificationTime(notification.time)}</span>
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