const axios = require("axios");
const { getAccessToken } = require("./zoho");

async function syncSales() {
    try {

        const token = await getAccessToken();

        const res = await axios.get(
             `https://www.zohoapis.in/inventory/v1/invoices/${invoice.invoice_id}`,
            {
                params: {
                    organization_id: process.env.ZOHO_ORGANIZATION_ID,
                    per_page: 5
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                }
            }
        );

        console.log(JSON.stringify(res.data, null, 2));

    } catch (err) {

        console.log(err.response?.status);
        console.log(err.response?.data || err.message);

    }
}

module.exports = { syncSales };
