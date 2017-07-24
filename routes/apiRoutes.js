'use strict';
module.exports = function(app) {

  var api = require('../controllers/apiController');

  app.route('/')
    .get(api.home);
    
  app.route('/sketch')
    .post(api.generate_sketch);

  app.route('/model')
    .post(api.generate_image_from_model);
};
