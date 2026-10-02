// Configuración del entorno. Para pasar a producción solo se cambia este archivo.
export const ENTORNO = 'pruebas';

export const firebaseConfig = {
  apiKey: "AIzaSyDqatvNRWGyJJL6Z-HXpLS4LqdBpa9maAM",
  authDomain: "sim-pruebas-bcf39.firebaseapp.com",
  projectId: "sim-pruebas-bcf39",
  storageBucket: "sim-pruebas-bcf39.firebasestorage.app",
  messagingSenderId: "1008990436037",
  appId: "1:1008990436037:web:1b5eb3d0f3d16853380eac"
};

// Administrador del sistema (debe coincidir con firestore.rules)
export const ADMIN_EMAIL = 'emiranda@santamonicafishing.com';

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
