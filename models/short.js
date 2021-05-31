const mongoose = require("mongoose");

const ShortSchema = new mongoose.Schema({
	long: {
		type: String,
		required: true,
	},
	short: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
	},
	clicks: {
		type: Number,
		required: true,
		default: 0,
	},
	time: {
		// Check this
		type: Date,
		required: true,
	},
});

module.exports = mongoose.model("short", ShortSchema);
