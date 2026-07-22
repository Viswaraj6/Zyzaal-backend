const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({

  name: String,
  styleNo: String,
  price: Number,
  stock: Number,

  images: [String],
  primaryImage: String,

  brand: String,
  fabric: String,
  typeDetail: String,
  fit: String,
  pattern: String,
  color: String,
  occasion: String,
  description: String,

  sizes: [String],

  sizeStock:[
    {
      size:String,
      stock:Number,
      sku:String,
      image:String
    }
  ],

  category:String,

  lastSync:Date

},{
  timestamps:true
});

module.exports = mongoose.model("Product", ProductSchema);
