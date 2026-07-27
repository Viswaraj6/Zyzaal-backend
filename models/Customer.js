const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true,
        trim:true
    },

    mobile:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },

    email:{
        type:String,
        default:""
    },

    address:{
        type:String,
        default:""
    },

    city:{
        type:String,
        default:""
    },

    pincode:{
        type:String,
        default:""
    },

    gstNo:{
        type:String,
        default:""
    },

    loyaltyPoints:{
        type:Number,
        default:0
    },

    totalPurchase:{
        type:Number,
        default:0
    }

},{
    timestamps:true
});

module.exports = mongoose.model("Customer",CustomerSchema);
