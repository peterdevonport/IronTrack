import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, writeBatch, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, Timestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAJNl8NIZB9UGnqUOXPjWcRgFOiroEbPUY",
    authDomain: "irontrack-f4b19.firebaseapp.com",
    projectId: "irontrack-f4b19",
    storageBucket: "irontrack-f4b19.firebasestorage.app",
    messagingSenderId: "576459465985",
    appId: "1:576459465985:web:c5e387990eabf0c840a700"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser, collection, addDoc, writeBatch, query, where, onSnapshot, deleteDoc, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit, Timestamp, getDocs };
