// db.js
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swdb';

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// Vendor Schema
const vendorSchema = new mongoose.Schema({
  username: String,
  password: String,
  // add other fields as needed
});
const Vendor = mongoose.model('Vendor', vendorSchema);

// Plate Schema
const plateSchema = new mongoose.Schema({
  vendorId: mongoose.Schema.Types.ObjectId,
  number: Number,
  items: [{ itemName: String, price: Number }]
});
const Plate = mongoose.model('Plate', plateSchema);

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

// Get plates for vendor
async function getVendorPlates(vendorId) {
  const plates = await Plate.find({ vendorId }).sort({ number: 1 }).lean();
  return plates.map(plate => ({
    id: plate._id.toString(),
    number: plate.number,
    items: plate.items || [],
    total: (plate.items || []).reduce((sum, item) => sum + (item.price || 0), 0)
  }));
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
  getVendorPlates,
  getVendorMenuItems
};
