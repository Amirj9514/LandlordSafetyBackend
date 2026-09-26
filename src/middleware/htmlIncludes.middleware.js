const fs = require('fs');
const path = require('path');

const PARTIAL_PATTERN = /<!--\s*#include\s+(\w+)\s*-->/g;

const PARTIAL_NAMES = ['header', 'footer', 'services'];

const htmlIncludes = (homeDir) => {
  const partialsDir = path.join(homeDir, 'partials');
  const cache = {};

  // Re-reads a partial only when its file changes, so edits show without a restart.
  const getPartial = (name) => {
    const file = path.join(partialsDir, `${name}.html`);
    const { mtimeMs } = fs.statSync(file);
    const cached = cache[name];
    if (!cached || cached.mtimeMs !== mtimeMs) {
      cache[name] = { mtimeMs, html: fs.readFileSync(file, 'utf8') };
    }
    return cache[name].html;
  };

  PARTIAL_NAMES.forEach(getPartial);

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    let relativePath = req.path.endsWith('/') ? `${req.path}index.html` : req.path;
    if (!relativePath.endsWith('.html')) return next();

    const filePath = path.join(homeDir, relativePath);
    if (!filePath.startsWith(homeDir)) return next();
    if (filePath.startsWith(partialsDir)) return res.status(404).end();

    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) return next();

      const rendered = html.replace(PARTIAL_PATTERN, (match, name) =>
        PARTIAL_NAMES.includes(name) ? getPartial(name) : match
      );

      res.type('html').send(rendered);
    });
  };
};

module.exports = { htmlIncludes };
