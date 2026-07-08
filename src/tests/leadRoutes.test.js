const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const leadRoutes = require('../routes/lead.routes');
const apiRoutes = require('../routes');

describe('lead routes', () => {
  it('registers public POST / on the leads router', () => {
    const postLayer = leadRoutes.stack.find(
      (layer) => layer.route?.path === '/' && layer.route.methods.post
    );
    assert.ok(postLayer, 'expected POST / on leads router');
  });

  it('registers admin note routes on the leads router', () => {
    const noteListLayer = leadRoutes.stack.find(
      (layer) => layer.route?.path === '/:id/notes' && layer.route.methods.get
    );
    const noteCreateLayer = leadRoutes.stack.find(
      (layer) => layer.route?.path === '/:id/notes' && layer.route.methods.post
    );
    const noteDeleteLayer = leadRoutes.stack.find(
      (layer) => layer.route?.path === '/:leadId/notes/:noteId' && layer.route.methods.delete
    );
    assert.ok(noteListLayer, 'expected GET /:id/notes');
    assert.ok(noteCreateLayer, 'expected POST /:id/notes');
    assert.ok(noteDeleteLayer, 'expected DELETE /:leadId/notes/:noteId');
  });

  it('mounts /leads on the API router', () => {
    const mounted = apiRoutes.stack.find(
      (layer) => layer.regexp?.test('/leads') && layer.name === 'router'
    );
    assert.ok(mounted, 'expected /leads mount on API router');
  });
});
