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
// Live stock for POS
stock: {
  type: Number,
  min: 0,
  default: 0
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
  {
    _id: false
  }
);

const ProductSchema = new mongoose.Schema(
  {
    // Brand / Tenant Separation
    brandId: {
      type: String,
      required: true,
      enum: ["FARK618", "ZYZAAL"],
      index: true,
      trim: true
    },

    // Existing fields
    name: {
      type: String,
      trim: true
    },

    gender: {
      type: String,
      trim: true
    },

    styleNo: {
      type: String,
      trim: true
    },

    price: {
      type: Number,
      min: 0
    },

    stock: {
      type: Number,
      default: 0
    },

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

    // Existing POS / E-Commerce structure
    sizeStock: [
      {
        size: String,
        stock: Number,
        sku: String,
        image: String
      }
    ],

    category: {
      type: String,
      trim: true
    },

    hsnCode: {
      type: String,
      trim: true
    },

    // Exact product variants
    variants: [VariantSchema],

    lastSync: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Faster product filtering by brand and style
ProductSchema.index({
  brandId: 1,
  styleNo: 1
});

module.exports = mongoose.model("Product", ProductSchema);
