import './policy.css'

const Policy = () => {
    return (
        <div className="policy-container">
            <header className="policy-header">
                <h1>PondPal Website Policy</h1>
                <div className="subtitle">IoT-based Monitoring for Urban Fish Farms</div>
            </header>

            <main className="policy-content">
                <section className="policy-section">
                    <div className="section-icon">📝</div>
                    <h2>Introduction</h2>
                    <p>Welcome to PondPal, a web-based platform crafted to support urban aquaculture by monitoring and managing water quality parameters. This Website Policy explains the nature of information we collect, how we use it, and the responsibilities of users engaging with our services.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">📊</div>
                    <h2>Data Collection</h2>
                    <p>We collect user information such as names, emails, phone numbers, and login credentials to authenticate access. Our system gathers sensor data including water temperature, pH levels, turbidity, and total dissolved solids (TDS) in real-time. Additionally, we log user interactions within the platform to improve usability and performance.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">🔍</div>
                    <h2>Data Usage</h2>
                    <p>The collected data helps us visualize water quality in real-time, send automated alerts through SMS, email, or web notifications, and store records for analytical review. We also use this data to enhance overall user experience and system functionality.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">🔒</div>
                    <h2>Data Privacy and Security</h2>
                    <p>PondPal upholds strict data protection standards. Sensitive data is encrypted during storage and transmission. User access is protected through secure authentication protocols, and the system undergoes regular security updates. We do not sell or share user data without consent unless required by law.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">👤</div>
                    <h2>User Responsibilities</h2>
                    <p>Users are expected to provide accurate account and sensor information, safeguard their login credentials, and use the system exclusively for fish farming purposes. Proper calibration and maintenance of IoT devices is necessary to ensure reliable data readings.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">⚠️</div>
                    <h2>System Limitations</h2>
                    <p>PondPal is designed as a monitoring solution. It does not automate any aspect of water treatment, cannot function offline or without internet access, and lacks built-in power backup for sensors or gateways.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">🔄</div>
                    <h2>Third-Party Services</h2>
                    <p>To deliver notifications, we integrate with trusted third-party providers. While we carefully select these services, we are not liable for any issues that arise from their systems or policies.</p>
                </section>

                <section className="policy-section">
                    <div className="section-icon">📋</div>
                    <h2>Changes to the Policy</h2>
                    <p>PondPal may revise this policy from time to time. If changes occur, we will notify users via the website or through their registered contact information.</p>
                </section>
            </main>

            <footer className="policy-footer">
                &copy; 2025 PondPal &nbsp;|&nbsp; All Rights Reserved
            </footer>
        </div>
    )
}

export default Policy