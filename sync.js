
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
     // TEST ONLY
    const locationRes = await axios.get(
        `https://pos.zoho.in/posapi/api/v1/items/${item.item_id}/locationdetails`,
        {
            params: {
                organization_id: process.env.ZOHO_ORGANIZATION_ID
            },
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`
            }
        }
    );

    console.log(locationRes.data);

    break;   // முதல் item மட்டும் test செய்ய
        const sku = item.sku;

        // Last digit = Size
        const sizeDigit = sku.slice(-1);

        // First 4 digit = Style
        const styleNo = sku.slice(0, -1);

       const category = (item.category_name || "").toUpperCase();

let size = "";

if (
    category.includes("PANT") ||
    category.includes("JEANS")
) {

    switch (sizeDigit) {
        case "1": size = "30"; break;
        case "2": size = "32"; break;
        case "3": size = "34"; break;
        case "4": size = "36"; break;
        case "5": size = "38"; break;
    }

} else {

    switch (sizeDigit) {
        case "1": size = "S"; break;
        case "2": size = "M"; break;
        case "3": size = "L"; break;
        case "4": size = "XL"; break;
        case "5": size = "XXL"; break;
    }

}
        let product = await Product.findOne({ styleNo });

        if (!product) {

           product = new Product({

    name: styleNo,

    styleNo,

    price: Number(item.rate || 0),

    stock: 0,

    category: item.category_name,

    sizes:
        category.includes("PANT") ||
        category.includes("JEANS")
        ? ["30","32","34","36","38"]
        : ["S","M","L","XL","XXL"],

    sizeStock: []

});
        }

        const index = product.sizeStock.findIndex(
            s => s.size === size
        );

        if (index >= 0) {

            product.sizeStock[index].stock =
    Number(item.quantity_available_for_sale || 0);
        } else {

           product.sizeStock.push({
    size,
    stock: Number(item.quantity_available_for_sale || 0),
    sku: item.sku
});
            
        }

        product.stock =
            product.sizeStock.reduce(
                (a,b)=>a+b.stock,
                0
            );

        await product.save();

    }

    console.log("Sync Completed");

}

module.exports = {
    syncItems
};
