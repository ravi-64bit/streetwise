require('dotenv').config();

const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase.json');
const session = require('express-session');

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



// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Dummy session for demo (replace with real auth/session in production)
const DEMO_VENDOR_PHONE = '9999999999'; // Change as needed

// Helper: Get vendor by username (phone number)
async function getVendorByUsername(username) {
  const snapshot = await db.collection('vendor').where('username', '==', username).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

// Helper: Get vendor by ID
async function getVendorById(id) {
  const doc = await db.collection('vendor').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Helper: Get plates for vendor
async function getVendorPlates(vendorId) {
  const snapshot = await db.collection('plates')
    .where('vendorId', '==', vendorId)
    .orderBy('number', 'asc')
    .get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      number: data.number,
      items: data.items || [],
      total: (data.items || []).reduce((sum, item) => sum + (item.price || 0), 0)
    };
  });
}

// Helper: Get menu items for vendor
async function getVendorMenuItems(vendorId) {
  const snapshot = await db.collection('menuItems')
    .where('vendorId', '==', vendorId)
    .get();
  return snapshot.docs.map(doc => ({
    _id: doc.id,
    name: doc.data().itemName,
    price: doc.data().price
  }));
}

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

  req.session.vendorId = vendor.id; // Save vendor ID to session
  res.redirect('/dashboard');
});

app.get("/dashboard", async (req, res) => {
  const vendorId = req.session.vendorId;
  if (!vendorId) return res.status(401).send("Unauthorized");

  const vendor = await getVendorById(vendorId);
  if (!vendor) return res.status(404).send("Vendor not found");

  const plates = await getVendorPlates(vendor.id);
  const menuItems = await getVendorMenuItems(vendor.id);

  res.render('dashboard', { vendor, plates, menuItems });
});


app.listen(PORT, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("server running at http://localhost:3000");
  }
});