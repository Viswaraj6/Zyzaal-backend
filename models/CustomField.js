const mongoose = require("mongoose");

const CustomFieldSchema = new mongoose.Schema(
  {
    brandId: {
      type: String,
      required: true,
      enum: ["FARK618", "ZYZAAL"],
      index: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "number",
        "dropdown",
        "date",
        "checkbox"
      ],
      default: "text"
    },

    options: {
      type: [String],
      default: []
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    required: {
      type: Boolean,
      default: false
    },

    showInImport: {
      type: Boolean,
      default: false
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

CustomFieldSchema.index(
  { brandId: 1, name: 1 },
  { unique: true }
);

module.exports =
  mongoose.model("CustomField", CustomFieldSchema);
