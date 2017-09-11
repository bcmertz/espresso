var http = require('http');
var qs = require('querystring');
var hbs = require('handlebars')
var fs = require('fs');
//middleware is hoisted above get and post requests, srry not srry bout it
module.exports = function () {
  var routes = {get: [], post: [], use: []};

  var middleware = function(pathUrl, req, res) {
    var splitUrl = pathUrl.split('/').slice(1);
    var route = routes.use.reduce((accumulator, route) => {
      var routeArr = route.route;
      //check that all routeArr indices are in splitUrl [1] [1.2.3] good [1.2] [1] bad
      //take the first one declared that works
      var check = true;
      routeArr.forEach((index) => {
        var urlIndex = splitUrl.indexOf(index);

        if(routeArr[urlIndex] !== splitUrl[urlIndex] || urlIndex === -1) {
          check = false; //doesn't contain same order of same things or doesn't have item
        }
      });
      if (check) {
        //in case accumulator is empty and our check worked
        if (!accumulator.hasOwnProperty('route')) {
          return route
        } else {
          return accumulator
        }
      } else {
        return accumulator
      }

    }, {});

    //execute user written route code or say it doesn't exist
    if(route.hasOwnProperty('route')) {
      route.callback(req, res);
    } else {
      console.log('no middleware');
    }
  }

  var handleRequest = function(req, res){
    //BUILT IN FUNCTIONS USERS CAN SEE
    res.send = function (body) {
      this.writeHead(200, { 'Content-Type': 'text/plain' });
      this.end(body);
    }
    res.notFound = function(){
      res.writeHead(404);
      res.end();
    }
    res.json = function(obj) {
      this.writeHead(200, { 'Content-Type': 'text/plain' });
      this.end(JSON.stringify(obj));
    }
    res.render = function(file, obj){
      this.writeHead(200, { 'Content-Type': 'text/html' });
      //convert file: const body = file->html string
      fs.readFile(file, (err, data) => {
        if (err) throw err;
        const body = hbs.compile(data.toString());
        var result = body(obj);
        this.end(result);
      });
    }

    // HANDLE PARSING OF URL AND QUERIES
    var pathUrl = req.url;
    var queryUrl
    const qmarkIndex = pathUrl.indexOf('?');
    if(qmarkIndex !== -1) {
      //query string update url to handle
      pathUrl = pathUrl.slice(0, qmarkIndex);
      queryUrl = req.url.slice(qmarkIndex+1);
      req.query = qs.parse(queryUrl);
    }


    //ROUTE METHODS
    if(req.method === 'GET') {
      middleware(pathUrl, req, res);
      var route = routes.get.find((item) => {
        return (item.route === pathUrl);
      });
      //execute user written route code or say it doesn't exist
      if(route) {
        console.log('route', route.route);
        route.callback(req, res);
      } else {
        res.notFound()
      }

    } else if (req.method === 'POST') {
      var body = '';
      req.on('readable', function() {
          var chunk = req.read();
          if (chunk) body += chunk;
      });
      req.on('end', function() {
        // queryString is the querystring node built-in
        req.body = qs.parse(body);
        var route = routes.post.find((item) => {
          return (item.route === pathUrl);
        });
        middleware(pathUrl, req, res);
        if(route) {
          route.callback(req, res);
        } else {
          res.notFound()
        }
      });
    }
  }

  var app = function (req, res) {
    handleRequest(req, res);
  }

  app.get = function(route, callback) { //add all get routes to possible routes we can handle
    routes.get.push({
      route,
      callback
    })
  },
  app.post = function(route, callback) { //add all post routes
    routes.post.push({
      route,
      callback
    })
  },
  app.use = function(routePrefix, givenCallback) { //middleware functions declared
    var route = '';
    var callback = givenCallback;
    if(typeof routePrefix !== 'function') {
      route = routePrefix;
    } else {
      callback = routePrefix;
    }
    route = route.split('/').slice(1);
    routes.use.push({
      route,
      callback
    })
  },

  app.listen = function(port) {
    const server = http.createServer(this); //use function app (this) to handle requests to our server
    return server.listen(port);
  }

  return app;  //expose functionality to user
};
