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

// The Installation / Diagnostic pages became the Non-Emergency Callout pages: keep the old URLs working.
const MOVED_SERVICE_PAGES = {
  '/services/installation': '/services/non-emergency-callout/',
  '/services/commercialinstallation': '/services/CommercialNonEmergencyCallout/',
};
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const match = req.path.match(/^(\/home)?(\/services\/[^/]+?)\/?$/i);
  const target = match && MOVED_SERVICE_PAGES[match[2].toLowerCase()];
  if (!target) return next();
  const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  return res.redirect(301, (match[1] || '') + target + query);
});

app.use(htmlIncludes(homeDir));
app.use(express.static(homeDir));
app.use('/home', htmlIncludes(homeDir));
app.use('/home', express.static(homeDir));

app.use('/book-now', htmlIncludes(bookNowDir, { partialsDir: path.join(homeDir, 'partials') }));
app.get('/book-now', (_req, res) => {
  res.sendFile(path.join(bookNowDir, 'index.html'));
});
app.use('/book-now', express.static(bookNowDir));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
