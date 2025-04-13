import './Navbar.css';
import logoImg from '../images/logo2.png';
import userIcon from '../images/userIcon.png';
import menuIcon from '../images/menuIcon.png';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const loc = useLocation();
    const pn = loc.pathname;

    return (
        <div className="navbar">
            <Link to="/">
                <div className="left">
                    <img className="icon" src={logoImg}/>
                    {pn !== '/' && (
                        <>
                            <p className="f">POND</p><p className="w">PAL</p>
                        </>
                    )}
                </div>
            </Link>
            
            <div className='center'>
                {!pn.includes('userhome') && (
                    <>
                        <h4><Link to='/'>Home</Link></h4>
                        <h4><Link>Hardware</Link></h4>
                        <h4><Link>Policy</Link></h4>
                        <h4><Link>About</Link></h4>  
                    </>
                )}
            </div>

            <div className="right">
                {!pn.includes('userhome') && (
                    <div className='sign'>
                        <h3><Link to='/register'>SIGN UP</Link></h3>
                        <div className='vr'></div>
                        <h3><Link to='/login'>LOG IN</Link></h3>
                    </div>
                )}
                {/* <img className="icon" src={menuIcon}/> */}
            </div>
        </div>
    )
}

export default Navbar;