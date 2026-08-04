const mongoose = require("mongoose");

const POSBillSchema = new mongoose.Schema({

    billNo: String,

    customer: Object,

    items: Array,

    payments: Array,

    total: Number,

    discount: Number,

    tax: Number,

    grandTotal: Number,

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("POSBill", POSBillSchema);
