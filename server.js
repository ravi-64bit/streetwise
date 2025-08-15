require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

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
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

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

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const vendor = await getVendorByUsername(username);
  if (!vendor) {
    return res.status(401).render('login', { error: "Vendor not found" });
  }
  if (vendor.password !== password) {
    return res.status(403).render('login', { error: "Invalid password" });
  }
  req.session.vendorId = vendor.id;
  //console.log(vendor.id)
  res.redirect('/dashboard');
});

app.get("/dashboard", async (req, res) => {
  const vendorId = req.session.vendorId;
  if (!vendorId) return res.status(401).render('unauthorized', { title: "Unauthorized access" });

  const vendor = await getVendorById(vendorId);
  if (!vendor) return res.status(404).send("Vendor not found");

  //const plates = await getVendorPlates(vendor.id);
  const menuItems = await getVendorMenuItems(vendor.id);

  res.render('dashboard', { vendor, menuItems });
});

// Render Add Menu page
app.get("/add-menu", async (req, res) => {
  if (!req.session.vendorId) return res.status(401).render('unauthorized', { title: "Unauthorized access" });
  const menuItems = await MenuItem.find({ vendorId: req.session.vendorId }).lean();
  res.render('add-menu', { error: null, menuItems });
});

// Handle Add Menu form submission
app.post("/add-menu", async (req, res) => {
  if (!req.session.vendorId) return res.status(401).render('unauthorized', { title: "Unauthorized access" });
  const { itemName, price } = req.body;
  if (!itemName || !price) {
    return res.render('add-menu', { error: "All fields required" });
  }
  try {
    await MenuItem.create({
      vendorId: req.session.vendorId,
      itemName,
      price: parseFloat(price)
    });
    res.redirect('/add-menu');
  } catch (err) {
    res.render('add-menu', { error: "Error adding menu item" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Internal server error");
    }
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
