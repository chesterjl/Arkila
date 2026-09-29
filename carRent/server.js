require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbConnect = require('./app/config/database');
const { notFound, errorHandler } = require('./app/middleware/errorHandler');

const UserRoutes = require('./app/controllers/UserController');
const IdDocumentRoutes = require('./app/controllers/IdDocumentController');
const CarRoutes = require('./app/controllers/CarController');
const BookingRoutes = require('./app/controllers/BookingController');
const PaymentRoutes = require('./app/controllers/PaymentController');
const AdminRoutes = require('./app/controllers/AdminController');
const ReviewRoutes = require('./app/controllers/ReviewController');

const app = express();

dbConnect()
  .then(() => console.log('Database ready'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

app.use(cors({ 
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/status', (req, res) => res.json({ success: true, message: 'Backend is running' }));

app.use('/users/', UserRoutes);
app.use('/ids/', IdDocumentRoutes);
app.use('/cars/', CarRoutes);
app.use('/bookings/', BookingRoutes);
app.use('/payments/', PaymentRoutes);
app.use('/admin/', AdminRoutes);
app.use('/reviews/', ReviewRoutes);
app.use('/ml', require('./app/controllers/MLController'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});