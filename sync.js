
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

    console.log("Checking Item:", item.item_id, item.sku);

    let locations = [];

    try {

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

        locations = locationRes.data.item_location_details.locations;

      console.log("SUCCESS:", item.item_id, item.sku);

    } 
    catch (err) {

    console.log("==========================");
    console.log("FAILED ITEM");
    console.log("Item ID :", item.item_id);
    console.log("SKU     :", item.sku);
    console.log("Status  :", err.response?.status);
    console.log("Response:", JSON.stringify(err.response?.data, null, 2));
    console.log("==========================");

    continue;
}

    const sku = item.sku;

    // 👇 இதற்கு கீழே உன் பழைய code அதே மாதிரி இருக்கட்டும்
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
        product.locationStock = locations.map(loc => ({
    location: loc.location_name,
    stock: Number(loc.location_available_for_sale_stock)
}));

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
