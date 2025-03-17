const express = require('express');
const sharp = require('sharp');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');
const app = express();
const port = 3000;

app.use(express.json());

app.use((req, res, next) => {
    console.log(`Получен запрос: ${req.method} ${req.url} от ${req.headers.origin || 'неизвестного источника'}`);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        console.log('Отправляем ответ на OPTIONS с заголовками:', res.getHeaders());
        return res.status(200).end();
    }
    next();
});

const upload = multer({ storage: multer.memoryStorage() });
const EDEN_AI_API_URL = 'https://api.edenai.run/v2/ocr/ocr';
const EDEN_AI_API_KEY = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYzhiMjFlN2QtMDllZS00MDlkLThjNWUtNmVhODUzZmZjZTIyIiwidHlwZSI6ImFwaV90b2tlbiJ9.fJwi4jDh9TXqC1WHmIk_EdjNzbVIgJvXkT08DOfPhAs';

async function compressImage(buffer) {
    try {
        let quality = 80;
        let outputBuffer = await sharp(buffer)
            .jpeg({ quality })
            .toBuffer();

        while (outputBuffer.length > 999999 && quality > 10) {
            quality -= 10;
            outputBuffer = await sharp(buffer)
                .jpeg({ quality })
                .toBuffer();
            console.log(`Сжатие: качество ${quality}, размер ${outputBuffer.length} байт`);
        }
        return outputBuffer;
    } catch (error) {
        console.error('Ошибка сжатия изображения:', error.message);
        throw error;
    }
}

function extractCoordinates(data) {
    console.log('Извлечение координат на сервере:', data);

    let lat = null, lon = null;

    if (typeof data === 'string') {
        const simpleMatch = data.match(/([+-]?\d+\.\d+)\s*,\s*([+-]?\d+\.\d+)/);
        if (simpleMatch) {
            lat = parseFloat(simpleMatch[1]);
            lon = parseFloat(simpleMatch[2]);
            console.log('Координаты из строки (простой формат):', { lat, lon });
            return { lat, lon };
        }

        const latMatch = data.match(/(?:Широта|Latitude)[:\s]+([+-]?\d+\.\d+)/i);
        const lonMatch = data.match(/(?:Долгота|Longitude)[:\s]+([+-]?\d+\.\d+)/i);
        if (latMatch && lonMatch) {
            lat = parseFloat(latMatch[1]);
            lon = parseFloat(lonMatch[1]);
            console.log('Координаты из строки (Широта/Долгота):', { lat, lon });
            return { lat, lon };
        }

        const dmsMatch = data.match(/(\d+)[°\s]+(\d+)'[\s]*(\d+\.?\d*)"?\s*([NS])\s*(\d+)[°\s]+(\d+)'[\s]*(\d+\.?\d*)"?\s*([EW])/i);
        if (dmsMatch) {
            lat = convertDMSToDD([parseInt(dmsMatch[1]), parseInt(dmsMatch[2]), parseFloat(dmsMatch[3])], dmsMatch[4]);
            lon = convertDMSToDD([parseInt(dmsMatch[5]), parseInt(dmsMatch[6]), parseFloat(dmsMatch[7])], dmsMatch[8]);
            console.log('Координаты из DMS:', { lat, lon });
            return { lat, lon };
        }
    }

    if (typeof data === 'object' && data.google && data.google.text) {
        const coords = extractCoordinates(data.google.text);
        if (coords) {
            console.log('Координаты из объекта google.text:', coords);
            return coords;
        }
    }

    console.log('Координаты не найдены в данных');
    return null;
}

function convertDMSToDD(dms, ref) {
    const degrees = dms[0];
    const minutes = dms[1];
    const seconds = dms[2];
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (ref === 'S' || ref === 'W') dd = -dd;
    return dd;
}

async function processImageWithEdenAI(buffer) {
    const edenForm = new FormData();
    edenForm.append('file', buffer, { filename: 'photo.jpg' });
    edenForm.append('providers', 'google');
    edenForm.append('language', 'ru');

    try {
        console.log('Сервер: отправка на Eden AI');
        const response = await fetch(EDEN_AI_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': EDEN_AI_API_KEY,
                'Accept': 'application/json',
                ...edenForm.getHeaders()
            },
            body: edenForm,
            timeout: 30000
        });
        const text = await response.text();
        console.log('Сервер: ответ Eden AI:', text);

        if (!response.ok) {
            console.warn(`Сервер: ошибка Eden AI: ${response.status} - ${text}`);
            return { lat: null, lon: null };
        }

        const result = JSON.parse(text);
        const coords = extractCoordinates(result);
        if (coords) {
            console.log('Сервер: возвращаемые координаты:', coords);
            return coords;
        } else {
            console.log('Сервер: координаты не найдены в ответе Eden AI');
            return { lat: null, lon: null };
        }
    } catch (error) {
        console.error('Сервер: ошибка Eden AI:', error.message);
        return { lat: null, lon: null };
    }
}

app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) throw new Error('Файлы не загружены');
        console.log(`Сервер: получено ${req.files.length} файлов`);

        const finalResults = [];

        // Обрабатываем файлы последовательно
        for (const file of req.files) {
            let fileBuffer = file.buffer;
            console.log(`Сервер: обработка файла (${file.originalname}), размер: ${file.size} байт`);
            if (file.size > 999999) {
                fileBuffer = await compressImage(fileBuffer);
                console.log(`Сервер: сжатый размер файла (${file.originalname}): ${fileBuffer.length} байт`);
            }

            const coords = await processImageWithEdenAI(fileBuffer);
            finalResults.push({ name: file.originalname, lat: coords.lat, lon: coords.lon });
        }

        console.log('Сервер: результаты обработки всех файлов:', finalResults);
        res.json(finalResults);
    } catch (error) {
        console.error('Сервер: ошибка /upload:', error.message);
        res.status(500).json({ error: 'Ошибка обработки файлов', details: error.message });
    }
});

app.post('/upload-url', async (req, res) => {
    const { url } = req.body;
    try {
        if (!url) throw new Error('URL не указан');
        console.log(`Сервер: загрузка изображения с ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Не удалось загрузить: ${response.status}`);
        let fileBuffer = await response.buffer();
        console.log(`Сервер: получен файл с URL, размер: ${fileBuffer.length} байт`);
        if (fileBuffer.length > 999999) {
            fileBuffer = await compressImage(fileBuffer);
            console.log(`Сервер: сжатый размер: ${fileBuffer.length} байт`);
        }
        const coords = await processImageWithEdenAI(fileBuffer);
        console.log('Сервер: результат обработки URL:', coords);

        res.json({ name: url, lat: coords.lat, lon: coords.lon });
    } catch (error) {
        console.error('Сервер: ошибка /upload-url:', error.message);
        res.status(500).json({ error: 'Ошибка обработки URL', details: error.message });
    }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});