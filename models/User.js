const mongoose = require("mongoose");

const User = new mongoose.Schema({
  long : {
    type : String,
    required : true,
  },
  short : {
    type : String,
    required : true,
  },
  type : {
    type : String,
    required : true,
  },
  clicks : {
    type : Number,
    required : true,
    default : 0,
  },
});

module.exports = mongoose.model("short", shortSchema);
