// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_MyjSFLB-mHDWWaOfAlRetLDB_pAxgR0",  // *** REPLACE WITH YOUR ACTUAL API KEY ***
  authDomain: "ango-592a4.firebaseapp.com", // *** REPLACE WITH YOUR ACTUAL AUTH DOMAIN ***
  databaseURL: "https://ango-592a4-default-rtdb.firebaseio.com",  // *** REPLACE WITH YOUR ACTUAL DATABASE URL ***
  projectId: "ango-592a4",  // *** REPLACE WITH YOUR ACTUAL PROJECT ID ***
  storageBucket: "ango-592a4.firebasestorage.app", // *** REPLACE WITH YOUR ACTUAL STORAGE BUCKET ***
  messagingSenderId: "234305709468", // *** REPLACE WITH YOUR ACTUAL MESSAGING SENDER ID ***
  appId: "1:234305709468:web:4a3009360c6033649dd459", // *** REPLACE WITH YOUR ACTUAL APP ID ***
  measurementId: "G-4YVSD60SP6" // *** REPLACE WITH YOUR ACTUAL MEASUREMENT ID ***
};

// Initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);

  console.log("Firebase initialized successfully!");
  console.log("Analytics enabled:", analytics);  // Optional: Check if analytics is working
} catch (error) {
  console.error("Firebase initialization error:", error);
}
