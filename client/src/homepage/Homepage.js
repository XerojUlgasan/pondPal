import "./Homepage.css"
import { auth } from "../firebaseConfig.js"
import { Link, useNavigate } from "react-router-dom"
import { useEffect } from "react"

const Homepage = () => {
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if(user){
                navigate('/userhome')
            }
        })
        
        return () => unsubscribe()
    }, [navigate]) 

    return (
        <div className="homepage">
            <div className="left">
                <div className="compname">
                    <div className="lamao">
                        <h1 className="f">POND</h1>
                        <h1 className="w">PAL</h1>
                    </div>
                    <h3>Water health monitoring for fish farms</h3>
                </div>
            </div>

            <div className="right">
                <h1>GET STARTED!</h1>
                <button><Link to='./learnmore'>LEARN MORE</Link></button>
            </div>
        </div>
    )
}

export default Homepage