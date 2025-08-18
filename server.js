require('dotenv').config()
const express = require('express')
const path = require('path')
const session = require('express-session')
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const MongoStore = require('connect-mongo')
const methodOverride = require('method-override')
const QRCode = require('qrcode')

// DB helpers
const {
  getVendorByUsername,
  getVendorById,
  getVendorMenuItems,
  MenuItem,
  Order
} = require('./db')

const app = express()
app.set('trust proxy', 1) // important for secure cookies on Vercel

// Middleware
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 60 * 60 * 24 * 7
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

// Passport
passport.use(new LocalStrategy(async (username, password, done) => {
  const vendor = await getVendorByUsername(username)
  if (!vendor) return done(null, false, { message: 'Vendor not found' })
  if (vendor.password !== password) return done(null, false, { message: 'Invalid password' })
  return done(null, vendor)
}))
passport.serializeUser((vendor, done) => done(null, vendor.id))
passport.deserializeUser(async (id, done) => {
  const vendor = await getVendorById(id)
  done(null, vendor)
})

// Auth middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next()
  res.status(401).render('unauthorized', { title: "Unauthorized access" })
}

// Routes
app.get("/", (req, res) => res.render('index'))

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard')
  res.render('login', { error: null })
})

app.post("/login", passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}))

app.get("/dashboard", ensureAuthenticated, async (req, res) => {
  const vendor = req.user
  const menuItems = await getVendorMenuItems(vendor.id)
  const orders = await Order.find({ vendorId: vendor.id }).sort({ createdAt: -1 }).lean()
  res.render('dashboard', { vendor, menuItems, orders })
})

app.delete('/api/orders/:orderId', async (req, res) => {
  try {
    await Order.deleteOne({ _id: req.params.orderId })
    res.redirect('/dashboard')
  } catch (err) {
    console.error("Error deleting order:", err)
    res.status(500).send('Internal server error')
  }
})


app.get("/add-menu", ensureAuthenticated, async (req, res) => {
  const menuItems = await MenuItem.find({
    vendorId: new mongoose.Types.ObjectId(req.user.id)
  }).lean()
  const vendorId = req.user.id;
  const qrUrl= `https://streetwise-io6z.vercel.app/order/${vendorId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);
  
  res.render('add-menu', {
     error: null,
      menuItems,
      qrUrl, 
      qrCodeDataUrl});
})


app.post("/add-menu", ensureAuthenticated, async (req, res) => {
  const { itemName, price } = req.body
  if (!itemName || !price) {
    const menuItems = await MenuItem.find({
      vendorId: new mongoose.Types.ObjectId(req.user.id)
    }).lean()
    return res.render('add-menu', { error: "All fields required", menuItems })
  }
  try {
    await MenuItem.create({
      vendorId: new mongoose.Types.ObjectId(req.user.id),
      itemName,
      price: parseFloat(price)
    })
    res.redirect('/add-menu')
  } catch (err) {
    console.error("Error creating menu item:", err) 
    const menuItems = await MenuItem.find({
      vendorId: new mongoose.Types.ObjectId(req.user.id)
    }).lean()
    res.render('add-menu', { error: "Error adding menu item", menuItems })
  }
})


app.post("/logout", (req, res) => {
  req.logout(() => res.redirect('/login'))
})


app.get("/register", (req, res) => {
  res.send('<marquee scrollamount=12><h1>please reach to the developer at <a style="font-size:50px" href="tel:+916281407118">+91 6281407118</a> to register your business</h1></marquee>');
})

app.get("/order/:vendorId", async (req, res) => {
  const vendorId = req.params.vendorId
  if (vendorId == null) {
    return res.status(400).send('Vendor ID is required')
  }
  try{
    const vendor = await getVendorById(vendorId)
    if (!vendor) {
      return res.status(404).send('Vendor not found')
    }
    const menuItems = await getVendorMenuItems(vendorId)
    res.render('order', { vendor, menuItems, vendorId })
  }
  catch(err) {
    console.error("Error fetching vendor or menu items:", err)
    res.status(500).send('Internal server error')
  }
})


app.post('/api/orders', async (req, res) => {
  const { vendorId, quantities } = req.body
  if (!vendorId || !quantities) return res.status(400).send('Missing data')

  const itemIds = Object.keys(quantities)
  const menuItems = await MenuItem.find({ _id: { $in: itemIds } })

  const items = menuItems.map(item => {
    const qty = parseInt(quantities[item._id], 10)
    if (isNaN(qty) || qty <= 0) return null
    return qty > 0 ? {
      itemId: item._id,
      itemName: item.itemName,
      price: item.price,
      quantity: qty
    } : null
  }).filter(Boolean)

  if (!items.length) return res.status(400).send('No items selected')

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  function generateOrderCode(vendorId) {
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `ODR-${vendorId.slice(-4)}-${suffix}`
}

const order = await Order.create({
  vendorId,
  items,
  total,
  createdAt: new Date(),
  status: 'pending',
  orderCode: generateOrderCode(vendorId),
  expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
})


  res.redirect(`/order-success?orderId=${order._id}`)
})

app.get('/order-success', async (req, res) => {
  const orderId = req.query.orderId
  if (!orderId) return res.status(400).send('Missing order ID')

  try {
    const order = await Order.findById(orderId).lean()
    if (!order) return res.status(404).send('Order not found')

    const vendor = await getVendorById(order.vendorId)
    res.render('order-success', { order, vendor })
  } catch (err) {
    console.error("Error loading order success page:", err)
    res.status(500).send('Internal server error')
  }
})





// Start
app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running at http://localhost:${process.env.PORT || 3000}`)
)

module.exports = app
