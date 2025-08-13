// db.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase.json');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// === DB Helper functions ===

// Get vendor by username (phone number)
async function getVendorByUsername(username) {
  const snapshot = await db.collection('vendor').where('username', '==', username).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

// Get vendor by ID
async function getVendorById(id) {
  const doc = await db.collection('vendor').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Get plates for vendor
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

// Get menu items for vendor
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

module.exports = {
  getVendorByUsername,
  getVendorById,
  getVendorPlates,
  getVendorMenuItems
};
