import axios from "axios";

/**
 * Call Authkey WhatsApp API to send the OTP.
 * Accepts both { status: "success" } or { Message: "...success..." }
 */
export function sendOtpWhatsapp(
  authkey: string,
  mobile: string,
  countryCode: string,
  wid: string,
  name: string,
  otp: string
): Promise<void> {
  const apiUrl = "https://api.authkey.io/request";
  const params = {
    authkey,
    mobile,
    country_code: countryCode,
    wid,
    name,
    otp
  };

  return axios.get(apiUrl, { params })
    .then(response => {
      const d = response.data;
      if (
        (d && d.status && d.status === "success") ||
        (d && d.Message && typeof d.Message === "string" && d.Message.toLowerCase().includes("success"))
      ) {
        return;
      }
      return Promise.reject(d || { error: "Unknown error" });
    });
}
