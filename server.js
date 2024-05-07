require("dotenv").config();
const multer = require("multer");
const mongoose = require("mongoose");
const express = require("express");
const { randomBytes } = require('crypto');
const crypto = require('crypto');
const fs = require('fs');

// Import the File model
const File = require("./models/File");

const app = express();
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL);

app.set("view engine", "ejs");

// Generate a random key for XOR operation
const xorKey = randomBytes(32); // Generate a 32-byte (256-bit) random key

app.get("/", (req, res) => {
  // Render the index page template or redirect to another page
  res.render("index");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  };

  try {
    // Save file data to the database
    const file = await File.create(fileData);

    // Calculate the MD5 hash of the uploaded file
    const uploadedFileHash = await calculateMD5(file.path);

    // Store the uploaded file hash in the database
    file.uploadedFileHash = uploadedFileHash;
    await file.save();

    // Redirect to password page
    res.render("password", { file, error: false });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file");
  }
});


async function handleDownload(req, res) {
  
  const fileId = req.params.id;
  const file = await File.findById(fileId);

  if (!file) {
    console.log('File not found');
    return res.status(404).send('File not found');
  }

  // Retrieve the uploaded file hash from the database
  const uploadedFileHash = file.uploadedFileHash;
  console.log('Uploaded file hash:', uploadedFileHash);
  if (!uploadedFileHash) {
    console.error('Uploaded file MD5 hash not provided');
    return res.status(500).send('Uploaded file MD5 hash not provided');
  }

  // Calculate MD5 hash of the downloaded file
  let downloadedFileHash;
  try {
    downloadedFileHash = await calculateMD5(file.path);
    console.log('MD5 hash of downloaded file:', downloadedFileHash);
  } catch (error) {
    console.error('Error calculating MD5 hash of downloaded file:', error);
    return res.status(500).send('Error calculating MD5 hash of downloaded file');
  }

  // Compare the MD5 hashes
  if (uploadedFileHash !== downloadedFileHash) {
    console.log('Hashes do not match');
    return res.status(500).send('File tampered: MD5 hashes do not match');
  } else {
    console.log('Hashes match');
    res.download(file.path, file.originalName);
  }
}


app.route("/file/:id").get(handleDownload).post(handleDownload);

app.listen(process.env.PORT);

// Hashing function using XOR operation
function hashWithXOR(data, key) {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key[i % key.length]);
  }
  return result;
}

// Function to calculate the MD5 hash of a file
function calculateMD5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', error => reject(error));
  });
}
