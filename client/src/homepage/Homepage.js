
import "./Homepage.css"
import database from "../firebaseConfig.js"
import { set, ref, serverTimestamp } from "firebase/database"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"

const Homepage = () => {
    const navigate = useNavigate()

    useEffect(() => {
        if(localStorage.getItem('userInfo')){
            navigate('/userhome')
        }
    }, [])

    return (
        <div className="homepage">
            <div className="left">
                <div className="compname">
                        <div className="lamao">
                            <h1 className="f">POND</h1>
                            <h1 className="w">PAL</h1>
                        </div>
                        <h3>Water health monitoring for fish farm</h3>
                </div>
            </div>

            <div className="right">
                <h1>GET STARTED!</h1>
                <button>LEARN MORE</button>
            </div>
        </div>
    )
}

export default Homepage