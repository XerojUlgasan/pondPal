import './Login.css'
import logoimg from '../images/logo.png'
import { Link } from 'react-router-dom';

const Login = () => {
    return (
        <div className='login'>
            <form>
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
