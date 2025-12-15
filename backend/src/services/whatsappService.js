import axios from "axios";

const apiUrl = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

const whatsappService = {
  async sendMessage(phone, message) {
    try {
      await axios.post(
        apiUrl,
        {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
    } catch (err) {
      console.error("WhatsApp Send Error:", err.response?.data || err.message);
    }
  }
};

export default whatsappService;
