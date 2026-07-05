
const axios = require("axios");
const { getAccessToken } = require("./zoho");

async function syncItems() {
console.log("========== NEW SYNC.JS ==========");
    const token = await getAccessToken();
    
console.log("TOKEN:", token);
console.log("ORG:", process.env.ZOHO_ORGANIZATION_ID);
console.log("Access Token:", token);    
   console.log("Calling Inventory API..."); 

    const res = await axios.get(
        "https://www.zohoapis.in/inventory/v1/items",
        {
           params: {
    organization_id: process.env.ZOHO_ORGANIZATION_ID,
    per_page: 200
},
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`
            }
        }
    );
console.log("Inventory API SUCCESS");
    console.log(JSON.stringify(res.data.page_context, null, 2));
console.log("TOTAL ITEMS:", res.data.items.length);
    
    const Product = global.Product;
   const syncStartedAt = new Date();

console.log("Starting Loop...");
   for (const item of res.data.items) {
       

    console.log("Checking Item:", item.item_id, item.sku);

   
if (item.sku === "SS-LPUR-S(25001)") {
    console.log("ITEM DATA START");
    console.log(JSON.stringify(item, null, 2));
    console.log("ITEM DATA END");
}
  const itemCode = (item.name || "").trim();

// Last digit = Size
const sizeDigit = itemCode.slice(-1);

// First 4 digits = Style Number
const styleNo = itemCode.slice(0, 4);

console.log(
    "ITEM NAME:",
    itemCode,
    "STYLE:",
    styleNo,
    "SIZE DIGIT:",
    sizeDigit,
    "CATEGORY:",
    item.category_name
);
       
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
       case "6": size = "40"; break; 
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
       ? ["30","32","34","36","38","40"]
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

   const availableStock = locations.reduce(
    (total, loc) =>
        total + Number(loc.location_available_for_sale_stock || 0),
    0
);

product.sizeStock[index].stock = availableStock;

} else {

  const availableStock = locations.reduce(
    (total, loc) =>
        total + Number(loc.location_available_for_sale_stock || 0),
    0
);

product.sizeStock.push({
    size,
    stock: availableStock,
    sku: item.sku
});

}

        product.stock =
            product.sizeStock.reduce(
                (a,b)=>a+b.stock,
                0
            );
product.lastSync = syncStartedAt;
       
       await product.save();

console.log(
    "Saved:",
    product.styleNo,
    size,
    product.stock
);
       } 
  // await Product.deleteMany({
   // lastSync: { $lt: syncStartedAt }
//});

//console.log("Old Products Removed");
    
console.log("================================");
console.log("Sync Completed");
console.log("================================");

}

module.exports = {
    syncItems
};
