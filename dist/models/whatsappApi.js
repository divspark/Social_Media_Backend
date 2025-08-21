"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpWhatsapp = sendOtpWhatsapp;
const axios_1 = __importDefault(require("axios"));
/**
 * Call Authkey WhatsApp API to send the OTP.
 * Accepts both { status: "success" } or { Message: "...success..." }
 */
function sendOtpWhatsapp(authkey, mobile, countryCode, wid, name, otp) {
    const apiUrl = "https://api.authkey.io/request";
    const params = {
        authkey,
        mobile,
        country_code: countryCode,
        wid,
        name,
        otp
    };
    return axios_1.default.get(apiUrl, { params })
        .then(response => {
        const d = response.data;
        if ((d && d.status && d.status === "success") ||
            (d && d.Message && typeof d.Message === "string" && d.Message.toLowerCase().includes("success"))) {
            return;
        }
        return Promise.reject(d || { error: "Unknown error" });
    });
}
