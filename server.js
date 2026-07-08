const cron = require("node-cron");
const { syncItems } = require("./sync");
const { syncSales } = require("./salesSync");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server,{
  cors:{
    origin:"*"
  }
});

app.set("io", io);

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

const Product = require("./models/Product");
global.Product = Product;

const User = mongoose.model("User", {
  name: String,
  email: String,
  address:String,
  phone: {
    type: String,
    unique: true
  },
gender:String,
  status:{
    type:String,
    default:"Active"
  },

  password: String,

  createdAt: {
    type: Date,
    default: Date.now
  }
});
const ReactivationRequest = mongoose.model(
"ReactivationRequest",
{
  phone:String,
  reason:String,
  status:{
    type:String,
    default:"Pending"
  },
  createdAt:{
    type:Date,
    default:Date.now
  }
});
app.post(
"/reactivation-request",
async(req,res)=>{

const existing =
await ReactivationRequest.findOne({
 phone:req.body.phone,
 status:"Pending"
});

if(existing){

 return res.json({
  success:true,
  alreadyPending:true
 });

}

const request =
new ReactivationRequest({
 phone:req.body.phone,
 reason:req.body.reason
});

await request.save();

res.json({
 success:true
});

});
app.get(
"/reactivation-requests",
async(req,res)=>{

 const data =
 await ReactivationRequest.find()
 .sort({createdAt:-1});

 res.json(data);

});
app.put(
"/approve-request/:id",
async(req,res)=>{

 const request =
 await ReactivationRequest.findById(
 req.params.id
 );

 await User.updateOne(
 {
  phone:request.phone
 },
 {
  status:"Active"
 }
 );

 request.status = "Approved";

 await request.save();

 res.json({
  success:true
 });

});
app.get(
"/latest-request/:phone",
async(req,res)=>{

const request =
await ReactivationRequest
.findOne({
 phone:req.params.phone
})
.sort({createdAt:-1});

res.json(request);

});
/* 🎬 GLOBAL VIDEO */
const Video = mongoose.model("Video", {
  url: String
});
const Counter = mongoose.model("Counter", {
  name: String,
  value: Number
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
app.post("/check-user", async (req, res) => {

  const { phone } = req.body;

  const user = await User.findOne({ phone });

  if(user){
    return res.json({
      exists: true,
      user
    });
  }

  res.json({
    exists: false
  });

});
app.post("/register", async (req, res) => {

  try{

    const existing =
      await User.findOne({
        phone: req.body.phone
      });

    if(existing){
      return res.status(400).json({
        message:"User already exists"
      });
    }

    const user =
      new User(req.body);

    await user.save();

    res.json({
      success:true
    });

  }catch(err){

    res.status(500).json({
      success:false
    });

  }

});
app.get("/user/:phone", async (req,res)=>{

 const user =
 await User.findOne({
   phone:req.params.phone
 });

 res.json(user);

});
app.put("/user/:phone", async(req,res)=>{

try{

const updateData = {};

if(req.body.name !== undefined)
updateData.name = req.body.name;

if(req.body.email !== undefined)
updateData.email = req.body.email;

if(req.body.gender !== undefined)
updateData.gender = req.body.gender;

if(req.body.address !== undefined)
updateData.address = req.body.address;

await User.updateOne(
{
 phone:req.params.phone
},
updateData
);

res.json({
 success:true
});

}catch(err){

res.status(500).json({
 success:false
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

    let counter =
      await Counter.findOne({ name: "order" });

    if(!counter){

      counter = await Counter.create({
        name: "order",
        value: 0
      });

    }

    counter.value += 1;

    await counter.save();

    const orderNumber =
      String(counter.value).padStart(5,"0");

    const order = new Order({
      ...req.body,
      orderNumber
    });

    await order.save();
    const io = req.app.get("io");

io.emit("newOrder",{
  orderNumber,
  customer:req.body.name
});
    
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
app.get("/customers", async (req,res)=>{

  try{

    const users = await User.find()
      .sort({ createdAt:-1 });

    res.json(users);

  }catch(err){

    res.status(500).json({
      message:"Failed"
    });

  }

});
app.put("/deactivate-user/:phone",
async (req,res)=>{

await User.updateOne(
{
phone:req.params.phone
},
{
status:"Deactivated"
}
);

res.json({
success:true
});

});
app.delete("/delete-user/:phone",
async (req,res)=>{

await User.updateOne(
{
 phone:req.params.phone
},
{
 status:"Deleted"
}
);

res.json({
success:true
});

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

app.post("/sync-sales", checkAdmin, async (req, res) => {

    try {

        await syncSales();

        res.json({
            success: true,
            message: "Sales Sync Completed ✅"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Sales Sync Failed ❌"
        });

    }

});

app.post("/sync-items", checkAdmin, async (req, res) => {

    try {

        await syncItems();

        res.json({
            success: true,
            message: "Full Sync Completed ✅"
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Full Sync Failed ❌"
        });

    }

});

/* ================= START ================= */
server.listen(process.env.PORT || 5000, () => {
  console.log("Server running 🚀");
    syncItems();
   syncSales();
});

// Sales Sync - Every 30 Minutes
cron.schedule("*/30 * * * *", async () => {

    console.log("Auto Sales Sync...");

    await syncSales();

});

// Every day at 3:00 AM
cron.schedule("0 3 * * *", async () => {

    console.log("Auto Full Sync...");

    await syncItems();

});
