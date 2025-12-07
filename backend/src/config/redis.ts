import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err: Error) => console.log('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected');
    } catch (e) {
        console.error('Failed to connect to Redis', e);
    }
})();

export default redisClient;
