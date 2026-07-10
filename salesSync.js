const axios = require("axios");
const { getAccessToken } = require("./zoho");
const SyncStatus = require("./models/SyncStatus");
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
        const res = await axios.get(
            "https://www.zohoapis.in/inventory/v1/invoices",
            {
                params: {
                    organization_id: process.env.ZOHO_ORGANIZATION_ID,
                   per_page: 100
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                }
            }
        );

        // 2. First invoice
       const invoices = res.data.invoices;
        
      for (const invoice of invoices) {

    if (status.lastInvoiceId === invoice.invoice_id) {

        console.log("Reached Last Synced Invoice");

        break;

    }

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
        
    for (const item of lineItems){

    const styleNo = item.name.slice(0, 4);

    let product = await Product.findOne({ styleNo });

    console.log(product);
       
         if (!product) {

    console.log("Product Not Found:", styleNo);

    continue;

}

         status.lastInvoiceId = invoice.invoice_id;

status.lastSyncTime = new Date();

await status.save();

console.log(
    "Invoice Synced:",
    invoice.invoice_number
);
         
         const sizeField = item.item_custom_fields.find(
    f => f.api_name === "cf_size"
);

const soldSize = sizeField?.value;

console.log("Sold Size:", soldSize);
         const index = product.sizeStock.findIndex(
    s => s.size === soldSize
);

console.log("Index:", index);

if (index >= 0) {

    product.sizeStock[index].stock--;

    product.stock = product.sizeStock.reduce(
        (a, b) => a + b.stock,
        0
    );

    await product.save();

    console.log(
        "Updated:",
        product.styleNo,
        soldSize,
        product.stock
    );
}

}
  } 
        
    } catch (err) {

        console.log(err.response?.status);
        console.log(err.response?.data || err.message);

    }
}

module.exports = { syncSales };
