import './Login.css'
import logoimg from '../images/logo.png'
import { Link } from 'react-router-dom';
import database from '../firebaseConfig.js'
import { onChildAdded, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

const Login = () => {

    const [deviceData, setDeviceData] = useState(null);

    useEffect(() => {
        console.log("Setting up Firebase listener for /devices");
        const dbRef = ref(database, '/Devices');
        
        const unsubscribe = onValue(dbRef, 
            (snapshot) => {
                const data = snapshot.val();
                console.log("Data changed:", data);
                setDeviceData(data);
            }, 
            (error) => {
                console.error("Firebase error:", error);
            }
        );
        
        // Cleanup function
        return () => {
            console.log("Removing Firebase listener");
            unsubscribe();
        };
    }, []);

    return (
        <div className='login'>
            <form action='/userhome'>
                <img src={logoimg} className='logo'/>
                <label className='ewan'>Login</label>
                <input type='text' className='user' placeholder='Email'/>
                <input type='password' className='pass' placeholder='Password'/> 
                
                <button type='submit' className='submit'>Login</button> <br/>
                <label>Don't have an account yet? <Link to='/register'>Click here to Sign Up</Link></label>
            </form>
        </div>
    )
}

export default Login;
