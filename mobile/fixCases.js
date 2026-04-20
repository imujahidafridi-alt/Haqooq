"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var firestore_1 = require("firebase/firestore");
var firebaseConfig_1 = require("./src/services/firebaseConfig");
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var casesSnap, _i, _a, caseDoc, data, userSnap, userData, finalName;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Starting case backfill script...");
                    return [4 /*yield*/, (0, firestore_1.getDocs)((0, firestore_1.collection)(firebaseConfig_1.db, 'cases'))];
                case 1:
                    casesSnap = _b.sent();
                    _i = 0, _a = casesSnap.docs;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    caseDoc = _a[_i];
                    data = caseDoc.data();
                    if (!(!data.clientName || data.clientName === 'Unknown Client' || data.clientName === 'Anonymous Client')) return [3 /*break*/, 6];
                    console.log("Checking case: ".concat(caseDoc.id));
                    if (!data.clientId) return [3 /*break*/, 6];
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebaseConfig_1.db, 'users', data.clientId))];
                case 3:
                    userSnap = _b.sent();
                    if (!userSnap.exists()) return [3 /*break*/, 5];
                    userData = userSnap.data();
                    finalName = userData.displayName || userData.name || userData.email || 'Anonymous Person';
                    return [4 /*yield*/, (0, firestore_1.updateDoc)(caseDoc.ref, { clientName: finalName })];
                case 4:
                    _b.sent();
                    console.log("Updated case ".concat(caseDoc.id, " with name ").concat(finalName));
                    return [3 /*break*/, 6];
                case 5:
                    console.log("User ".concat(data.clientId, " not found."));
                    _b.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    console.log("Finished script.");
                    return [2 /*return*/];
            }
        });
    });
}
run().then(function () { return process.exit(0); }).catch(function (e) { console.error(e); process.exit(1); });
