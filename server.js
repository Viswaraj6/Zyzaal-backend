const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors({ origin: "*" }));

/* 🔐 ADMIN LOGIN */
const ADMIN_USER = "admin";
const ADMIN_PASS = "Vivin@14";
const JWT_SECRET = "fark-secret";

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid login ❌" });
  }
});

/* 🔐 ADMIN CHECK */
function checkAdmin(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token ❌" });
  }

  try {
    jwt.verify(token.replace("Bearer ", ""), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token ❌" });
  }
}

/* ✅ DB */
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

/* 💳 RAZORPAY */
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log("Razorpay Initialized ✅");
} else {
  console.log("⚠ Razorpay keys missing");
}

/* 📦 PRODUCT */
const Product = mongoose.model("Product", {
  name: String,
  styleNo: String,
  price: Number,
  stock: Number,

  // 🔥 IMAGE FIX
  images: [String],
 primaryImage: String,
  // 🔥 DETAILS
  brand: String,
  fabric: String,
  typeDetail: String,
  fit: String,
  pattern: String,
  color: String,
  occasion: String,
  description: String,

  // 🔥 OTHER
  sizes: [String],
 sizeStock: [{
  size: String,
  stock: Number
}],
  category: String
});
/* 🎬 GLOBAL VIDEO */
const Video = mongoose.model("Video", {
  url: String
});
const OrderSchema = new mongoose.Schema({
   orderNumber: String,
  user: String,
  name: String,
  phone: String,
  address: String,
  products: Array,
  total: Number,
  paymentId: String,

  paymentStatus: String,
  paymentMethod: String,

  orderDate: Date,
  deliveryDate: Date,

  status: {
    type: String,
    default: "Pending"
  }

}, {
  timestamps: true
});

const Order = mongoose.model("Order", OrderSchema);
// 🔥 BANNER MODEL
const Banner = mongoose.model("Banner", {
  type: String, // "video" or "slider"
  videoUrl: String,
  images: [String]
});

// SAVE BANNER
app.post("/banner", async (req, res) => {
  await Banner.deleteMany();

  const banner = new Banner(req.body);
  await banner.save();

  res.json({ success: true });
});

// GET BANNER
app.get("/banner", async (req, res) => {
  const data = await Banner.findOne();
  res.json(data || {});
});
/* ================= PRODUCT ================= */

/* ADD PRODUCT (ADMIN ONLY) */
app.post("/add-product", checkAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    res.json({
      success: true,
      message: "Product Added ✅"
    });

  } catch {
    res.status(500).json({
      success: false,
      message: "Add product failed ❌"
    });
  }
});
app.get("/products", async (req, res) => {
  try {

    const products = await Product.find().sort({ _id: -1 });

    res.json(products);

  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to fetch products ❌"
    });
  }
});
/* DELETE PRODUCT (FIXED) */
app.delete("/products/:id", checkAdmin, async (req, res) => {
  try {

    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found ❌"
      });
    }

    res.json({
      success: true,
      message: "Deleted successfully ✅"
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Delete error ❌"
    });
  }
});
app.put("/products/:id", checkAdmin, async(req,res)=>{

  try{

    const product =
      await Product.findById(req.params.id);

    if(!product){

      return res.status(404).json({
        message:"Product not found"
      });

    }

    product.name =
      req.body.name || product.name;

    product.styleNo =
      req.body.styleNo || product.styleNo;

    product.category =
      req.body.category || product.category;

    product.color =
      req.body.color || product.color;

    product.fabric =
      req.body.fabric || product.fabric;

    product.fit =
      req.body.fit || product.fit;

    product.pattern =
      req.body.pattern || product.pattern;

    product.occasion =
      req.body.occasion || product.occasion;

    product.price =
      req.body.price || product.price;

    product.images =
      req.body.images || product.images;

    product.primaryImage =
      req.body.primaryImage || product.primaryImage;

    // 🔥 SIZE STOCK
    if(req.body.sizeStock){

      product.sizeStock =
        req.body.sizeStock;

      product.markModified("sizeStock");

    }

    // 🔥 TOTAL STOCK
product.stock =
  req.body.stock ?? product.stock;

    await product.save();

    res.json({
      success:true,
      product
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      message:"Update failed"
    });

  }

});
/* ================= PAYMENT ================= */

app.post("/create-order", async (req, res) => {
  if (!razorpay) {
    return res.status(500).json({ error: "Payment not configured ❌" });
  }

  try {
    const order = await razorpay.orders.create({
      amount: req.body.amount * 100,
      currency: "INR"
    });

    res.json(order);
  } catch {
    res.status(500).json({ error: "Razorpay error ❌" });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    if (expected === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch {
    res.status(500).json({ error: "Verification failed ❌" });
  }
});

/* ================= ORDERS ================= */

app.post("/order", async(req,res)=>{

  try{

    const products = req.body.products;

    const order = new Order(req.body);

    await order.save();
    console.log("ORDER SAVED ✅");
    // 🔥 INGA paste pannu
    for(const item of products){

      const product =
        await Product.findById(item._id);

      if(!product) continue;

      product.stock =
        Math.max(
          0,
          (product.stock || 0) - (item.qty || 1)
        );

      if(product.sizeStock && item.size){

        const sizeObj =
          product.sizeStock.find(
            s => s.size === item.size
          );

        if(sizeObj){

          sizeObj.stock =
            Math.max(
              0,
              (sizeObj.stock || 0) - (item.qty || 1)
            );
           product.markModified("sizeStock");
        }

      }

      await product.save();

    }

    res.json({
      success:true
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      message:"Order failed"
    });

  }

});
app.get("/orders", async (req, res) => {
  const data = await Order.find().sort({ createdAt: -1 });
  res.json(data);
});
/* SAVE / REPLACE VIDEO */
app.post("/video", checkAdmin, async (req, res) => {
  try {
    await Video.deleteMany();
    const video = new Video({ url: req.body.url });
    await video.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Video save failed ❌" });
  }
});

/* GET VIDEO */
app.get("/video", async (req, res) => {
  const v = await Video.findOne();
  res.json(v || {});
});
app.put("/orders/:id", checkAdmin, async (req, res) => {
  try {
    const updateData = {
  status: req.body.status
};

if(req.body.deliveryDate){
  updateData.deliveryDate =
    req.body.deliveryDate;
}

await Order.findByIdAndUpdate(
  req.params.id,
  updateData
);

    res.json({
      success: true,
      message: "Updated ✅"
    });

  } catch(err){
  console.log("ERROR 👉", err.response?.data || err.message);
  res.status(500).json(err.response?.data || err.message);
  }
});
/* DELETE ORDER */
app.delete("/orders/:id", checkAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Order deleted ✅"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Delete failed ❌"
    });
  }
});
/* ================= START ================= */

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running 🚀");
});
