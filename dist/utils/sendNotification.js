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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = void 0;
const firebase_1 = __importDefault(require("../config/firebase"));
const sendNotification = (fcmToken, title, body) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = {
            notification: {
                title,
                body,
            },
            token: fcmToken,
        };
        const response = yield firebase_1.default.messaging().send(message);
        console.log("Push sent:", response);
    }
    catch (err) {
        console.error("Push failed:", err);
    }
});
exports.sendNotification = sendNotification;
