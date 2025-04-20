import './App.css';
import Navbar from './navbar/Navbar';
import Homepage from './homepage/Homepage';
import { BrowserRouter, Routes, Route  } from 'react-router-dom';
import Login from './login/Login';
import Register from './register/Register';
import UserHome from './userHome/UserHome';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AboutUs from './aboutUs/AboutUs';
import LearnMore from './learnMore/LearnMore';
import Policy from './policy/policy';

function App() {
  return (
    <div className="App">
      <BrowserRouter>

        <Navbar />

        <Routes>
          
          <Route exact path="/" element={<Homepage />}/>
          <Route path="/aboutus" element={<AboutUs/>} />
          <Route path="/learnmore" element={<LearnMore/>} />
          <Route path="/policy" element={<Policy/>} />
          
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/userhome" element={<UserHome/>} />

          <Route path="*" element={<h1>Error 404 - PAGE NOT FOUND</h1>}/>
        </Routes>
        <ToastContainer/>
      </BrowserRouter>
    </div>
  );
}

export default App;
