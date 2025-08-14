require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

// Import DB helpers
const {
  getVendorByUsername,
  getVendorById,
  getVendorPlates,
  getVendorMenuItems
} = require('./db');

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
  res.render('login', { error: null });
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

  const plates = await getVendorPlates(vendor.id);
  const menuItems = await getVendorMenuItems(vendor.id);

  res.render('dashboard', { vendor, plates, menuItems });
});

// Start server
app.listen(PORT, (error) => {
  if (error) {
    console.error(error);
  } else {
    console.log(`server running at http://localhost:${PORT}`);
  }
});
