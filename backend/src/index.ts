import path from 'path';
import express from 'express';
import apiRoutes from './routes/api';
import connectMongo from './config/mongo';
import './config/redis'; 

const app = express();
const PORT = process.env.PORT || 3000;

connectMongo();

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.json());


app.use('/api', apiRoutes);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
