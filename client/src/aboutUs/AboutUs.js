import './AboutUs.css'
import xeroj from './xeroj.jpg'
import velitario from './Velitario, Ylyza Shean.JPG'
import mayo from './Mayo, Nicole T..jpg'
import dexter from './dexter.jpg'
import russell from './russell.jpg'
import anton from './baluya.jpg'
import kiervy from './kiervy.jpg'
import dacayo from './dacayo.jpg'
import aragon from './aragon.jpg'

import us from './us.jpg'


const AboutUs = () => {
    return (
        <div className="about-us">
            <section className="hero">
                <div className="hero-content">
                <h1 className="hero-title">ABOUT <span className="highlight">US</span></h1>
                <p className="hero-description">
                    PondPal helps urban fish farmers monitor the  water quality easily and keep ponds healthy using smart technology.
                </p>
                </div>
            </section>

            <section className="about-section">
                <div className="about-row">
                <img src={us} alt="Mission" className="about-img" />
                <div className="about-text-block">
                    <h2 className="about-subtitle">WHO WE <span className="highlight">ARE</span></h2>
                    <p className="about-text">
                        At PondPal, we are passionate about bringing the freshest, highest-quality
                        We are a college students from Quezon City University. Our team developed PondPal, a smart water quality monitoring system made for urban fish farms. PondPal uses sensors and a web-based dashboard to help fish pond owners easily track important water conditions our goal is to make fish farming safer, easier and more efficient through the use of technology.
                    </p>
                </div>
                </div>
            
                <div className="about-row reverse">
                <img src="catch.png" alt="Catch" className="about-img" />
                <div className="about-text-block">
                    <h2 className="about-subtitle">OUR <span className="highlight">MISSION</span></h2>
                    <p className="about-text">
                        PondPal’s mission is to empower fish pond owners with reliable, real-time water quality insights. By automating monitoring and alerts, the system reduces manual work and improves the overall health of aquatic environments—supporting higher yields and sustainable practices.
                    </p>
                </div>
                </div>
            </section>
            
            <section className="team-section">
                <div className="team-header">
                    <h2>Our Team</h2>
                    <p>Meet the passionate individuals behind our fishpond excellence.</p>
                </div>
            
                <div className="team-members">
                <div className="team-card">
                    <img src={kiervy} alt="Team Member" />
                    <h3>Kiervy Villafania</h3>
                    <p>Project Manager</p>
                </div>
                <div className="team-card">
                    <img src={xeroj} alt="Team Member" />
                    <h3>Xeroj Ulgasan</h3>
                    <p>Programmer</p>
                </div>
                <div className="team-card">
                    <img src={russell} alt="Team Member" />
                    <h3>Russell Calinawan</h3>
                    <p>Assistant Programmer</p>
                </div>
                <div className="team-card">
                    <img src={dacayo} alt="Team Member" />
                    <h3>Jhego Dacayo</h3>
                    <p>Database Administraitor</p>
                </div>
                <div className="team-card">
                    <img src={anton} alt="Team Member" />
                    <h3>Anton Jasper Baluya</h3>
                    <p>Technical Writer 2</p>
                </div>

                <div className="team-card">
                    <img src={velitario} alt="Team Member" />
                    <h3>Ylyza Vellitario 1</h3>
                    <p>System Analyst</p>
                </div>
                <div className="team-card">
                    <img src="enzo.jpg" alt="Team Member" />
                    <h3>Prince Enzo Magundayao</h3>
                    <p>Technical Writer 3</p>
                </div>
                <div className="team-card">
                    <img src={mayo} alt="Team Member" />
                    <h3>Nicole Mayo</h3>
                    <p>Technical Writer 1</p>
                </div>
                <div className="team-card">
                    <img src={dexter} alt="Team Member" />
                    <h3>Dexter Mark Binongcal</h3>
                    <p>System Analyst 2</p>
                </div>
                <div className="team-card">
                    <img src={aragon} alt="Team Member" />
                    <h3>Irriz Gleen Aragon</h3>
                    <p>UI/UX Designer</p>
                </div>
                </div>
            </section>  
        </div>
    )
}

export default AboutUs