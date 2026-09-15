const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { htmlIncludes } = require('./middleware/htmlIncludes.middleware');

const app = express();
const bookNowDir = path.join(__dirname, '../public/book-now');
const homeDir = path.join(__dirname, '../public/home');

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(htmlIncludes(homeDir));
app.use(express.static(homeDir));
app.use('/home', htmlIncludes(homeDir));
app.use('/home', express.static(homeDir));

app.get('/book-now', (_req, res) => {
  res.sendFile(path.join(bookNowDir, 'index.html'));
});
app.use('/book-now', express.static(bookNowDir));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
