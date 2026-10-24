
const axios = require("axios");

async function getAccessToken() {
    const res = await axios.post(
        "https://accounts.zoho.in/oauth/v2/token",
        null,
        {
            params: {
                refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: "refresh_token"
            }
        }
    );

    if (!res.data.access_token) {
        throw new Error("Zoho access token not received");
    }

    return res.data.access_token;
}

module.exports = { getAccessToken };
