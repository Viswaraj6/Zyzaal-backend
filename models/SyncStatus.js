const mongoose = require("mongoose");

const SyncStatusSchema = new mongoose.Schema({

    type: {
        type: String,
        unique: true
    },

    lastInvoiceId: String,

    lastSyncTime: Date,

    // Full Sync Resume
    lastItemIndex: {
        type: Number,
        default: 0
    },

    lastItemId: {
        type: String,
        default: ""
    },

    lastStyleNo: {
        type: String,
        default: ""
    },

    status: {
        type: String,
        default: "idle"
    }

});

module.exports = mongoose.model(
    "SyncStatus",
    SyncStatusSchema
);
