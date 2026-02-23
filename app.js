const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();   // ✅ CREATE APP FIRST
const PORT = 3000;

// ✅ SESSION AFTER app INITIALIZATION
app.use(session({
    secret: 'computer-management-secret',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const dbPath = path.join(__dirname, 'data', 'db.json');

function readData() {
    try {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(raw);
    } catch (error) {
        console.log("Error reading DB:", error);
        return {
            products: [],
            customers: [],
            services: [],
            sales: [],
            messages: []
        };
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log("DB Updated Successfully ✅");
    } catch (error) {
        console.log("Error writing DB:", error);
    }
}

require('dotenv').config();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ================= ROOT ROUTE =================
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    return res.redirect('/welcome');
});

// ================= PRODUCTS =================
app.get('/products', isAuthenticated, (req, res) => {
    const data = readData();
    res.render('products', { products: data.products });
});


app.post('/add-product', (req, res) => {
    const data = readData();
    data.products.push({
        id: Date.now(),
        name: req.body.name,
        brand: req.body.brand,
        price: req.body.price,
        quantity: req.body.quantity
    });
    writeData(data);
    res.redirect('/products');
});

// ✅ DELETE PRODUCT (FIXED)
app.get('/delete-product/:id', (req, res) => {
    const data = readData();
    const id = Number(req.params.id);

    data.products = data.products.filter(
        p => Number(p.id) !== id
    );

    writeData(data);
    res.redirect('/products');
});


// ================= CUSTOMERS =================
app.get('/customers', isAuthenticated, (req, res) => {
    const data = readData();
    res.render('customers', { customers: data.customers });
});

app.post('/add-customer', (req, res) => {
    const data = readData();
    data.customers.push({
        id: Date.now(),
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email
    });
    writeData(data);
    res.redirect('/customers');
});

// ✅ DELETE CUSTOMER (IMPROVED)
app.get('/delete-customer/:id', (req, res) => {
    const data = readData();
    const id = Number(req.params.id);

    data.customers = data.customers.filter(
        c => Number(c.id) !== id
    );

    writeData(data);
    res.redirect('/customers');
});


// ================= SERVICES =================
app.get('/services', isAuthenticated, (req, res) => {
    const data = readData();
    res.render('services', { services: data.services });
});

app.post('/add-service', (req, res) => {
    const data = readData();
    data.services.push({
        id: Date.now(),
        customer: req.body.customer,
        issue: req.body.issue,
        status: req.body.status,
        charges: req.body.charges
    });
    writeData(data);
    res.redirect('/services');
});

// ✅ DELETE SERVICE
app.get('/delete-service/:id', (req, res) => {
    const data = readData();
    const id = Number(req.params.id);

    data.services = data.services.filter(
        s => Number(s.id) !== id
    );

    writeData(data);
    res.redirect('/services');
});

// ================= SELL PRODUCT =================
app.post('/sell-product', (req, res) => {
    const data = readData();

    if (!data.sales) data.sales = [];
    if (!data.products) data.products = [];

    const productId = Number(req.body.id);
    const qty = Number(req.body.quantity);

    const product = data.products.find(
        p => Number(p.id) === productId
    );

    if (!product || product.quantity < qty) {
        return res.send("Insufficient Stock");
    }

    product.quantity -= qty;

    const sale = {
        id: Date.now(),
        product: product.name,
        quantity: qty,
        price: Number(product.price),
        total: qty * Number(product.price),
        date: new Date().toLocaleString()
    };

    data.sales.push(sale);
    writeData(data);

    res.redirect('/invoice/' + sale.id);  // ✅ FIXED
});


// ================= SINGLE INVOICE =================
app.get('/invoice/:id', isAuthenticated, (req, res) => {
    const data = readData();
    const sale = data.sales.find(
        s => Number(s.id) === Number(req.params.id)
    );
    if (!sale) return res.send("Invoice not found");
    res.render('invoice', { sale });
});


// ================= ALL INVOICES =================
app.get('/invoices', isAuthenticated, (req, res) => {
    const data = readData();
    if (!data.sales) data.sales = [];
    const sortedSales = data.sales.sort((a, b) => b.id - a.id);
    res.render('invoices', { sales: sortedSales });
});

// ================= DELETE INVOICE =================
app.get('/delete-invoice/:id', (req, res) => {
    const data = readData();
    const id = Number(req.params.id);

    data.sales = data.sales.filter(s => Number(s.id) !== id);

    writeData(data);
    res.redirect('/invoices');
});

// ================= EXPORT INVOICES =================
app.get('/export-invoices', (req, res) => {
    const data = readData();
    const sales = data.sales || [];

    let csv = "ID,Date,Product,Quantity,Total\n";

    sales.forEach(s => {
        csv += `${s.id},${s.date},${s.product},${s.quantity},${s.total}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment("invoices.csv");
    res.send(csv);
});

// ================= WELCOME PAGE =================
app.get('/welcome', (req, res) => {
    res.render('welcome');
});

// ================= LOGIN PAGE =================
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

// ================= LOGIN POST =================
app.post('/login', (req, res) => {

    const { username, password } = req.body;

    if (username === "Pankaj" && password === "pankaj") {

        const data = readData();

        if (!data.loginStats) {
            data.loginStats = {
                total: 0,
                today: 0,
                lastLoginDate: ""
            };
        }

        const todayDate = new Date().toLocaleDateString();

        // If new day → reset today's counter
        if (data.loginStats.lastLoginDate !== todayDate) {
            data.loginStats.today = 0;
            data.loginStats.lastLoginDate = todayDate;
        }

        data.loginStats.total += 1;
        data.loginStats.today += 1;

        writeData(data);

        req.session.user = username;
        res.redirect('/dashboard');

    } else {
        res.send("Invalid Credentials");
    }
});

// ================= LOGOUT =================
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.render('welcome', { logoutMsg: true });
    });
});

// ================= AUTH MIDDLEWARE =================
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Protect Dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {

    const data = readData();

    let totalLogins = 0;
    let todayLogins = 0;

    if (data.loginStats) {
        totalLogins = data.loginStats.total || 0;
        todayLogins = data.loginStats.today || 0;
    }

    res.render('dashboard', {
        totalLogins,
        todayLogins
    });
});

// ================= CONTACT PAGE =================
app.get('/contact', isAuthenticated, (req, res) => {
    res.render('contact');
});

app.post('/send-message', async (req, res) => {

    const data = readData();

    if (!data.messages) data.messages = [];

    const message = {
        id: Date.now(),
        name: req.body.name,
        email: req.body.email,
        message: req.body.message,
        date: new Date().toLocaleString()
    };

    data.messages.push(message);
    writeData(data);

    // ===== SEND EMAIL =====
    const mailOptions = {
        from: 'pp2391346@gmail.com',
        to: req.body.email,   // Sends to user
        subject: 'Thank You for Contacting Computer System',
        html: `
            <h2>Hello ${req.body.name},</h2>
            <p>Thank you for contacting us.</p>
            <p><strong>Your Message:</strong></p>
            <p>${req.body.message}</p>
            <br>
            <p>We will contact you soon.</p>
            <hr>
            <p>Computer Management System</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Email Sent Successfully 📧");
    } catch (error) {
        console.log("Email Error:", error);
    }

    res.render('contact', { success: true });
});

// ================= BOOK APPOINTMENT PAGE =================
app.get('/book-service', isAuthenticated, (req, res) => {
    res.render('book-service');
});

// ================= SAVE APPOINTMENT =================
app.post('/book-service', async (req, res) => {

    const data = readData();
    if (!data.appointments) data.appointments = [];

    const appointment = {
        id: Date.now(),
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        service: req.body.service,
        date: req.body.date,
        time: req.body.time,
        createdAt: new Date().toLocaleString()
    };

    data.appointments.push(appointment);
    writeData(data);

    // 📧 Confirmation Email
    const mailOptions = {
        from: 'pp2391346@gmail.com',
        to: req.body.email,
        subject: 'Service Appointment Confirmation',
        html: `
            <h2>Hello ${req.body.name},</h2>
            <p>Your service appointment has been booked successfully.</p>
            <hr>
            <p><strong>Service:</strong> ${req.body.service}</p>
            <p><strong>Date:</strong> ${req.body.date}</p>
            <p><strong>Time:</strong> ${req.body.time}</p>
            <br>
            <p>Thank you for choosing us!</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Appointment Email Sent 📧");
    } catch (error) {
        console.log("Email Error:", error);
    }

    res.render('book-service', { success: true });
});

// ================= VIEW APPOINTMENTS =================
app.get('/appointments', isAuthenticated, (req, res) => {
    const data = readData();
    res.render('appointments', { 
        appointments: data.appointments || [] 
    });
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} 🚀`);
});