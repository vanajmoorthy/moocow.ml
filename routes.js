const shortModel = require("./models/Short");
const fetch = require("node-fetch");
const passport = require("passport");
const User = require("./models/User");
const bcrypt = require("bcrypt");

const isEmpty = (str) => {
	return !str.trim().length;
};

const isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect("/login");
};

const isLoggedOut = (req, res, next) => {
	if (!req.isAuthenticated()) {
		return next();
	}
	res.redirect("/");
};

module.exports = (app) => {
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

	app.get("/signup", (req, res) => {
		res.render("signup");
	});

	app.post("/signup", async (req, res) => {
		const exists = await User.exists({ email: req.body.email });

		let errors = [];

		if (exists) {
			errors.push("User exists");
			res.redirect("/signup");
		} else {
			bcrypt.genSalt(10, function (err, salt) {
				if (err) return next(err);
				bcrypt.hash("pass", salt, function (err, hash) {
					if (err) return next(err);

					const newUser = new User({
						email: req.body.email,
						password: hash,
					});

					newUser.save();
				});
			});
		}
		res.redirect("/");
	});

	app.get("/profile", isLoggedIn, (req, res) => {
		res.render("profile");
	});

	app.get("/login", (req, res) => {
		res.render("login");
	});

	app.post(
		"/login",
		isLoggedOut,
		passport.authenticate("local", {
			successRedirect: "/",
			fail: "/login?error=true",
		})
	);

	app.get("/logout", (req, res) => {
		req.logout();
		res.redirect("/");
	});

	// Setup admin
	app.get("/setup", async (req, res) => {
		const exists = await User.exists({ email: "admin@admin.com" });

		if (exists) {
			res.redirect("/login");
			return;
		}

		bcrypt.genSalt(10, function (err, salt) {
			if (err) return next(err);
			bcrypt.hash("pass", salt, function (err, hash) {
				if (err) return next(err);

				const newAdmin = new User({
					email: "admin@admin.com",
					password: hash,
				});

				newAdmin.save();

				res.redirect("/login");
			});
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

	// Post to actually shorten url
	// TO-DO: Refactor
	app.post("/shorten", async (req, res) => {
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

				let shortURLtoLookUp = await shortModel.findOne({
					long,
					short,
				});

				let onlyShortToLookUp = await shortModel.findOne({
					short,
					type,
				});

				if (onlyShortToLookUp && onlyShortToLookUp.type == "manual") {
					doErrorsExist = true;
					errors = "Sorry, that short URL already exists!";
					console.log("short url exists");
				} else if (shortURLtoLookUp) {
					console.log(shortURLtoLookUp);
				} else {
					let date = Date.now();
					await shortModel.create({ long, short, type, date });
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
};
