require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose'); // Add at the top
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Import DB helpers
const {
  getVendorByUsername,
  getVendorById,
  getVendorMenuItems
} = require('./db');
const { MenuItem } = require('./db'); // Add this export in db.js if not present

const PORT = process.env.PORT;
const SESSION_SECRET = process.env.SESSION_SECRET_KEY;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true on Vercel
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  const vendor = await getVendorByUsername(username);
  if (!vendor) return done(null, false, { message: 'Vendor not found' });
  if (vendor.password !== password) return done(null, false, { message: 'Invalid password' });
  return done(null, vendor);
}));

passport.serializeUser((vendor, done) => {
  done(null, vendor.id);
});

passport.deserializeUser(async (id, done) => {
  const vendor = await getVendorById(id);
  done(null, vendor);
});

// ROUTES
app.get("/", (req, res) => {
  res.render('index');
});

app.get("/login", (req, res) => {
  if (req.session.vendorId) {
    return res.redirect('/dashboard');
  }
  else{
  res.render('login', { error: null });
  }
});

// Login route
app.post("/login", passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: false
}));

app.get("/dashboard", async (req, res) => {
  const vendorId = req.session.vendorId;
  if (!vendorId) return res.status(401).render('unauthorized', { title: "Unauthorized access" });

  const vendor = await getVendorById(vendorId);
  if (!vendor) return res.status(404).send("Vendor not found");

  const menuItems = await getVendorMenuItems(vendorId); // Use vendorId directly
  res.render('dashboard', { vendor, menuItems });
});

// Auth middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).render('unauthorized', { title: "Unauthorized access" });
}

// Use middleware for protected routes
app.get("/dashboard", ensureAuthenticated, async (req, res) => {
  const vendor = req.user;
  const menuItems = await getVendorMenuItems(vendor.id);
  res.render('dashboard', { vendor, menuItems });
});

// Render Add Menu page
app.get("/add-menu", async (req, res) => {
  if (!req.session.vendorId) return res.status(401).render('unauthorized', { title: "Unauthorized access" });
  const menuItems = await MenuItem.find({ vendorId: mongoose.Types.ObjectId(req.session.vendorId) }).lean();
  res.render('add-menu', { error: null, menuItems });
});

app.get("/add-menu", ensureAuthenticated, async (req, res) => {
  const menuItems = await MenuItem.find({ vendorId: mongoose.Types.ObjectId(req.user.id) }).lean();
  res.render('add-menu', { error: null, menuItems });
});

// Handle Add Menu form submission
app.post("/add-menu", async (req, res) => {
  if (!req.session.vendorId) return res.status(401).render('unauthorized', { title: "Unauthorized access" });
  const { itemName, price } = req.body;
  if (!itemName || !price) {
    const menuItems = await MenuItem.find({ vendorId: mongoose.Types.ObjectId(req.session.vendorId) }).lean();
    return res.render('add-menu', { error: "All fields required", menuItems });
  }
  try {
    await MenuItem.create({
      vendorId: mongoose.Types.ObjectId(req.session.vendorId),
      itemName,
      price: parseFloat(price)
    });
    res.redirect('/add-menu');
  } catch (err) {
    const menuItems = await MenuItem.find({ vendorId: mongoose.Types.ObjectId(req.session.vendorId) }).lean();
    res.render('add-menu', { error: "Error adding menu item", menuItems });
  }
});

app.post("/add-menu", ensureAuthenticated, async (req, res) => {
  const { itemName, price } = req.body;
  if (!itemName || !price) {
    const menuItems = await MenuItem.find({ vendorId: mongoose.Types.ObjectId(req.user.id) }).lean();
    return res.render('add-menu', { error: "All fields required", menuItems });
  }
  try {
    await MenuItem.create({
      vendorId: mongoose.Types.ObjectId(req.user.id),
      itemName,
      price: parseFloat(price)
    });
    res.redirect('/add-menu');
  } catch (err) {
    const menuItems = await MenuItem.find({ vendorId: mongoose.Types.ObjectId(req.user.id) }).lean();
    res.render('add-menu', { error: "Error adding menu item", menuItems });
  }
});

// Logout route
app.post("/logout", (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

// Start server
app.listen(PORT, (error) => {
  if (error) {
    console.error(error);
  } else {
    console.log(`server running at http://localhost:${PORT}`);
  }
});

module.exports = app;
