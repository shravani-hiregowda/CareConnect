import { AccessToken } from "livekit-server-sdk";

export async function generateLivekitToken(identity, roomName) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  console.log("🔍 Identity passed to generator:", identity);

  if (!identity) {
    throw new Error("Identity missing!");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: identity,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();   // ⭐ THIS WAS THE BUG
  console.log("🔐 FINAL JWT =", jwt);

  return jwt;
}
