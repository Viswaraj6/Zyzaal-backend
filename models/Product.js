const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
  {
    colour: {
      type: String,
      trim: true
    },

    colourCode: {
      type: String,
      trim: true
    },

    size: {
      type: String,
      trim: true
    },

    sku: {
      type: String,
      trim: true
    },

    barcode: {
      type: String,
      trim: true
    },

    ean: {
      type: String,
      trim: true
    },

    purchaseRate: {
      type: Number,
      min: 0
    },

    mrp: {
      type: Number,
      min: 0
    },

    sellingPrice: {
      type: Number,
      min: 0
    },

    openingStock: {
      type: Number,
      min: 0
    },

    warehouse: {
      type: String,
      trim: true
    },

    gstType: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema({
  // Existing fields
  name: String,
  gender: {
  type: String,
  trim: true
},
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

  // Existing POS/E-Commerce structure
  sizeStock: [
    {
      size: String,
      stock: Number,
      sku: String,
      image: String
    }
  ],

  category: String,
  hsnCode: String,

  // NEW: Exact product variants
  variants: [VariantSchema],

  lastSync: Date
});

module.exports = mongoose.model("Product", ProductSchema);
