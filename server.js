const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for AJAX requests
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public/

// Log DATABASE_URL (sanitize password for security)
const dbUrl = process.env.DATABASE_URL;
console.log('Attempting to connect to database with URL:', dbUrl ? dbUrl.replace(/:(.+?)@/, ':****@') : 'undefined');

// PostgreSQL connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false } // Required for Railway
});

// Test database connection with detailed error logging
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => {
    console.error('Database connection error:', err.message);
    console.error('Error stack:', err.stack);
  });

// GET /cars - Retrieve car data
app.get('/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars');
    res.json({ cars: result.rows }); // Match cars.json structure
  } catch (err) {
    console.error('Error fetching cars:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch cars data' });
  }
});

// POST /orders - Create a new order
app.post('/orders', async (req, res) => {
  try {
    // Validate request body
    const order = req.body;
    if (!order.car?.vin || !order.customer || !order.rental) {
      return res.status(400).json({ success: false, error: 'Invalid order data' });
    }

    // Check car availability
    const carResult = await pool.query('SELECT available FROM cars WHERE vin = $1', [order.car.vin]);
    const car = carResult.rows[0];
    if (!car || !car.available) {
      console.log(`Car unavailable or not found: VIN ${order.car.vin}`);
      return res.status(400).json({ success: false, error: 'Car is unavailable or not found' });
    }

    // Insert new order
    const query = `
      INSERT INTO orders (
        customer_name, customer_phone, customer_email, customer_license,
        car_vin, start_date, rental_period, total_price, order_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING order_id
    `;
    const values = [
      order.customer.name,
      order.customer.phoneNumber,
      order.customer.email,
      order.customer.driversLicense,
      order.car.vin,
      order.rental.startDate,
      order.rental.rentalPeriod,
      order.rental.totalPrice,
      order.rental.orderDate,
      'pending'
    ];
    const orderResult = await pool.query(query, values);
    const orderId = orderResult.rows[0].order_id;

    console.log(`Order created: ID ${orderId}`);
    res.json({ success: true, orderId });
  } catch (err) {
    console.error('Error processing order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// POST /confirm-order - Confirm an existing order
app.post('/confirm-order', async (req, res) => {
  try {
    // Validate request body
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    // Check order status
    const orderResult = await pool.query(
      'SELECT status, car_vin FROM orders WHERE order_id = $1',
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order || order.status !== 'pending') {
      console.log(`Invalid or non-pending order: ID ${orderId}`);
      return res.status(400).json({ success: false, error: 'Order not found or already processed' });
    }

    // Update order status and car availability
    await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', ['confirmed', orderId]);
    await pool.query('UPDATE cars SET available = $1 WHERE vin = $2', [false, order.car_vin]);

    console.log(`Order confirmed: ID ${orderId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error confirming order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});