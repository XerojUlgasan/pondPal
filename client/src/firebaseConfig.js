import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBKRWhY_MNyoHaTPgY3IuRu2z7Rlc0NdWs",
    authDomain: "pondpal.firebaseapp.com",
    databaseURL: "https://pondpal-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pondpal",
    storageBucket: "pondpal.firebasestorage.app",
    messagingSenderId: "162673881225",
    appId: "1:162673881225:web:787e9caaaa03e2bf7e9658",
    measurementId: "G-GVSV6NFMGY"
};
  
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app)
const fireStoreDb = getFirestore(app)

export {database, auth, fireStoreDb};