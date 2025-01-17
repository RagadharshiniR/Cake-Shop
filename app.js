// Importing dependencies
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');  // Import S3 client v3
const { Upload } = require('@aws-sdk/lib-storage');  // For handling multipart upload
const multer = require('multer');
const multerS3 = require('multer-s3');
const cors = require('cors');

// Initializing app
const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authentication'],
}));

// MySQL Database Connection (Update for RDS)
const db = mysql.createConnection({
  host: 'cake-shop-1-rds.c18wgo0yaf1k.eu-north-1.rds.amazonaws.com', // Replace with your RDS endpoint
  user: 'admin',               // Replace with your RDS username
  password: 'Raga1234Raga',    // Replace with your RDS password
  database: 'cake-shop-rds',   // Replace with your RDS database name
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to RDS MySQL');
  }
});

// AWS S3 Configuration (Using SDK v3)
const s3Client = new S3Client({
  region: 'eu-north-1',                           // Replace with your AWS Region
  credentials: {
    accessKeyId: 'AKIA4ZPZVIUY642H7R7H',        // Replace with your AWS Access Key
    secretAccessKey: 'iZx7VZk+l5wsGfBsYe3nWVDfeAQ8HWZOsehbS3sw', // Replace with your AWS Secret Access Key
  }
});

// Set up Multer storage with S3 integration
const upload = multer({
  storage: multerS3({
    s3: s3Client,                               // Use v3 S3 client here
    bucket: 'cake-shop-images-s3',              // Replace with your S3 bucket name
    key: function (req, file, cb) {
      cb(null, `uploads/${Date.now()}_${file.originalname}`); // Define file path in the S3 bucket
    }
  })
});

// Route: Home route (root path)
app.get('/', (req, res) => {
  res.send('Welcome to the Cake Shop!');
});

// USERS API

// Create user
app.post('/user', (req, res) => {
  const { name, email, password } = req.body;
  const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.query(query, [name, email, password], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to create user' });
    } else {
      res.status(200).json({ message: 'User created successfully', id: result.insertId });
    }
  });
});

// Update user
app.put('/user/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;
  const query = 'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?';
  db.query(query, [name, email, password, id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to update user' });
    } else {
      res.status(200).json({ message: 'User updated successfully' });
    }
  });
});

// Delete user
app.delete('/user/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM users WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    } else {
      res.status(200).json({ message: 'User deleted successfully' });
    }
  });
});

// Get all users
app.get('/user', (req, res) => {
  const query = 'SELECT * FROM users';
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to get users' });
    } else {
      res.status(200).json(result);
    }
  });
});

// PRODUCTS API

// Create product
app.post('/product', upload.single('image'), (req, res) => {
  const { name, price, description } = req.body;
  const imageUrl = req.file ? req.file.location : null;

  const query = 'INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)';
  db.query(query, [name, price, description, imageUrl], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to create product' });
    } else {
      res.status(200).json({ message: 'Product created successfully', id: result.insertId });
    }
  });
});

// Update product
app.put('/product/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body;
  const imageUrl = req.file ? req.file.location : null;

  const query = 'UPDATE products SET name = ?, price = ?, description = ?, image_url = ? WHERE id = ?';
  db.query(query, [name, price, description, imageUrl, id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to update product' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  });
});

// Delete product
app.delete('/product/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM products WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to delete product' });
    } else {
      res.status(200).json({ message: 'Product deleted successfully' });
    }
  });
});

// Get all products
app.get('/product', (req, res) => {
  const query = 'SELECT * FROM products';
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to get products' });
    } else {
      res.status(200).json(result);
    }
  });
});

// ORDERS API

// Post order
app.post('/order', (req, res) => {
  const { userId, productId, quantity, status } = req.body;
  const query = 'INSERT INTO orders (user_id, product_id, quantity, status) VALUES (?, ?, ?, ?)';
  db.query(query, [userId, productId, quantity, status], (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Failed to create order' });
    } else {
      res.status(200).json({ message: 'Order created successfully', id: result.insertId });
    }
  });
});

// Update order
app.put('/order/:id', (req, res) => {
  const { id } = req.params;
  const { userId, productId, quantity, status } = req.body;
  const query = 'UPDATE orders SET user_id = ?, product_id = ?, quantity = ?, status = ? WHERE id = ?';
  db.query(query, [userId, productId, quantity, status, id], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to update order' });
    } else {
      res.status(200).json({ message: 'Order updated successfully' });
    }
  });
});

// Get all orders
app.get('/order', (req, res) => {
  const query = 'SELECT * FROM orders';
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Failed to get orders' });
    } else {
      res.status(200).json(result);
    }
  });
});

// File upload route to S3
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    res.status(200).json({
      message: 'File uploaded successfully',
      fileUrl: req.file.location // This is the URL of the uploaded file on S3
    });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
