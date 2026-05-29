import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0lP82AEwRPy2B-_ME4UtM7zEeVCxzIyU",
  authDomain: "momo-4139d.firebaseapp.com",
  projectId: "momo-4139d",
  storageBucket: "momo-4139d.firebasestorage.app",
  messagingSenderId: "623171036700",
  appId: "1:623171036700:web:af5ef2d28d55d3aacb61d9",
  measurementId: "G-KKG67V00VM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
