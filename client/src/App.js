import './App.css';
import Navbar from './navbar/Navbar';
import Homepage from './homepage/Homepage';
import { BrowserRouter, Routes, Route  } from 'react-router-dom';
import Login from './login/Login';
import Register from './register/Register';
import UserHome from './userHome/UserHome';

function App() {
  return (
    <div className="App">
      <BrowserRouter>

        <Navbar />

        <Routes>
          <Route exact path="/" element={<Homepage />} />
        </Routes>

        <Routes>
          <Route exact path="/login" element={<Login/>} />
        </Routes>

        <Routes>
          <Route exact path="/register" element={<Register/>} />
        </Routes>

        <Routes>
          <Route exact path="/userHome" element={<UserHome/>} />
        </Routes>

      </BrowserRouter>
    </div>
  );
}

export default App;
