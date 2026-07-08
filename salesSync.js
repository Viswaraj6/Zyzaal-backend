const axios = require("axios");
const { getAccessToken } = require("./zoho");

async function syncSales() {

    try {

        const token = await getAccessToken();

        // 1. Get latest invoices
        const res = await axios.get(
            "https://www.zohoapis.in/inventory/v1/invoices",
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

        // 2. First invoice
        const invoice = res.data.invoices[0];

        console.log("Invoice ID:", invoice.invoice_id);

        // 3. Get invoice details
        const detail = await axios.get(
            `https://www.zohoapis.in/inventory/v1/invoices/${invoice.invoice_id}`,
            {
                params: {
                    organization_id: process.env.ZOHO_ORGANIZATION_ID
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                }
            }
        );

     const lineItems = detail.data.invoice.line_items;

    } catch (err) {

        console.log(err.response?.status);
        console.log(err.response?.data || err.message);

    }
}

module.exports = { syncSales };
