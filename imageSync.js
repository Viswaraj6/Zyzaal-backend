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

async function imageSync() {

    console.log("========== IMAGE SYNC ==========");

    const token = await getAccessToken();
    const Product = global.Product;

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
                    page
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${token}`
                }
            }
        );

        allItems.push(...res.data.items);

        hasMore = res.data.page_context.has_more_page;
        page++;
    }

    console.log("TOTAL ITEMS:", allItems.length);

    let count = 0;

    for (const item of allItems) {

        count++;

        console.log(`(${count}/${allItems.length}) ${item.name}`);

        const styleNo = (item.name || "").trim().slice(0, 4);

        const product = await Product.findOne({ styleNo });

        if (!product) {
            console.log("Product Not Found:", styleNo);
            continue;
        }

        if (!item.image_document_id) {
            console.log("No Image:", styleNo);
            continue;
        }

        const imagePath = path.join(
            __dirname,
            `${item.item_id}.png`
        );

        try {

            // Download image
            const imageDownload = await axios.get(
                `https://www.zohoapis.in/inventory/v1/documents/${item.image_document_id}`,
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

            console.log("Downloaded");

            // Upload Cloudinary
            const uploadResult =
                await cloudinary.uploader.upload(imagePath, {
                    folder: "products"
                });

            console.log(uploadResult.secure_url);

            // Update product
            product.primaryImage = uploadResult.secure_url;

            product.images = [
                uploadResult.secure_url
            ];

            product.sizeStock.forEach(size => {
                size.image = uploadResult.secure_url;
            });

            await product.save();

            console.log("Updated:", styleNo);

            fs.unlinkSync(imagePath);

        } catch (err) {

            console.log(
                "Image Sync Failed:",
                styleNo,
                err.response?.data || err.message
            );

        }

        // Cloudinary rate limit avoid
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("========== IMAGE SYNC COMPLETED ==========");
}

module.exports = {
    imageSync
};
