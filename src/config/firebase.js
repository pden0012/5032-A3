// Firebase configuration
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCeZhhdRnC4w6J95dZF8z1uy5INqmoS7cY",
  authDomain: "a-333-e9359.firebaseapp.com",
  projectId: "a-333-e9359",
  storageBucket: "a-333-e9359.firebasestorage.app",
  messagingSenderId: "1095937605017",
  appId: "1:1095937605017:web:ef838534cad0da2d0a2708",
  measurementId: "G-1M3CSH0P09"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

export default app
