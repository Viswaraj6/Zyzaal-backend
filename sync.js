const axios = require("axios");
const { getAccessToken } = require("./zoho");

async function syncItems() {

    const token = await getAccessToken();

    const res = await axios.get(
        "https://www.zohoapis.in/inventory/v1/items",
        {
            params: {
                organization_id: process.env.ZOHO_ORGANIZATION_ID
            },
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`
            }
        }
    );

    const Product = global.Product;

    for (const item of res.data.items) {

        await Product.findOneAndUpdate(

            { styleNo: item.sku },

            {
                name: item.name,
                styleNo: item.sku,
                price: Number(item.rate || 0),
                stock: Number(item.stock_on_hand || 0)
            },

            {
                upsert: true,
                new: true
            }

        );

    }

    console.log("Synced:", res.data.items.length);

}

module.exports = {
    syncItems
};
