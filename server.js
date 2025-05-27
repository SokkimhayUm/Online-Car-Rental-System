const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

app.get('/cars', async (req, res) => {
    const carsFilePath = path.join(__dirname, 'public', 'cars.json');
    try {
        if (!(await fileExists(carsFilePath))) {
            console.error('Cars file not found:', carsFilePath);
            return res.status(404).json({ error: 'Cars data file not found' });
        }
        const data = await fs.readFile(carsFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Error reading cars data:', err.message);
        res.status(500).json({ error: 'Failed to read cars data' });
    }
});

app.post('/orders', async (req, res) => {
    const ordersFilePath = path.join(__dirname, 'public', 'orders.json');
    const carsFilePath = path.join(__dirname, 'public', 'cars.json');
    try {
        const order = req.body;
        if (!order.car?.vin || !order.customer || !order.rental) {
            return res.status(400).json({ success: false, error: 'Invalid order data' });
        }

        if (!(await fileExists(carsFilePath))) {
            console.error('Cars file not found:', carsFilePath);
            return res.status(404).json({ success: false, error: 'Cars data not found' });
        }

        const carsData = JSON.parse(await fs.readFile(carsFilePath, 'utf8'));
        const car = carsData.cars.find(c => c.vin === order.car.vin);
        if (!car || !car.available) {
            console.log(`Car unavailable or not found: VIN ${order.car.vin}`);
            return res.status(400).json({ success: false, error: 'Car is unavailable or not found' });
        }

        if (!(await fileExists(ordersFilePath))) {
            console.error('Orders file not found:', ordersFilePath);
            return res.status(404).json({ success: false, error: 'Orders data not found' });
        }

        const ordersData = JSON.parse(await fs.readFile(ordersFilePath, 'utf8'));
        const orderId = ordersData.orders.length + 1;
        ordersData.orders.push({ ...order, orderId, status: 'pending' });

        await fs.writeFile(ordersFilePath, JSON.stringify(ordersData, null, 2), 'utf8');
        console.log(`Order created: ID ${orderId}`);

        res.json({ success: true, orderId });
    } catch (err) {
        console.error('Error processing order:', err.message);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

app.post('/confirm-order', async (req, res) => {
    const ordersFilePath = path.join(__dirname, 'public', 'orders.json');
    const carsFilePath = path.join(__dirname, 'public', 'cars.json');
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ success: false, error: 'Order ID is required' });
        }

        if (!(await fileExists(ordersFilePath))) {
            console.error('Orders file not found:', ordersFilePath);
            return res.status(404).json({ success: false, error: 'Orders data not found' });
        }

        const ordersData = JSON.parse(await fs.readFile(ordersFilePath, 'utf8'));
        const order = ordersData.orders.find(o => o.orderId == orderId);
        if (!order || order.status !== 'pending') {
            console.log(`Invalid or non-pending order: ID ${orderId}`);
            return res.status(400).json({ success: false, error: 'Order not found or already processed' });
        }

        order.status = 'confirmed';

        if (!(await fileExists(carsFilePath))) {
            console.error('Cars file not found:', carsFilePath);
            return res.status(404).json({ success: false, error: 'Cars data not found' });
        }

        const carsData = JSON.parse(await fs.readFile(carsFilePath, 'utf8'));
        const car = carsData.cars.find(c => c.vin === order.car.vin);
        if (car) {
            car.available = false;
        } else {
            console.warn(`Car not found for order: VIN ${order.car.vin}`);
        }

        await fs.writeFile(ordersFilePath, JSON.stringify(ordersData, null, 2), 'utf8');
        await fs.writeFile(carsFilePath, JSON.stringify(carsData, null, 2), 'utf8');
        console.log(`Order confirmed: ID ${orderId}`);

        res.json({ success: true });
    } catch (err) {
        console.error('Error confirming order:', err.message);
        res.status(500).json({ error: 'Failed to confirm order' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});