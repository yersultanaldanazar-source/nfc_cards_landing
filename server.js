import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiSend from './api/send.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Раздаем статику
app.use(express.static(__dirname));

// Направляем запросы /api/send в наш обработчик для Vercel
app.post('/api/send', async (req, res) => {
    // Вызываем оригинальную логику из api/send.js
    await apiSend(req, res);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Локальный сервер запущен!`);
    console.log(`Открой в браузере: http://localhost:${PORT}/?id=coffee_boom`);
    console.log(`Для остановки сервера нажми Ctrl+C\n`);
});
