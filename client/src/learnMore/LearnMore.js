import './LearnMore.css'
import ph from './ph.webp'
import tds from './tds.webp'
import temp from './tempt.webp'
import turbidity from './turbidity.webp'
import water from './water.webp'
import pond from './Pond.jpg'

const LearnMore = () => {
    return (
        <div className="learn-more">
            <section className="section top-section">
                <div className="text">
                    <h2>What is PondPal?</h2>
                    <p>
                    PondPal is a specialized IoT-based water quality monitoring system developed exclusively for fish ponds. It offers precise, real-time tracking of key water parameters to maintain a healthy aquatic environment and ideal pond conditions.
                    </p>
                    <p>
                    With integrated sensors and an intuitive web dashboard, PondPal provides actionable insights and automated alerts, helping users manage their ponds efficiently and proactively.
                    </p>
                </div>
                <div className="image">
                    <img src={pond} alt="PondPal pond image" />
                </div>
            </section>

            <section className="section bottom-section">
                <h2>Key Parameters</h2>
                <p className="desc">
                    PondPal is a real-time monitoring system powered by the Internet of Things (IoT) that continuously tracks the following key water parameters:
                </p>
                <div className="icons">
                    <div className="icon-box">
                        <img src={temp} alt="Temperature Icon" />
                        <p>Temperature</p>
                    </div>
                    <div className="icon-box">
                        <img src={ph} alt="pH Icon" />
                        <p>pH Level</p>
                    </div>
                    <div className="icon-box">
                        <img src={turbidity} alt="Turbidity Icon" />
                        <p>Turbidity</p>
                    </div>
                    <div className="icon-box">
                        <img src={tds} alt="TDS Icon" />
                        <div className="multi-line-label">
                            <span>Total Dissolved</span>
                            <span>Solids (TDS)</span>
                        </div>
                    </div>
                    <div className="icon-box">
                        <img src={water} alt="Water Level Icon" />
                        <p>Water Level</p>
                    </div>
                </div>
                <p className="desc">
                    These parameters are measured using integrated sensors, and the data is displayed on a responsive and user-friendly web dashboard. This allows farm operators to make informed decisions quickly and effectively, leading to improved fish health and increased productivity.
                </p>
            </section>

            <section className="section features-section">
                <div className="feature-box">
                    <h2>Why Choose PondPal?</h2>
                    <p>PondPal goes beyond traditional water testing methods by offering modern, technology-driven features that enhance efficiency and precision:</p>
                    <div className="feature-item">
                        <div className="circle">1</div>
                        <div className="feature-content">
                            <b>Real-Time Monitoring</b> 
                            <span>Stay updated on water conditions at all times.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">2</div>
                        <div className="feature-content">
                            <b>Automated Alerts</b> 
                            <span>Instantly receive notifications when water quality deviates from safe levels.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">3</div>
                        <div className="feature-content">
                            <b>Dashboard</b> 
                            <span>An intuitive interface for easy access to real-time and historical data.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">4</div>
                        <div className="feature-content">
                            <b>Remote Accessibility</b> 
                            <span>Access the system anytime, anywhere with an internet connection.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">5</div>
                        <div className="feature-content">
                            <b>Historical Data Logs</b> 
                            <span>Monitor long-term trends to guide decision-making and improve strategies.</span>
                        </div>
                    </div>
                </div>

                <div className="feature-box">
                    <h2>System Limitations</h2>
                    <p>While PondPal provides robust digital monitoring features, it does not perform physical or chemical interventions. Its current limitations include:</p>
                    <div className="feature-item">
                        <div className="circle">1</div>
                        <div className="feature-content">
                            <b>No physical maintenance</b> 
                            <span>The system does not clean or remove debris from ponds.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">2</div>
                        <div className="feature-content">
                            <b>No automated water treatment</b> 
                            <span>Adjustments such as chemical dosing or aeration must be handled manually.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">3</div>
                        <div className="feature-content">
                            <b>Regular calibration & maintenance</b> 
                            <span>Sensor performance depends on proper calibration and regular maintenance.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">4</div>
                        <div className="feature-content">
                            <b>Internet Dependency</b> 
                            <span>Internet connectivity is required for remote access and alert notifications.</span>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="circle">5</div>
                        <div className="feature-content">
                            <b>Power Supply</b> 
                            <span>The system requires a stable power supply to function effectively.</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default LearnMore