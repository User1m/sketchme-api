//var express = require('express'),
//  app = express(),
//  port = process.env.PORT || 3000;

//app.listen(port);

//console.log('todo list RESTful API server started on: ' + port);

var express = require('express'),
  app = express(),
  port = process.env.PORT || 3000,
  bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//app.use(function(req, res) {
//  res.status(404).send({url: req.originalUrl + ' not found'})
//});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// app.use(bodyParser({uploadDir:'./uploads'}));

var routes = require('./routes/apiRoutes');
routes(app);


app.listen(port);

console.log('RESTful API server started on: ' + port);
