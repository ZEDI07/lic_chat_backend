
import admin from "firebase-admin";
import serviceAccount from "../../sesolutions-d82a5-firebase-adminsdk-35c4g-d6a1ff7138.json" assert { type: "json" };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// Function to send a push notification
export async function sendNotification({ deviceTokens, config, userid }) {
  try {
    deviceTokens.forEach((token) => {
      const configData = {
        token: token,
        notification: {
          title: config.headings.en,
          body: config.contents.en,
          imageUrl: config.data.chat.avatar,
        },
        data: { data: JSON.stringify(config.data) },
      };
      admin
        .messaging()
        .send(configData)
        .then((response) =>
          console.log("Successfully sent notification:", response)
        )
        .catch((err) => console.log("Error while send push notification", err));
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
}
