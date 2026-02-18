"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirebaseConfig = exports.hasFirebaseConfig = void 0;
var hasFirebaseConfig = function () { return false; };
exports.hasFirebaseConfig = hasFirebaseConfig;
var getFirebaseConfig = function () { return ({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
}); };
exports.getFirebaseConfig = getFirebaseConfig;
