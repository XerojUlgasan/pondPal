import './Login.css'
import logoimg from '../images/logo.png'
import { data, Link, useNavigate } from 'react-router-dom';
import database from '../firebaseConfig.js'
import { child, equalTo, get, onChildAdded, onValue, orderByChild, query, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

const Login = () => {
    const navigate = useNavigate();

    const [details, setDetails] = useState({
        email: '',
        password: ''
    })

    const handleChange = (e) => {
        const {name, value} = e.target
        setDetails(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const formSubmit = async (e) => {
        e.preventDefault()

        const dataRef = ref(database, '/user')
        const emailQuery = query(dataRef, orderByChild('email'), equalTo(details.email.toLowerCase()))
        
        try {
            
            const snapshot = await get(emailQuery)
            const userData = snapshot.val()
            
            if(!userData){
                alert('Email cannot find')
                return
            }

            const user = userData[Object.keys(userData)[0]]

            if(user.password === details.password){
                const userInfo = {
                    userId: Object.keys(userData)[0],
                    username: user.username,
                    firstname: user.firstName,
                    lastname: user.lastName,
                    email: user.email,
                    devices: user.devices ? Object.values(user.devices) : []
                }

                console.log('Storing...')
                localStorage.setItem('userInfo', JSON.stringify(userInfo))

                console.log('Redirecting...')
                navigate('/userhome')
            }else{
                alert('Password Incorrect')
                return
            }

        } catch (error) {
            alert(error)
        }

    }

    useEffect(() => {
        if(localStorage.getItem("userInfo")) {
            navigate('/userhome')
        }
    }, [])

    return (
        <div className='login'>
            <form action='/userhome' onSubmit={formSubmit}>
                <img 
                src={logoimg} 
                className='logo'/>

                <label 
                className='ewan'>Login</label>

                <input 
                type='text' 
                className='user' 
                name='email'
                placeholder='Email'
                required
                value={details.email}
                onChange={handleChange}/>

                <input 
                type='password' 
                className='pass'
                name='password'
                placeholder='Password'
                required
                value={details.password}
                onChange={handleChange}/> 
                
                <button 
                type='submit' 
                className='submit'>Login</button> <br/>

                <label>Don't have an account yet? <Link to='/register'>Click here to Sign Up</Link></label>
            </form>
        </div>
    )
}

export default Login;
