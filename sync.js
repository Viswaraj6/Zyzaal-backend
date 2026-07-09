
const axios = require("axios");
  

const { getAccessToken } = require("./zoho");

const SyncStatus = require("./models/SyncStatus");

async function callWithRetry(apiCall, retries = 5) {

    for (let attempt = 1; attempt <= retries; attempt++) {

        try {
            return await apiCall();
        } catch (err) {

            if (err.response?.status === 429) {

                const wait =
                    Math.min(30000 * attempt, 120000);

                console.log(
                    `429 Rate Limit. Retry ${attempt}/${retries} after ${wait / 1000}s`
                );

                await new Promise(r =>
                    setTimeout(r, wait)
                );

                continue;
            }

            throw err;
        }

    }

    throw new Error("Max retry exceeded");

}

async function syncItems() {
console.log("========== NEW SYNC.JS ==========");
    const token = await getAccessToken();
    
console.log("TOKEN:", token);
console.log("ORG:", process.env.ZOHO_ORGANIZATION_ID);
console.log("Access Token:", token);    
   console.log("Calling Inventory API..."); 

  let allItems = [];
let page = 1;
let hasMore = true;

while (hasMore) {

   const res = await callWithRetry(() =>
    axios.get(
        "https://www.zohoapis.in/inventory/v1/items",
        {
            params: {
                organization_id: process.env.ZOHO_ORGANIZATION_ID,
                per_page: 100,
                page
            },
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`
            }
        }
    )
);
    allItems.push(...res.data.items);

    hasMore = res.data.page_context.has_more_page;

    page++;
    console.log(JSON.stringify(res.data.page_context, null, 2));
}
console.log("Inventory API SUCCESS");
    
console.log("TOTAL ITEMS:", allItems.length);
    
    const Product = global.Product;
   const syncStartedAt = new Date();
   
let status = await SyncStatus.findOne({
    type: "full"
});

if (!status) {

    status = new SyncStatus({
        type: "full"
    });

}

let startIndex = status.lastItemIndex || 0;

console.log("Resume From:", startIndex);
   
console.log("Starting Loop...");

let count = startIndex;
   
for (let i = startIndex; i < allItems.length; i++) {

    const item = allItems[i];

    count++;

 if(count%50===0){

    console.log("Cooling 30 sec");

    await new Promise(r =>
        setTimeout(r,30000)
    );

}
    console.log("Checking Item:", item.item_id, item.sku);

    await new Promise(resolve =>
    setTimeout(resolve,1000)
);

    let locations = [];
/*
const locationRes = await callWithRetry(() =>
    axios.get(
        `https://pos.zoho.in/posapi/api/v1/items/${item.item_id}/locationdetails`,
        {
            params: {
                organization_id: process.env.ZOHO_ORGANIZATION_ID
            },
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`
            }
        }
    )
);
*/
//locations = locationRes.data.item_location_details.locations;
locations = [];
if (item.name === "02261") {
    console.log("========== ITEM DETAILS ==========");
    console.log("==================================");
}
   
if (item.sku === "SS-LPUR-S(25001)") {
    console.log("ITEM DATA START");
    console.log(JSON.stringify(item, null, 2));
     console.log(Object.keys(item)); 
    console.log("ALL FIELDS:", Object.keys(item));
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
  //  const availableStock = locations.reduce(
    //(total, loc) =>
      //  total + Number(loc.location_available_for_sale_stock || 0),
   // 0
//);   
const availableStock = 0;
        const index = product.sizeStock.findIndex(
            s => s.size === size
        );

     if (index >= 0) {

    product.sizeStock[index].stock = availableStock;
    product.sizeStock[index].sku = item.sku;
  product.sizeStock[index].image =
product.primaryImage;

}
    else {

   product.sizeStock.push({
    size,
    stock: availableStock,
    sku: item.sku,
    image: product.primaryImage
});

}

        product.stock =
            product.sizeStock.reduce(
                (a,b)=>a+b.stock,
                0
            );
product.lastSync = syncStartedAt;


console.log("Before Save");
console.log(product.primaryImage);
console.log(product.images);
     
       await product.save();
   
  status.lastItemIndex = i + 1;

status.lastItemId = item.item_id;

status.lastStyleNo = styleNo;

status.status = "running";

await status.save();   
     console.log("After Save");
     
    
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
 
   
status.lastItemIndex = 0;

status.lastItemId = "";

status.lastStyleNo = "";

status.status = "completed";
   
status.lastSyncTime = new Date();

await status.save();

console.log("Full Sync Status Saved");
    
console.log("================================");
console.log("Sync Completed");
console.log("================================");

}

module.exports = {
    syncItems
};
