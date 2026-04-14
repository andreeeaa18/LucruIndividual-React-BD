require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => { console.error('MongoDB connection error:', err); process.exit(1); });

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
