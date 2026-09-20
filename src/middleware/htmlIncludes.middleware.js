const fs = require('fs');
const path = require('path');

const PARTIAL_PATTERN = /<!--\s*#include\s+(\w+)\s*-->/g;

const loadPartial = (partialsDir, name) =>
  fs.readFileSync(path.join(partialsDir, `${name}.html`), 'utf8');

const htmlIncludes = (homeDir) => {
  const partialsDir = path.join(homeDir, 'partials');
  const partials = {
    header: loadPartial(partialsDir, 'header'),
    footer: loadPartial(partialsDir, 'footer'),
    services: loadPartial(partialsDir, 'services'),
  };

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
        Object.prototype.hasOwnProperty.call(partials, name) ? partials[name] : match
      );

      res.type('html').send(rendered);
    });
  };
};

module.exports = { htmlIncludes };
