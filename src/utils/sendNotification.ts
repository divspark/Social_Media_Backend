import admin from "../config/firebase";

export const sendNotification = async (
  fcmToken: string,
  title: string,
  body: string
) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log("Push sent:", response);
  } catch (err) {
    console.error("Push failed:", err);
  }
};
