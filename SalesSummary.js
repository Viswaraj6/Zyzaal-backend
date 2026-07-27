const mongoose = require("mongoose");

const SalesSummarySchema = new mongoose.Schema({

    date: String,

    store: String,

    sales: {
        type: Number,
        default: 0
    },

    cash: {
        type: Number,
        default: 0
    },

    card: {
        type: Number,
        default: 0
    },

    qr: {
        type: Number,
        default: 0
    },

    wallet: {
        type: Number,
        default: 0
    },

    creditNote: {
        type: Number,
        default: 0
    },

    paymentReceived: {
        type: Number,
        default: 0
    }

});

module.exports = mongoose.model(
    "SalesSummary",
    SalesSummarySchema
);
