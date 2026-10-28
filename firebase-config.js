// ============================================
// CONFIGURATION FIREBASE PARTAGÉE
// Projet : site-trading-5ed7d
// Admin autorisé : ronan.francois8@gmail.com
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Configuration du projet Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyC1enXoDo78jrzIITHj6ZL96POw9d6do",
  authDomain: "site-trading-5ed7d.firebaseapp.com",
  projectId: "site-trading-5ed7d",
  storageBucket: "site-trading-5ed7d.firebasestorage.app",
  messagingSenderId: "539014453697",
  appId: "1:539014453697:web:b75db2ce2d95bfff343740",
  measurementId: "G-K1SKRSRGLS"
};

// Email autorisé pour l'administration
const ADMIN_EMAIL = "ronan.francois8@gmail.com";

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export des fonctions utiles
export {
  app,
  auth,
  db,
  ADMIN_EMAIL,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  where,
  onSnapshot
};
