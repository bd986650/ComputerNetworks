const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Мое приложение работает! Подключение к БД: ' + 
          process.env.DB_HOST || 'не настроено');
});

app.listen(port, () => {
  console.log(`Приложение запущено на порту ${port}`);
});
