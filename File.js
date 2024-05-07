const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  password: String,
  downloadCount: {
    type: Number,
    required: true,
    default: 0
  },
  uploadedFileHash: String, // Store the MD5 hash of the uploaded file
  downloadedFileHash: String // Store the MD5 hash of the downloaded file
});

module.exports = mongoose.model("File", fileSchema);
