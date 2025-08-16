require('dotenv').config()
const express = require('express')
const path = require('path')
const session = require('express-session')
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const MongoStore = require('connect-mongo')

// DB helpers
const {
  getVendorByUsername,
  getVendorById,
  getVendorMenuItems,
  MenuItem
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
  res.render('dashboard', { vendor, menuItems })
})

app.get("/add-menu", ensureAuthenticated, async (req, res) => {
  const menuItems = await MenuItem.find({
    vendorId: new mongoose.Types.ObjectId(req.user.id)
  }).lean()
  res.render('add-menu', { error: null, menuItems })
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
    console.error("Error creating menu item:", err) // 👈 Add this for better logs
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
  res.send('<marquee><h1>please reach to the developer at <a style="font-size:50px" href="tel:+916281407118">+91 6281407118</a> to register your business</h1></marquee>');
})

// Start
app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running at http://localhost:${process.env.PORT || 3000}`)
)

module.exports = app
