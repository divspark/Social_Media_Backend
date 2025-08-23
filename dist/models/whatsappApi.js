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
exports.sendOtpWhatsapp = sendOtpWhatsapp;
const axios_1 = __importDefault(require("axios"));
const wid = process.env.WID || "";
const countryCode = process.env.COUNTRY_CODE || "";
/**
 * Call Authkey WhatsApp API to send the OTP.
 * Using POST JSON API with type = "copy_code"
 */
function sendOtpWhatsapp(mobile, otp) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiUrl = "https://console.authkey.io/restapi/requestjson.php";
        const authkey = process.env.AUTHKEY;
        if (!authkey) {
            throw new Error("AUTHKEY is not set in environment variables");
        }
        const payload = {
            country_code: countryCode,
            mobile,
            wid,
            type: "copy_code",
            bodyValues: { "1": otp },
        };
        try {
            const response = yield axios_1.default.post(apiUrl, payload, {
                headers: {
                    Authorization: `Basic ${authkey}`,
                    "Content-Type": "application/json",
                },
            });
            const d = response.data;
            if ((d && d.status && d.status === "success") ||
                (d && d.Message && typeof d.Message === "string" && d.Message.toLowerCase().includes("success"))) {
                return;
            }
            throw d || { error: "Unknown error" };
        }
        catch (err) {
            throw err;
        }
    });
}
