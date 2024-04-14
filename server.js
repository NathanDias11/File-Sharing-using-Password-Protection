require("dotenv").config()
const multer = require("multer")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const File = require("./models/File")

const express = require("express")
const app = express()
app.use(express.urlencoded({ extended: true }))

const upload = multer({ dest: "uploads" })

mongoose.connect(process.env.DATABASE_URL)

app.set("view engine", "ejs")

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

    // If a password is provided, hash it and save it to the database
    if (req.body.password != null && req.body.password !== "") {
      file.password = await bcrypt.hash(req.body.password, 10);
      await file.save();
      
      // Redirect to password page
      res.render("password", { file, error: false }); // Pass the file variable and set error to false
      return;
    }

    // Redirect to download page
    res.redirect(`/file/${file.id}`);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file");
  }
});

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  // Check if file has a password set
  if (file.password != null) {
    if (req.body.password == null) {
      res.render("password", { file, error: false }); // Pass the file variable and set error to false
      return;
    }

    // Compare provided password with stored hash
    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("password", { file, error: true }); // Pass the file variable and set error to true
      return;
    }
  }

  // Continue with download if password is correct
  file.downloadCount++;
  await file.save();
  console.log(file.downloadCount);
  res.download(file.path, file.originalName);
}

app.route("/file/:id").get(handleDownload).post(handleDownload);

app.listen(process.env.PORT);
