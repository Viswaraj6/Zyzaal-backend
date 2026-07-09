
const axios = require("axios");
   const fs = require("fs");
const path = require("path");
const { getAccessToken } = require("./zoho");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

    const res = await axios.get(
        "https://www.zohoapis.in/inventory/v1/items",
        {
            params: {
                organization_id: process.env.ZOHO_ORGANIZATION_ID,
                per_page: 100,
                page: page
            },
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`
            }
        }
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

console.log("Starting Loop...");

let count = 0;

for (const item of allItems) {

    count++;

    if(count % 10 === 0)

        console.log("Cooling 20 seconds...");

       await new Promise(resolve=>
setTimeout(resolve,30000)
);
    }

    console.log("Checking Item:", item.item_id, item.sku);

   await new Promise(resolve =>
    setTimeout(resolve,3000)
);
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



//return;
   
    
    if (item.name === "02261") {

    console.log("========== ITEM DETAILS ==========");

     //console.log(JSON.stringify(detailRes.data, null, 2));

    console.log("==================================");

    //process.exit();
}
} 
catch(err){

   if (err.response?.status === 429) {

    console.log("429 Waiting 60 seconds");

    await new Promise(r =>
        setTimeout(r, 60000)
    );

    continue;

}

    console.log(err.response?.data);

    continue;
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
     let uploadResult = null;
     let imagePath = "";

if (!product) {
   
   const detailRes = await axios.get(
    `https://www.zohoapis.in/inventory/v1/items/${item.item_id}`,
    {
        params: {
            organization_id: process.env.ZOHO_ORGANIZATION_ID
        },
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`
        }
    }
);
    const docId = detailRes.data.item.documents[0]?.document_id;
   
   if (!docId) {
    console.log("No image found for", item.sku);
    continue;
}

console.log("DOC ID:", docId);
   
 

 imagePath = path.join(__dirname, `${item.item_id}.png`);

const imageDownload = await axios.get(
    `https://www.zohoapis.in/inventory/v1/documents/${docId}`,
    {
        params: {
            organization_id: process.env.ZOHO_ORGANIZATION_ID
        },
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`
        },
        responseType: "stream"
    }
);

const writer = fs.createWriteStream(imagePath);

imageDownload.data.pipe(writer);

await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
});

console.log("Downloaded:", imagePath);

 uploadResult = await cloudinary.uploader.upload(imagePath, {
    folder: "products"
});

console.log("Cloudinary URL:", uploadResult.secure_url);    
}

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
    const availableStock = locations.reduce(
    (total, loc) =>
        total + Number(loc.location_available_for_sale_stock || 0),
    0
);   

        const index = product.sizeStock.findIndex(
            s => s.size === size
        );

     if (index >= 0) {

    product.sizeStock[index].stock = availableStock;
    product.sizeStock[index].sku = item.sku;
   product.sizeStock[index].image =
uploadResult?.secure_url || product.primaryImage

}
    else {

    product.sizeStock.push({
        size,
        stock: availableStock,
        sku: item.sku,
        image:uploadResult?.secure_url || product.primaryImage
    });

}

        product.stock =
            product.sizeStock.reduce(
                (a,b)=>a+b.stock,
                0
            );
product.lastSync = syncStartedAt;

   if (uploadResult) {
    product.primaryImage = uploadResult.secure_url;
    product.images = [uploadResult.secure_url];
}


console.log("Before Save");
console.log(product.primaryImage);
console.log(product.images);
     
       await product.save();
     
     console.log("After Save");
     
     if (uploadResult) {
    fs.unlinkSync(imagePath);
}
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
   const SyncStatus = require("./models/SyncStatus");

let status = await SyncStatus.findOne({
    type: "full"
});

if (!status) {

    status = new SyncStatus({
        type: "full"
    });

}

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
