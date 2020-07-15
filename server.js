const express = require("express");
const app = express();
const mongoose = require("mongoose")
const shortModel = require("./models/short")
const md5 = require("md5")
require("dotenv").config()

const uri = process.env.DB_URI

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(error => console.error(error));

// Make sure view engine uses ejs
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

// Default get route for ejs template
app.get("/", (req, res) => {
    res.render("index");
})

function isEmpty(str) {
    return !str.trim().length;
}

// Post to actually shorten url
app.post("/shorten", async (req, res) => {
    const long = req.body.long;
    const short = (req.body.short === "" || req.body.short === null || isEmpty(req.body.short)) ? md5(long).substring(0, 7) : req.body.short;

    let shortURLtoLookUp = await shortModel.findOne({ long, short });

    if (!shortURLtoLookUp) {
        await shortModel.create({ long, short });
        console.log(long, short)
    } else {
        console.log(shortURLtoLookUp + " !")
    }

    res.redirect("/")
})

app.get('/:shortUrl', async (req, res) => {
    try {
        var shortUrl = await shortModel.findOne({ short: req.params.shortUrl })
    } catch (err) {
        console.error(err)
    }

    if (shortUrl == null) return res.sendStatus(404)

    res.redirect(shortUrl.long)
})

// Set PORT for production and local
const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server started on port ${PORT}`))
