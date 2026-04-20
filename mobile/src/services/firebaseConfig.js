"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functions = exports.storage = exports.db = exports.auth = void 0;
var app_1 = require("firebase/app");
// @ts-ignore
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
var functions_1 = require("firebase/functions");
var async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
var firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAfMYwWD0JskbvaFAXIG03lOxX1F5EBR8Q",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "haqooq-a3e91.firebaseapp.com",
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://haqooq-a3e91-default-rtdb.firebaseio.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "haqooq-a3e91",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "haqooq-a3e91.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "99158635959",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:99158635959:android:f5d4eaa916cf665674e432"
};
var app = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)(firebaseConfig) : (0, app_1.getApp)();
var auth;
try {
    exports.auth = auth = (0, auth_1.initializeAuth)(app, {
        persistence: (0, auth_1.getReactNativePersistence)(async_storage_1.default)
    });
}
catch (e) {
    exports.auth = auth = (0, auth_1.getAuth)(app);
}
var db;
try {
    // Enterprise standard for Firestore in React Native: Disable long sockets if they block
    // Use memory cache because the Web SDK's persistentLocalCache relies on IndexedDB, which is unsupported in RN.
    exports.db = db = (0, firestore_1.initializeFirestore)(app, {
        localCache: (0, firestore_1.memoryLocalCache)(),
        experimentalForceLongPolling: true
    });
}
catch (e) {
    exports.db = db = (0, firestore_1.getFirestore)(app);
}
exports.storage = (0, storage_1.getStorage)(app);
exports.functions = (0, functions_1.getFunctions)(app);
exports.default = app;
