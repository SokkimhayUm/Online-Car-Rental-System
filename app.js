const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '.';

// Middleware to serve static files and parse JSON
app.use(express.static('public'));
app.use(express.json());

// Initialize data files in the persistent volume
async function initializeDataFiles() {
  const carsFile = path.join(DATA_DIR, 'cars.json');
  const ordersFile = path.join(DATA_DIR, 'orders.json');
  const initialCarsPath = path.join(__dirname, 'data', 'initial_cars.json');

  // Copy initial cars data if it doesn't exist
  if (!(await fs.access(carsFile).then(() => true).catch(() => false))) {
    const initialCars = await fs.readFile(initialCarsPath, 'utf8');
    await fs.writeFile(carsFile, initialCars);
  }

  // Create empty orders file if it doesn't exist
  if (!(await fs.access(ordersFile).then(() => true).catch(() => false))) {
    await fs.writeFile(ordersFile, JSON.stringify({ orders: [] }, null, 2));
  }
}

// Example route: Get all cars
app.get('/api/cars', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, 'cars.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Example route: Add an order
app.post('/api/orders', async (req, res) => {
  try {
    const ordersFile = path.join(DATA_DIR, 'orders.json');
    const data = await fs.readFile(ordersFile, 'utf8');
    const ordersObj = JSON.parse(data);
    ordersObj.orders.push(req.body);
    await fs.writeFile(ordersFile, JSON.stringify(ordersObj, null, 2));
    res.status(201).send('Order added');
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Start server after initializing files
initializeDataFiles()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize files:', err);
  });