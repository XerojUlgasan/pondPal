import './Navbar.css';
import logoImg from '../images/logo2.png';
import userIcon from '../images/userIcon.png';
import menuIcon from '../images/menuIcon.png';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Navbar = () => {
    const loc = useLocation();
    const pn = loc.pathname;
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [menuOpen, setMenuOpen] = useState(false);

    // Handle window resize to detect mobile view
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth > 768) {
                setMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Toggle menu function
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <>
            <div className="navbar">
                <Link to="/">
                    <div className="left">
                        <img className="icon" src={logoImg} alt="Logo"/>
                        {pn !== '/' && (
                            <>
                                <p className="f">POND</p><p className="w">PAL</p>
                            </>
                        )}
                    </div>
                </Link>
                
                {!isMobile ? (
                    <div className='center'>
                        {!pn.includes('userhome') && (
                            <>
                                <h4><Link to='/'>Home</Link></h4>
                                <h4><Link to='/hardware'>Hardware</Link></h4>
                                <h4><Link to='/policy'>Policy</Link></h4>
                                <h4><Link to='/aboutus'>About</Link></h4>  
                            </>
                        )}
                    </div>
                ) : (
                    !pn.includes('userhome') && (
                        <div className="mobile-menu-icon" onClick={toggleMenu}>
                            <img className="icon" src={menuIcon} alt="Menu"/>
                        </div>
                    )
                )}

                <div className="right">
                    {!pn.includes('userhome') && (
                        <div className='sign'>
                            <Link to='/register' className="btn signup-btn">SIGN UP</Link>
                            <Link to='/login' className="btn login-btn">LOG IN</Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {isMobile && menuOpen && !pn.includes('userhome') && (
                <div className="mobile-dropdown">
                    <h4><Link to='/' onClick={() => setMenuOpen(false)}>Home</Link></h4>
                    <h4><Link to='/hardware' onClick={() => setMenuOpen(false)}>Hardware</Link></h4>
                    <h4><Link to='/policy' onClick={() => setMenuOpen(false)}>Policy</Link></h4>
                    <h4><Link to='/aboutus' onClick={() => setMenuOpen(false)}>About</Link></h4>
                </div>
            )}
        </>
    )
}

export default Navbar;