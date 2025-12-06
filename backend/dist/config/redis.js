"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
// [cite: 6] Підключення до контейнера redis за адресою redis://redis:6379 (або localhost для локальної розробки)
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
// [cite: 9] Обробка помилок, щоб сервер не падав
redisClient.on('error', (err) => console.log('Redis Client Error', err));
// [cite: 10] Ініціалізація з'єднання
(async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected');
    }
    catch (e) {
        console.error('Failed to connect to Redis', e);
    }
})();
exports.default = redisClient;
