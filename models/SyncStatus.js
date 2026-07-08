const mongoose = require("mongoose");

const SyncStatusSchema = new mongoose.Schema({

    type: {
        type: String,
        unique: true
    },

    lastInvoiceId: String,

    lastSyncTime: Date

});

module.exports = mongoose.model(
    "SyncStatus",
    SyncStatusSchema
);
