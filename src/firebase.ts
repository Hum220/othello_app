import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// 五目並べと同じFirebaseプロジェクトを共用（DBパスで分離）
const firebaseConfig = {
  apiKey: 'AIzaSyDRpjENabS58mhO-X7dk-KHC0_RxNxSSNM',
  authDomain: 'gomoku-app-ff31c.firebaseapp.com',
  databaseURL: 'https://gomoku-app-ff31c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'gomoku-app-ff31c',
  storageBucket: 'gomoku-app-ff31c.firebasestorage.app',
  messagingSenderId: '1043978807560',
  appId: '1:1043978807560:web:76b718c94906488226a4bd',
};

const app = initializeApp(firebaseConfig, 'othello');
export const database = getDatabase(app);
