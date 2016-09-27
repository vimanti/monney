'use strict';

const redis = require('redis');
const request = require('request');
const schedule = require('node-schedule');

 
const config = require('./config.json');
var currencies = require('./data/currencies.json');

var rule = new schedule.RecurrenceRule();
rule.minute = 0;

function loadDataOnSchedule() {

  request({
    url: config.api.url,
    qs: { access_key: config.api.access_key },
    method: 'GET'
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var jsonData = JSON.parse(body);

      var redisData = {
        timestamp: jsonData.timestamp,
        source: jsonData.source,
        currencies: []
      };

      var quotes = jsonData.quotes;

      redisData.currencies = currencies.map(function(currency) {
        currency.quote = quotes[redisData.source + currency.code];
        return currency;
      });

      var redis_conn = redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db
      });

      redis_conn.on('connect', function() {
        console.log('connected');
      });

      redis_conn.set('monney-data', JSON.stringify(redisData));
    }
  });
}

loadDataOnSchedule();
 
schedule.scheduleJob(rule, loadDataOnSchedule);

console.log('The schedule has been initialzed');