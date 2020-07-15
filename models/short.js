const mongoose = require("mongoose");

const shortSchema = new mongoose.Schema({
    long: {
        type: String,
        required: true
    },
    short: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("short", shortSchema);
