import './Register.css'
import database from '../firebaseConfig.js'
import { useState, useEffect, useRef } from 'react'
import { child, equalTo, get, orderByChild, query, ref, set } from 'firebase/database';
import { useNavigate } from "react-router-dom";
// Import the eye icons from a popular icon library like FontAwesome or Feather Icons
// If you don't want to use an icon library, we'll use text instead

const Register = () => {
    const navigate = useNavigate()

    // Initialize state with all form fields
    const [credentials, setCredentials] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        lastName: '',
        firstName: '',
        middleName: '',
        birthdate: '',
        cellphone: ''
    });
    
    // Add password validation state
    const [passwordErrors, setPasswordErrors] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        match: false
    });
    
    // Password validation function
    const validatePassword = (password, confirmPassword) => {
        setPasswordErrors({
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            match: password === confirmPassword && password !== ''
        });
    };
    
    // Check password validity whenever password or confirmPassword changes
    useEffect(() => {
        validatePassword(credentials.password, credentials.confirmPassword);
    }, [credentials.password, credentials.confirmPassword]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));
    };

    //VALIDATIONS
    const isPasswordValid = () => {
        return Object.values(passwordErrors).every(value => value === true);
    };

    const isEmailExist = async (email) => {
        const dataRef = ref(database, '/user/')
        const emailQuery = query(dataRef, orderByChild('email'), equalTo(email))

        try {
            const snapshot = await get(emailQuery);
            return snapshot.exists(); 
        } catch (e) {
            console.error("Email check error:", e);
            return true;
        }
    }

    const isUsernameExist = async (username) => {
        const dataRef = ref(database, '/user')
        
        const snapshot = await get(child(dataRef, username))
        alert('here')
        try {
            return snapshot.exists()
        } catch (error) {
            alert(error)
            return true;
        }
    }

    const registerButton = async (e) => {
        e.preventDefault()

        if (!isPasswordValid()) {
            alert("Password doesn't meet all requirements!");
            return;
        }

        if(await isEmailExist(credentials.email)){
            alert('Email is already registered.')
            return;
        }

        if(await isUsernameExist(credentials.username)){
            alert('Username is already used.')
            return;
        }
        
        set(ref(database, '/user/' + credentials.username), {
            email: credentials.email,
            password: credentials.password,
            lastName: credentials.lastName,
            firstName: credentials.firstName,
            middleName: credentials.middleName,
            birthdate: credentials.birthdate,
            cellphone: credentials.cellphone
        })
        .then(() => {
            alert('Account successfully registered. Proceed to login.')
            navigate("/login")
        })
    }

    // Add state to control tooltip visibility
    const [showTooltip, setShowTooltip] = useState(false);
    
    // Add state to track password visibility
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    return (
        <div className='register'>
            <form onSubmit={registerButton}>
                <div className='acc-info info-cont'>
                    <label className='title'>Account Info</label>
                    
                    <div className='input-group'>
                        <label>Email</label>
                        <input 
                            type='email' 
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            className='inputs' 
                            placeholder='Email'
                            required
                        />
                    </div>

                    <div className='input-group'>
                        <label>Username</label>
                        <input 
                            type='text' 
                            name="username"
                            value={credentials.username}
                            onChange={handleChange}
                            className='inputs' 
                            placeholder='Username'
                            required
                        />
                    </div>

                    <div className='input-group'>
                        <label>Password</label>
                        <div className="password-field">
                            <div className="password-input-container">
                                <input 
                                    type={passwordVisible ? 'text' : 'password'}
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    className='inputs' 
                                    placeholder='Password'
                                    required
                                    onFocus={() => setShowTooltip(true)}
                                    onBlur={() => setShowTooltip(false)}
                                />
                                <button 
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setPasswordVisible(!passwordVisible)}
                                >
                                    {passwordVisible ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            
                            {/* Tooltip for password requirements */}
                            <div className={`password-tooltip ${showTooltip ? 'show' : ''}`}>
                                <div className="tooltip-content">
                                    <h4>Password Requirements:</h4>
                                    <ul>
                                        <li className={passwordErrors.length ? 'valid' : 'invalid'}>
                                            {passwordErrors.length ? '✓' : '○'} At least 8 characters
                                        </li>
                                        <li className={passwordErrors.uppercase ? 'valid' : 'invalid'}>
                                            {passwordErrors.uppercase ? '✓' : '○'} At least one uppercase letter
                                        </li>
                                        <li className={passwordErrors.lowercase ? 'valid' : 'invalid'}>
                                            {passwordErrors.lowercase ? '✓' : '○'} At least one lowercase letter
                                        </li>
                                        <li className={passwordErrors.number ? 'valid' : 'invalid'}>
                                            {passwordErrors.number ? '✓' : '○'} At least one number
                                        </li>
                                        <li className={passwordErrors.special ? 'valid' : 'invalid'}>
                                            {passwordErrors.special ? '✓' : '○'} At least one special character
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='input-group'>
                        <label>Re-enter Password</label>
                        <div className="password-input-container">
                            <input 
                                type={confirmPasswordVisible ? 'text' : 'password'}
                                name="confirmPassword"
                                value={credentials.confirmPassword}
                                onChange={handleChange}
                                className='inputs' 
                                placeholder='Password'
                                required
                            />
                            <button 
                                type="button"
                                className="toggle-password"
                                onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                            >
                                {confirmPasswordVisible ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <p className={passwordErrors.match ? 'valid' : 'invalid'}>
                            {credentials.confirmPassword && (passwordErrors.match ? '✓ Passwords match' : '✗ Passwords do not match')}
                        </p>
                    </div>
                </div>

                <div className='user-info info-cont'>
                    <label className='title'>User Info</label>
                    <div className='cont'>
                        <div className='input-group'>
                            <label>Last Name</label>
                            <input 
                                type='text' 
                                name="lastName"
                                value={credentials.lastName}
                                onChange={handleChange}
                                className='inputs' 
                                placeholder='Last Name'
                                required
                            />
                        </div>

                        <div className='input-group'>
                            <label>First Name</label>
                            <input 
                                type='text' 
                                name="firstName"
                                value={credentials.firstName}
                                onChange={handleChange}
                                className='inputs' 
                                placeholder='First Name'
                                required
                            />
                        </div>

                        <div className='input-group'>
                            <label>Middle Name (optional)</label>
                            <input 
                                type='text' 
                                name="middleName"
                                value={credentials.middleName}
                                onChange={handleChange}
                                className='inputs' 
                                placeholder='Middle Name'
                            />
                        </div>

                        <div className='input-group'>
                            <label>Birthdate</label>
                            <input 
                                type='date' 
                                name="birthdate"
                                value={credentials.birthdate}
                                onChange={handleChange}
                                className='inputs' 
                                placeholder='Birthdate'
                                required
                            />
                        </div>

                        <div className='input-group'>
                            <label>Cellphone Number</label>
                            <input 
                                type='tel' 
                                name="cellphone"
                                value={credentials.cellphone}
                                onChange={handleChange}
                                className='inputs' 
                                placeholder='Cellphone Number'
                                required
                            />
                        </div>

                    </div>
                </div>

                <div className='submit-cont'>
                    <button 
                        type='submit' 
                        className='submit-btn'
                    >
                        Register
                    </button>
                </div>
            </form>
        </div>
    )
}

export default Register