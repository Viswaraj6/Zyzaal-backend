const mongoose = require("mongoose");

const POSBillSchema = new mongoose.Schema({

    billNo: String,
    
    brandId: {
    type: String,
    required: true,
    enum: ["FARK618", "ZYZAAL"]
},
    customer: Object,

    items: Array,

    payments: Array,

    total: Number,

    discount: Number,
    roundOff: Number,
    tax: Number,

    cgst: Number,
    sgst: Number,

    grandTotal: Number,

    
invoiceStatus: {
    type: String,
    enum: ["Open", "Closed"],
    default: "Open"
},

paymentStatus: {
    type: String,
    enum: ["Pending", "Partial", "Paid"],
    default: "Pending"
},

closedAt: {
    type: Date,
    default: null
},

    
    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("POSBill", POSBillSchema);
