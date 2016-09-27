'use strict';

const Hapi = require('hapi');
const redis = require('redis');

const config = require('./config');

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({ 
  host: config.hapi.host, 
  port: config.hapi.port
});

// Add the route
server.route({
  method: 'GET',
  path: '/api/data',
  config: {cors: true},
  handler: function (request, reply) {

    var timestamp = request.query.timestamp;

    var redis_conn = redis.createClient({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db
    });

    redis_conn.on('connect', function() {
      console.log('connected');
    });

    redis_conn.get('monney-data', function(err, response) {
      var data = JSON.parse(response);

      if (!timestamp || (data.timestamp != timestamp)) {
        reply(data);
      } else {
        var error = {
          error: {
            code: 304,
            message: "Not Modified",
            description: ""
          }
        }

        reply(error);
      }
    });
  }
});

// Start the server
server.start((err) => {

  if (err) {
    throw err;
  }
  console.log('Server running at:', server.info.uri);
});