require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const shortModel = require("./models/short");
const crypto = require("crypto");
const favicon = require("serve-favicon");
require("dotenv").config();
const rateLimit = require("express-rate-limit");
const fetch = require("node-fetch");

const DB_URI = process.env.DB_URI;

mongoose
	.connect(DB_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.catch((error) => console.error(error));

const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: "Too many requests from this IP, please try again after a minute",
});

app.use("/shorten", apiLimiter);

const createAccountLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 10,
	message: "Too many requests from this IP, please try again after a minute",
});

// Make sure view engine uses ejs-layouts
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: false }));
app.use(favicon(__dirname + "/public/favicon.ico"));
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
	let hasUrlBeenShortened = false;
	let doErrorsExist = false;
	let errors = "";
	let shortenedURL = "";
	let shortened = "";
	res.render("index", {
		doErrorsExist,
		errors,
		hasUrlBeenShortened,
		shortenedURL,
		shortened,
	});
});

app.get("/stats/:slug", async (req, res) => {
	const slug = await shortModel.findOne({ short: req.params.slug });
	let slugExists = slug != null;
	let clicks;
	slugExists ? (clicks = slug.clicks) : (clicks = null);

	console.log(clicks);
	res.render("stats", { slugExists, clicks });
});

function isEmpty(str) {
	return !str.trim().length;
}

// Post to actually shorten url

// TO-DO: Refactor
app.post("/shorten", createAccountLimiter, async (req, res) => {
	const secret_key = process.env.SECRET_KEY;
	const token = req.body["g-recaptcha-response"];
	const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;

	const data = {
		secret_key,
		token,
	};

	try {
		const response = await fetch(url, {
			method: "post",
			body: JSON.stringify(data),
		});

		const responseJSON = await response.json();

		if (responseJSON.success) {
			let doErrorsExist = false;
			let errors = "";

			const long = req.body.long;
			const short =
				req.body.short === "" ||
				req.body.short === null ||
				!req.body.short.match(/^[a-zA-Z]+?[^\\\/:*?"<>|\n\r]+$/) ||
				isEmpty(req.body.short)
					? crypto
							.createHash("sha256")
							.update(long)
							.digest("hex")
							.substring(0, 7)
					: req.body.short;
			const type =
				req.body.short === "" ||
				req.body.short === null ||
				!req.body.short.match(/^[a-zA-Z]+?[^\\\/:*?"<>|\n\r]+$/) ||
				isEmpty(req.body.short)
					? "generated"
					: "manual";

			let shortURLtoLookUp = await shortModel.findOne({ long, short });
			let onlyShortToLookUp = await shortModel.findOne({ short, type });

			if (onlyShortToLookUp && onlyShortToLookUp.type == "manual") {
				doErrorsExist = true;
				errors = "Sorry, that short URL already exists!";
				console.log("short url exists");
			} else if (shortURLtoLookUp) {
				console.log(shortURLtoLookUp);
			} else {
				await shortModel.create({ long, short, type });
				console.log(long, short, type);
			}

			let hasUrlBeenShortened = true;
			let shortenedURL = `https://www.mcow.ml/${short}`;
			let shortened = `mcow.ml/${short}`;

			res.render("index", {
				doErrorsExist,
				errors,
				hasUrlBeenShortened,
				shortenedURL,
				shortened,
			});
			console.log("CAPTCHA PASSED, SUCCESS");
		} else {
			let doErrorsExist = true;
			let errors = "Captcha Failed!";

			let hasUrlBeenShortened = false;
			let shortenedURL = ``;
			let shortened = ``;
			res.render("index", {
				doErrorsExist,
				errors,
				hasUrlBeenShortened,
				shortenedURL,
				shortened,
			});
			console.log("CAPTCHA FAILED");
		}
	} catch (err) {
		console.error(err);
		return;
	}
});

app.get("/:slug", async (req, res) => {
	try {
		var shortUrl = await shortModel.findOne({ short: req.params.slug });
	} catch (err) {
		console.error(err);
	}

	if (shortUrl == null) return res.render("404");

	shortUrl.clicks++;
	shortUrl.save();

	console.log(shortUrl.clicks);
	console.log(`Redirecting to ${shortUrl.long}`);
	res.status(301).redirect(shortUrl.long);
});

// Set PORT for production and local
const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server started on port ${PORT}`));
