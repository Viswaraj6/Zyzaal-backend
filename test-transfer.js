
require("dotenv").config();

const axios = require("axios");
const { getAccessToken } = require("./zoho");

async function testTransferOrders() {
    try {
        const token = await getAccessToken();
        const organizationId = process.env.ZOHO_ORGANIZATION_ID;

        if (!organizationId) {
            throw new Error("ZOHO_ORGANIZATION_ID missing in environment");
        }

        const response = await axios.get(
            "https://www.zohoapis.in/inventory/v1/transferorders",
            {
                params: {
                    organization_id: organizationId,
                    per_page: 5
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                },
                timeout: 20000
            }
        );

        const orders = response.data.transfer_orders || [];

        console.log("Transfer Orders API: SUCCESS");
        console.log("Orders found:", orders.length);

        console.table(
            orders.map(order => ({
                number: order.transfer_order_number,
                date: order.date,
                from: order.from_location_name,
                to: order.to_location_name,
                id: order.transfer_order_id
            }))
        );
    } catch (error) {
        console.log("Transfer Orders API: FAILED");
        console.log("HTTP status:", error.response?.status || "N/A");
        console.log(
            "Error:",
            JSON.stringify(error.response?.data || error.message, null, 2)
        );
    }
}

testTransferOrders();
