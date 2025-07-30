# Dockerized k6 API Testing Suite

![k6, InfluxDB, Grafana](https://i.imgur.com/5X6z9Ql.png)

Готовое решение для нагрузочного тестирования API с использованием k6, InfluxDB и Grafana в Docker-контейнерах.

## Особенности

- 🚀 Запуск нагрузочных тестов через k6
- 📊 Хранение результатов в InfluxDB
- 📈 Визуализация метрик в Grafana
- ⚙️ Централизованное хранение конфигураций
- 🐳 Полностью контейнеризированное решение

## Требования

- Docker Engine (v20.10.0+)
- Docker Compose (v2.0.0+)

## Структура проекта
├── configs/ # Конфигурационные файлы для тестов \
├── tests/ # Скрипты нагрузочного тестирования k6 \
│ └── sample-test.js # Пример тестового скрипта \
├── docker-compose.yml # Конфигурация Docker-среды \
└── README.md # Документация

## Быстрый старт

1. Поместите ваши тестовые скрипты в папку tests/
2. Добавьте конфигурации в configs/, если нужно
3. Запустите инфраструктуру
```bash
docker-compose up -d influxdb grafana
```
4. Запуск тестов
```bash
docker-compose run --rm k6 run /tests/sample-test.js
```
Где sample-test.js - ваш тестовый скрипт, расположенный в директории tests/

## Просмотр результатов
### В терминале
Результаты выполнения теста отображаются непосредственно в терминале.
### В Grafana
- Откройте в браузере: http://localhost:3000
- Авторизация:\
Логин: admin \
Пароль: admin
- Настройте источник данных:
- Тип: InfluxDB
- URL: http://influxdb:8086
- Database: k6
-Импортируйте дашборды для визуализации результатов

## Пример тестового скрипта (tests/sample-test.js)
```javascript
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
```
## Пример конфигурации тестового скрипта (configs/sample-conf.js)
```javascript
export const config = {
    URL: 'http://localhost/api/v1/blog',
    USER: 'user',
    PASSWORD: 'password'
}
```