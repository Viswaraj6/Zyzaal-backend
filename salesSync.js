const axios = require("axios");
const { getAccessToken } = require("./zoho");
const SyncStatus = require("./models/SyncStatus");

function log(msg){

    console.log(msg);

    if(global.io){
        global.io.emit("sync-log", msg);
    }

}

async function callWithRetry(apiCall, retries = 5) {

    for (let attempt = 1; attempt <= retries; attempt++) {

        try {
            return await apiCall();
        } catch (err) {

            if (err.response?.status === 429) {

                const wait = Math.min(30000 * attempt, 120000);

                console.log(`429 Rate Limit. Retry ${attempt}`);

                await new Promise(r => setTimeout(r, wait));

                continue;
            }

            throw err;
        }

    }

    throw new Error("Max retry exceeded");

}

async function syncSales() {

    try {

        const token = await getAccessToken();
        const Product = global.Product;
        let status = await SyncStatus.findOne({
    type: "sales"
});

if (!status) {

    status = new SyncStatus({
        type: "sales"
    });

}
        // 1. Get latest invoices
       let page = 1;
let hasMore = true;
let stopSync = false;

let newestInvoiceId = null;
while (hasMore && !stopSync) {

    const res = await callWithRetry(() =>
        axios.get(
            "https://www.zohoapis.in/inventory/v1/invoices",
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

    const invoices = res.data.invoices;

    hasMore = res.data.page_context.has_more_page;

    page++;
    
    for (const invoice of invoices) {
     console.log("========================");
    console.log("Invoice No :", invoice.invoice_number);
    console.log("Invoice ID :", invoice.invoice_id);
    console.log("Created Time :", invoice.created_time);
        
console.log(
    "Saved ID :",
    status.lastInvoiceId
);

    
console.log(
    "Current ID :",
    invoice.invoice_id
);

console.log(
    "Current No :",
    invoice.invoice_number
);
        
   if (status.lastInvoiceId === invoice.invoice_id) {

    log("Reached Last Synced Invoice");

    stopSync = true;

    break;

}
if (!newestInvoiceId) {
    newestInvoiceId = invoice.invoice_id;
}
        
    log(`Invoice : ${invoice.invoice_number}`);

        // 3. Get invoice details
       const detail = await callWithRetry(() =>
    axios.get(
        `https://www.zohoapis.in/inventory/v1/invoices/${invoice.invoice_id}`,
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
     const lineItems = detail.data.invoice.line_items;
        
    for (const item of lineItems){

   const styleNo = (item.name || "").trim().slice(0,4);

    let product = await Product.findOne({ styleNo });

    console.log(product);
       
         if (!product) {

    console.log("Product Not Found:", styleNo);

    continue;

}
         
      const sizeField = (item.item_custom_fields || []).find(
    f => f.api_name === "cf_size"
);

const soldSize = sizeField?.value;

if (!soldSize) {

    console.log(
        "No Size Found:",
        item.name
    );

    continue;
}

log(`Sold Size : ${soldSize}`);

const index = product.sizeStock.findIndex(
    s => s.size === soldSize
);


console.log("Index:", index);

if (index >= 0) {

    // Negative stock avoid
    if (product.sizeStock[index].stock > 0) {
        product.sizeStock[index].stock--;
    }

    product.stock = product.sizeStock.reduce(
        (a, b) => a + b.stock,
        0
    );

    await product.save();

    log(
`Updated : ${product.styleNo} | ${soldSize} | Stock : ${product.stock}`
);
    
} else {

    console.log(
        "Size Not Found:",
        styleNo,
        soldSize
    );

}
}
        
log(
`Invoice Synced : ${invoice.invoice_number}`
);
    } 
     }  
if (newestInvoiceId) {

    status.lastInvoiceId = newestInvoiceId;

    status.lastSyncTime = new Date();

    await status.save();

    console.log(
        "Last Invoice Updated:",
        newestInvoiceId
    );

}
        
log("✅ Sales Sync Completed");
        
    } catch (err) {

       log(`❌ Sales Sync Error : ${err.response?.status || err.message}`);
console.log(err.response?.data || err.message);
    }
}

module.exports = { syncSales };
