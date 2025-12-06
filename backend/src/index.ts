import path from 'path';
import express from 'express';
import apiRoutes from './routes/api';
import connectMongo from './config/mongo';
// Імпорт redisClient ініціює підключення до Redis [cite: 11]
import './config/redis'; 

const app = express();
const PORT = process.env.PORT || 3000;

// Підключення до MongoDB [cite: 178]
connectMongo();

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.json());

// Підключення всіх маршрутів
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
