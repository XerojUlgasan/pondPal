import './Hardware.css'
import esp32 from "./ESP32.jpg"
import batteryShield from "./batteryShield.jpg"
import battery from "./battery.jpg"
import ph from "./ph liquid.png"
import tds from "./tds sensor.jpg"
import temperature from "./temperature sensor.jpg"
import turbidity from "./turbidity sensor.jpg"
import ultrasonic from "./Ultrasonic.png"
import { useEffect, useState } from 'react';

const Hardware = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        // Smooth scroll implementation
        const buttons = document.querySelectorAll('.nav-bar button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                buttons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Scroll to the target section
                const target = button.getAttribute('data-target');
                const element = document.getElementById(target);
                
                if (element) {
                    element.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Show/hide scroll to top button based on scroll position
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        
        // Set first button as active by default
        buttons[0].classList.add('active');
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <>
            <div className="container">
                <div className="nav-bar">
                    <button data-target="esp32">ESP-32</button>
                    <button data-target="phsensor">PH Sensor</button>
                    <button data-target="turbidity">Turbidity</button>
                    <button data-target="uws">UWS</button>
                    <button data-target="tds">TDS</button>
                    <button data-target="temperature">Temperature</button>
                    <button data-target="battery">Battery</button>
                    <button data-target="batteryv8">Battery Shield V8</button>
                </div>

                <div className="content-wrapper">
                    <div className="content" id="esp32">
                        <div className="text">
                            <h2>ESP32 Development Board</h2>
                            <p>
                            It is a powerful microcontroller platform with built-in Wi-Fi and Bluetooth, ideal for IoT, 
                            automation, and smart device applications. Powered by a dual-core processor, it delivers fast 
                            performance and efficient multitasking. With ample memory, versatile GPIOs, and wireless 
                            connectivity, it enables real-time control, data processing, and seamless device integration, 
                            all on a compact, energy-efficient board.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={esp32} alt="ESP32 Development Board"/>
                        </div>
                    </div>

                    <div className="content" id="phsensor">
                        <div className="text">
                            <h2>ph Sensor 4502C</h2>
                            <p>
                            It measures the acidity or alkalinity of a solution by producing an analog voltage based on hydrogen ion concentration.
                            With fast response and high accuracy, it is used in water quality monitoring, hydroponics, aquaculture, and chemical 
                            processing. Though it lacks built-in temperature compensation, pairing it with a temperature sensor ensures reliable readings
                            across varying conditions.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={ph} alt="ph Sensor 4502C"/>
                        </div>
                    </div>

                    <div className="content" id="turbidity">
                        <div className="text">
                            <h2>Turbidity Sensor</h2>
                            <p>
                            It measures the cloudiness or particle concentration in liquids by detecting light scattering through an infrared emitter 
                            and phototransistor. With both analog and digital outputs, it allows adjustable sensitivity for precise monitoring. 
                            It is commonly used in water quality analysis, filtration systems, and environmental monitoring, it offers fast response, 
                            wide detection range, and reliable operation across varied temperatures and conditions.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={turbidity} alt="Turbidity Sensor"/>
                        </div>
                    </div>

                    <div className="content" id="uws">
                        <div className="text">
                            <h2>Ultrasonic Waterproof Sensor JSN-BO2 V2</h2>
                            <p>
                            It measures distance by emitting ultrasonic pulses and detecting their echo, providing accurate, non-contact measurements.
                            With a sealed sensor head for harsh environments, it is ideal for level sensing, obstacle detection, and automation systems. 
                            Supporting digital interfaces like UART or PWM, it ensures versatile integration in outdoor, industrial, or fluid-level 
                            applications.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={ultrasonic} alt="UWS JSN-BO2 V2"/>
                        </div>
                    </div>

                    <div className="content" id="tds">
                        <div className="text">
                            <h2>Total Dissolved Solids Meter V1</h2>
                            <p>
                            It measures the concentration of dissolved substances in water by outputting an analog voltage relative to the ppm level. 
                            With a waterproof probe, it is suitable for continuous monitoring in aquariums, hydroponics, and water purification systems. 
                            Though it requires external temperature compensation, it reliably indicates water quality and mineral content for effective 
                            system control and maintenance.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={tds} alt="TDS V1"/>
                        </div>
                    </div>

                    <div className="content" id="temperature">
                        <div className="text">
                            <h2>Waterproof Temperature Sensor DS18B20</h2>
                            <p>
                            It detects thermal changes with high accuracy and transmits data via a digital OneWire interface.
                            Encased in stainless steel, it's ideal for wet or harsh environments, ensuring reliable performance in temperature-critical 
                            systems.  
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={temperature} alt="Waterproof Temperature Sensor DS18B20"/>
                        </div>
                    </div>

                    <div className="content" id="battery">
                        <div className="text">
                            <h2>18650 Battery (2200 mAh)</h2>
                            <p>
                            It stores and supplies power for portable and embedded systems, delivering stable voltage and high capacity in a compact form.
                            With reliable discharge rates and rechargeability, it is widely used in IoT devices, robotics, and backup power applications, 
                            ensuring efficient energy delivery and extended operational life.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={battery} alt="18650 Battery (2200 mAh)"/>
                        </div>
                    </div>

                    <div className="content" id="batteryv8">
                        <div className="text">
                            <h2>18650 Battery Shield V8</h2>
                            <p>
                            It manages power delivery and safe charging for 18650 batteries, providing regulated 5V and 3.3V outputs via USB and header 
                            pins. With built-in protections and battery level indicators, it ensures safe operation and easy monitoring. Ideal for 
                            powering microcontrollers, IoT projects, and portable electronics, it simplifies battery integration while supporting 
                            dual-cell setups in some versions.
                            </p>
                        </div>
                        <div className="image-box">
                            <img src={batteryShield} alt="18650 Battery Shield V8"/>
                        </div>
                    </div>
                </div>

                {showScrollTop && (
                    <button className="scroll-to-top" onClick={scrollToTop}>
                        {/* Updated SVG that explicitly points upward */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12H9V20H15V12H20L12 4Z" fill="currentColor" />
                        </svg>
                    </button>
                )}
            </div>
        </>
    )
}

export default Hardware;