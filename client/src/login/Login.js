import './Login.css'
import logoimg from '../images/logo.png'
import { data, Link, useNavigate } from 'react-router-dom';
import {auth, database, fireStoreDb} from '../firebaseConfig.js'
import { child, equalTo, get, onChildAdded, onValue, orderByChild, query, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { getAuth, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const Login = () => {
    const provider = new GoogleAuthProvider()
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

    //SIGN IN WITH GOOGLE
    const handleGooglePopUp = async () => {
        const result = await signInWithPopup(auth, provider)
        .catch(e => {
            console.log(e)
        })

        if(result) {

            const user = await getDoc(doc(fireStoreDb, 'users', result.user.uid))

            if(!user.exists()){ //Create document in fire store if not exists
                await setDoc(doc(fireStoreDb, 'users', result.user.uid), {
                    email: result.user.email,
                    devices: []
                })
                    .then(() => {
                        toast.success(`Login Success`, {position: 'top-center', autoClose: 2000, pauseOnHover: false})
                        navigate('/userhome')
                    })
                    .catch((e) => {
                        toast.error('Error Occured', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                    })
            }else { 
                toast.success(`Login Success`, {position: 'top-center', autoClose: 2000, pauseOnHover: false})
                navigate('/userhome')
            }
        }
    }

    const formSubmit = async (e) => {
        e.preventDefault()

        if(details.email === null || details.email === ''){
            toast.error('Invalid Email!', {position: 'bottom-center', autoClose: 2000, autoClose: 2000, pauseOnHover: false})
            return
        }

        if(details.password === null || details.password === ''){
            toast.error('Invalid Password!', {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
            return
        }

        await signInWithEmailAndPassword(auth, details.email, details.password)
            .then(() => {
                toast.success(`Login Success`, {position: 'top-center', autoClose: 2000, pauseOnHover: false})
                navigate('/userhome')
            })
            .catch((e) => {
                if(e.error === 'auth/invalid-credential') {
                    toast.error(`Invalid Credentials`, {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                }else{
                    toast.error(`Error Occured`, {position: 'bottom-center', autoClose: 2000, pauseOnHover: false})
                }
            })

        // const dataRef = ref(database, '/user')
        // const emailQuery = query(dataRef, orderByChild('email'), equalTo(details.email.toLowerCase()))
        
        // try {
            
        //     const snapshot = await get(emailQuery)
        //     const userData = snapshot.val()
            
        //     if(!userData){
        //         alert('Email cannot find')
        //         return
        //     }

        //     const user = userData[Object.keys(userData)[0]]

        //     if(user.password === details.password){
        //         const userInfo = {
        //             userId: Object.keys(userData)[0],
        //             username: user.username,
        //             firstname: user.firstName,
        //             lastname: user.lastName,
        //             email: user.email,
        //             devices: user.devices ? Object.values(user.devices) : []
        //         }

        //         console.log('Storing...')
        //         localStorage.setItem('userInfo', JSON.stringify(userInfo))

        //         console.log('Redirecting...')
        //         navigate('/userhome')
        //     }else{
        //         alert('Password Incorrect')
        //         return
        //     }

        // } catch (error) {
        //     alert(error)
        // }

    }
    const sendingVerification = async (user) => {
        await sendEmailVerification(user)
    }
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if(user?.emailVerified){
                navigate('/userhome')
            }
        })
        // if(localStorage.getItem("userInfo")) {
        //     navigate('/userhome')
        // }

        return () => {
            unsubscribe()
        }
    }, [])

    const handleForgotPassword = async () => {
        if (!details.email) {
            toast.error('Please enter your email address first', {
                position: 'bottom-center', 
                autoClose: 2000, 
                pauseOnHover: false
            });
            return;
        }
        
        try {
            await sendPasswordResetEmail(auth, details.email);
            toast.success('Password reset email sent! Check your inbox.', {
                position: 'top-center', 
                autoClose: 3000, 
                pauseOnHover: false
            });
        } catch (error) {
            console.error('Error sending password reset email:', error);
            let errorMessage = 'Failed to send password reset email';
            
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address';
            }
            
            toast.error(errorMessage, {
                position: 'bottom-center', 
                autoClose: 3000, 
                pauseOnHover: false
            });
        }
    };

    return (
        <div className='login'>
            <form action='/userhome' onSubmit={formSubmit}>

                <label 
                className='ewan'>Log In</label>

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

                <div className="forgot-password-container">
                    <span className="forgot-password" onClick={handleForgotPassword}>
                        Forgot password?
                    </span>
                </div>
                
                <button 
                type='submit' 
                className='submit'>Login</button> <br/>

                <label>Don't have an account yet?<br/><Link to='/register'>Click here to Sign Up</Link></label>
                <label>Or</label>
                <label onClick={() => handleGooglePopUp()}><a>Continue With Google</a></label>
            </form>
        </div>
    )
}

export default Login;
