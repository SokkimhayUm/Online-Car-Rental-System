const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/cars', async (req, res) => {
    try {
        const data = await fs.readFile(path.join(__dirname, 'public', 'cars.json'));
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).send('Error reading cars data');
    }
});

app.post('/orders', async (req, res) => {
    try {
        const order = req.body;
        const carsData = JSON.parse(await fs.readFile(path.join(__dirname, 'public', 'cars.json')));
        const car = carsData.cars.find(c => c.vin === order.car.vin);

        if (!car || !car.available) {
            return res.json({ success: false });
        }

        const ordersData = JSON.parse(await fs.readFile(path.join(__dirname, 'public', 'orders.json')));
        const orderId = ordersData.orders.length + 1;
        ordersData.orders.push({ ...order, orderId, status: 'pending' });

        await fs.writeFile(
            path.join(__dirname, 'public', 'orders.json'),
            JSON.stringify(ordersData, null, 2)
        );

        res.json({ success: true, orderId });
    } catch (err) {
        res.status(500).send('Error processing order');
    }
});

app.post('/confirm-order', async (req, res) => {
    try {
        const { orderId } = req.body;
        const ordersData = JSON.parse(await fs.readFile(path.join(__dirname, 'public', 'orders.json')));
        const order = ordersData.orders.find(o => o.orderId == orderId);

        if (!order || order.status !== 'pending') {
            return res.json({ success: false });
        }

        order.status = 'confirmed';
        const carsData = JSON.parse(await fs.readFile(path.join(__dirname, 'public', 'cars.json')));
        const car = carsData.cars.find(c => c.vin === order.car.vin);
        if (car) {
            car.available = false;
        }

        await fs.writeFile(
            path.join(__dirname, 'public', 'orders.json'),
            JSON.stringify(ordersData, null, 2)
        );
        await fs.writeFile(
            path.join(__dirname, 'public', 'cars.json'),
            JSON.stringify(carsData, null, 2)
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).send('Error confirming order');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});