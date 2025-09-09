import admin from "../config/firebase";

const CHUNK_SIZE = 500;

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

export const sendNotificationToMany = async (
  fcmTokens: string[],
  title: string,
  body: string
) => {
  if (!fcmTokens || fcmTokens.length === 0) return;

  const message = {
    notification: { title, body },
  };

  let totalSuccess = 0;
  let totalFailure = 0;

  for (let i = 0; i < fcmTokens.length; i += CHUNK_SIZE) {
    const chunk = fcmTokens.slice(i, i + CHUNK_SIZE);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        ...message,
        tokens: chunk,
      });
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;
    } catch (err) {
      console.error("Push failed for chunk:", err);
    }
  }

  console.log(`Push summary: ${totalSuccess} success, ${totalFailure} failed`);
};