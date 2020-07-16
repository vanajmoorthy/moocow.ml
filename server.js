const express = require("express");
const app = express();
const mongoose = require("mongoose")
const shortModel = require("./models/short")
const crypto = require("crypto")
const favicon = require('serve-favicon');
require("dotenv").config()

const pass = process.env.PASS

mongoose.connect(`mongodb+srv://admin:${pass}@short.xd39u.mongodb.net/short?retryWrites=true&w=majority`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(error => console.error(error));

// Make sure view engine uses ejs
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(favicon(__dirname + '/public/favicon.ico'));

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
    const short = (req.body.short === "" || req.body.short === null || isEmpty(req.body.short)) ? crypto.createHash('sha256').update(long).digest('hex').substring(0, 7) : req.body.short;

    let shortURLtoLookUp = await shortModel.findOne({ long, short });

    if (!shortURLtoLookUp) {
        await shortModel.create({ long, short });
        console.log(long, short)
    } else {
        console.log(shortURLtoLookUp + " !")
    }

    let shortenedURL = `https://moocow.ml/${short}`
    res.render("shorten", { shortenedURL });
})

app.get('/:shortUrl', async (req, res) => {
    try {
        var shortUrl = await shortModel.findOne({ short: req.params.shortUrl })
    } catch (err) {
        console.error(err)
    }

    if (shortUrl == null) return res.sendStatus(404)

    console.log(`Redirecting to ${shortUrl.long}`)
    res.redirect(shortUrl.long)
})

// Set PORT for production and local
const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server started on port ${PORT}`))
