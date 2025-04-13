import './Register.css'

const Register = () => {
    return (
        <div className='register'>
            <form>
                <div className='acc-info info-cont'>
                    <label className='title'>Account Info</label>
                    
                    <div className='input-group'>
                        <label>Email</label>
                        <input type='email' className='inputs' placeholder='Email'/>
                    </div>

                    <div className='input-group'>
                        <label>Password</label>
                        <input type='password' className='inputs' placeholder='Password'/>
                    </div>

                    <div className='input-group'>
                        <label>Re-enter Password</label>
                        <input type='password' className='inputs' placeholder='Password'/>
                    </div>
                </div>

                <div className='user-info info-cont'>
                    <label className='title'>User Info</label>
                    <div className='cont'>

                        <div className='input-group'>
                            <label>Last Name</label>
                            <input type='text' className='inputs' placeholder='Last Name'/>
                        </div>

                        <div className='input-group'>
                            <label>First Name</label>
                            <input type='text' className='inputs' placeholder='First Name'/>
                        </div>

                        <div className='input-group'>
                            <label>Middle Name (optional)</label>
                            <input type='text' className='inputs' placeholder='Middle Name'/>
                        </div>

                        <div className='input-group'>
                            <label>Birthdate</label>
                            <input type='date' className='inputs' placeholder='Birthdate'/>
                        </div>

                        <div className='input-group'>
                            <label>Cellphone Number</label>
                            <input type='tel' className='inputs' placeholder='Cellphone Number'/>
                        </div>

                    </div>
                </div>

                <div className='submit-cont'>
                    <button type='submit' className='submit-btn'>Register</button>
                </div>
            </form>
        </div>
    )
}

export default Register