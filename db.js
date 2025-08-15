// db.js
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Vendor Schema
const vendorSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  address: String
});
const Vendor = mongoose.model('Vendor', vendorSchema);

// Menu Item Schema
const menuItemSchema = new mongoose.Schema({
  vendorId: mongoose.Schema.Types.ObjectId,
  itemName: String,
  price: Number
});
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Get vendor by username
async function getVendorByUsername(username) {
  const vendor = await Vendor.findOne({ username }).lean();
  if (!vendor) return null;
  vendor.id = vendor._id.toString();
  return vendor;
}

// Get vendor by ID
async function getVendorById(id) {
  const vendor = await Vendor.findById(id).lean();
  if (!vendor) return null;
  vendor.id = vendor._id.toString();
  return vendor;
}

// Get menu items for vendor
async function getVendorMenuItems(vendorId) {
  const items = await MenuItem.find({ vendorId }).lean();
  return items.map(item => ({
    _id: item._id.toString(),
    name: item.itemName,
    price: item.price
  }));
}

module.exports = {
  getVendorByUsername,
  getVendorById,
  getVendorMenuItems,
  MenuItem // <-- Add this line to export MenuItem model
};
