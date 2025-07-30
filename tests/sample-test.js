import {check} from 'k6';
import http from 'k6/http';
import {b64encode} from 'k6/encoding';
import {config} from '../configs/sample-conf'

const URL = config.URL;
const USERNAME = config.USER;
const PASSWORD = config.PASSWORD;

export const options = {
    stages: [
        {duration: '30s', target: 50},  /** Плавный рост до 50 VU */
        {duration: '30s', target: 100},  /** Плавный рост до 100 VU */
        {duration: '30s', target: 200},  /** Плавный рост до 200 VU */
        {duration: '30s', target: 400},  /** Плавный рост до 400 VU */
        {duration: '20s', target: 0},   /** Плавное снижение */
        ///{duration: '1m', target: 100},  /** Удержание нагрузки на 100 VU */
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],   /** Допуск <1% ошибок */
    }
};

export default function () {

    const credentials = b64encode(`${USERNAME}:${PASSWORD}`);

    /**
     * Генерация уникального заказа для каждого запроса
     * __VU - ID виртуального пользователя
     * __ITER - номер итерации
     */
    const order = generateOrder(__VU, __ITER);
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
    };

    const res = http.post(URL, JSON.stringify(order), {headers});

    check(res, {
        '200 OK': (r) => r.status === 200,
        '[NETWORK ERROR]': (r) => r.status !== 0,
        '401 Unauthorized': (r) => r.status !== 401,
        '502 Bad Gateway': (r) => r.status !== 502,
        '503 Service Unavailable': (r) => r.status !== 503,
        '504 Gateway Timeout': (r) => r.status !== 504
    });
}

function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${date.getFullYear()} ${hours}:${minutes}:${seconds}`;
}

function generateOrder(vu, iter) {
    /** Уникальный индекс для статьи */
    const index = vu * 100000 + iter;
    const dateCreate = new Date(2025, 7, 1 + (index % 30));

    return {
        title: `Title ${vu}-${iter}-${Date.now()}`,
        description: "Some description ",
        date: formatDateTime(dateCreate),
        author: {
            name: `John ${index}`,
            surname: `Doe ${index}`,
        }
    };
}