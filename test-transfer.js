require("dotenv").config();

const axios = require("axios");
const { getAccessToken } = require("./zoho");

async function testTransferOrders() {
    try {
        const token = await getAccessToken();
        const organizationId = process.env.ZOHO_ORGANIZATION_ID;

        if (!organizationId) {
            throw new Error(
                "ZOHO_ORGANIZATION_ID missing in .env"
            );
        }

        const response = await axios.get(
            "https://api.zakya.com/inventory/v1/transferorders",
            {
                params: {
                    organization_id: organizationId
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                },
                timeout: 20000
            }
        );

        const orders = response.data.transfer_orders || [];

        console.log("API Status: SUCCESS");
        console.log("Total orders returned:", orders.length);

        console.table(
            orders.map(order => ({
                transferOrderNo: order.transfer_order_number,
                date: order.date,
                transferOrderId: order.transfer_order_id,
                inTransit: order.is_intransit_order
            }))
        );

    } catch (error) {
        console.log("API Status: FAILED");
        console.log("HTTP Status:", error.response?.status || "N/A");
        console.log(
            "Error details:",
            JSON.stringify(
                error.response?.data || error.message,
                null,
                2
            )
        );
    }
}

testTransferOrders();
