import axios from "axios";
import { generateOTP } from "../utils/whatsappOtp";

const wid = process.env.WID || "";
const countryCode = process.env.COUNTRY_CODE || "";

/**
 * Call Authkey WhatsApp API to send the OTP.
 * Using POST JSON API with type = "copy_code"
 */
export async function sendOtpWhatsapp(
  mobile: string,
  otp: number,
): Promise<void> {
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
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${authkey}`,
        "Content-Type": "application/json",
      },
    });

    const d = response.data;
    if (
      (d && d.status && d.status === "success") ||
      (d && d.Message && typeof d.Message === "string" && d.Message.toLowerCase().includes("success"))
    ) {
      return;
    }
    throw d || { error: "Unknown error" };
  } catch (err) {
    throw err;
  }
}
