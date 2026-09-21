import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { placeId, stars, text } = req.body;

        if (!placeId || !stars || !text) {
            return res.status(400).json({ error: 'Отсутствуют необходимые параметры' });
        }

        const placesFilePath = path.join(process.cwd(), 'places.json');
        const placesData = fs.readFileSync(placesFilePath, 'utf8');
        const places = JSON.parse(placesData);

        const place = places[placeId];
        if (!place) {
            return res.status(404).json({ error: 'Заведение не найдено' });
        }

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = place.tg_chat_id;

        if (!telegramToken) {
            console.error('TELEGRAM_BOT_TOKEN не задан в переменных окружения');
            return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
        }

        const message = `🚨 <b>Новая жалоба!</b>\n\n` +
                        `🏢 <b>Заведение:</b> ${place.name}\n` +
                        `⭐ <b>Оценка:</b> ${stars}/5\n` +
                        `💬 <b>Комментарий:</b>\n<i>${text}</i>`;

        const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!telegramResponse.ok) {
            const tgError = await telegramResponse.text();
            console.error('Ошибка Telegram API:', tgError);
            return res.status(500).json({ error: 'Не удалось отправить сообщение в Telegram' });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Внутренняя ошибка API:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
