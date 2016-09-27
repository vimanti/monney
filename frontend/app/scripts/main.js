/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
(function() {
  'use strict';

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        if (navigator.serviceWorker.controller) {
          // The updatefound event implies that registration.installing is set:
          // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
          var installingWorker = registration.installing;

          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                // At this point, the old content will have been purged and the
                // fresh content will have been added to the cache.
                // It's the perfect time to display a "New content is
                // available; please refresh." message in the page's interface.
                break;

              case 'redundant':
                throw new Error('The installing ' +
                                'service worker became redundant.');

              default:
                // Ignore
            }
          };
        }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }

  // Your custom JavaScript goes here
  // var initialSelectedCurrencies = {
  //   from: {
  //     code: 'USD',
  //     name: 'United States Dollar',
  //     symbol: '&#x24;',
  //     flag: 'images/flags/US.png',
  //     quote: 1
  //   },
  //   to: {
  //     code: 'EUR',
  //     name: 'Euro',
  //     symbol: '&#x20ac;',
  //     flag: 'images/flags/EU.png',
  //     quote: 0.895097
  //   }
  // }

  var app = {
    isLoading: true,
    hasRequestPending: false,
    selectedCurrencies: {from: {}, to: {}, value: 0.0},
    selectedWidget: '',
    converter: document.querySelector('.converter'),
    container: document.querySelector('.container'),
    spinner: document.querySelector('.spinner'),
    currenciesMenu: document.querySelector('.modal')
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.querySelector('#from-widget button')
  .addEventListener('click', function() {
    // Open/show the add new city dialog
    app.selectedWidget = 'from';
    app.toggleCurrenciesMenu(true);
  });

  document.querySelector('#to-widget button')
  .addEventListener('click', function() {
    // Open/show the add new city dialog
    app.selectedWidget = 'to';
    app.toggleCurrenciesMenu(true);
  });

  document.querySelector('#from-widget input')
  .addEventListener('input', function() {
    // Open/show the add new city dialog
    app.updateConverter();
  });

  document.querySelector('.mdl-button')
  .addEventListener('click', function() {
    // Open/show the add new city dialog
    app.swapCurrencies();
  });

  document.getElementById('close-button')
  .addEventListener('click', function() {
    // Open/show the add new city dialog
    app.selectedWidget = '';
    app.toggleCurrenciesMenu(false);
  });

  document.getElementById('modal-background')
  .addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleCurrenciesMenu(false);
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleCurrenciesMenu = function(visible) {
    if (visible) {
      app.currenciesMenu.classList.add('is-active');
    } else {
      app.currenciesMenu.classList.remove('is-active');
    }
  };

  app.updateCurrenciesMenu = function() {
    var listItems = document.querySelectorAll('.modal-body .item');

    if (!(listItems.length > 1)) {
      localforage.getItem('currencies-data').then(function(data) {
        if (data) {
          data = JSON.parse(data);

          var options = {
            item: 'item',
            valueNames: [ 
              'code',
              'name',
              { name: 'flag', attr: 'src' }
            ]
          };
          
          var list = new List('modal', options, data.currencies);
          list.sort('code', { order: 'asc' });


          list.items.forEach(function (item, index) {
            item.elm.addEventListener('click', function () {
              app.selectCurrency(this);
            });
          });
        }
      }).catch(function(err) {

      });
    }
  };

  app.updateConverter = function() {
    var fromInput = document.getElementById('from-widget')
      .querySelector('input');
    var toInput = document.getElementById('to-widget')
      .querySelector('input');

    var amount = accounting.unformat(fromInput.value);
    //console.log(amount);
    var fromQuote = app.selectedCurrencies.from.quote;
    var toQuote = app.selectedCurrencies.to.quote;
    
    var result = (amount / fromQuote) * toQuote;
    if (fromInput.value === '') {
      toInput.value = '';
    } else {
      toInput.value = accounting.formatMoney(result, "", 2);
    }

    app.selectedCurrencies.value = amount;
    app.saveData('selected-currencies', app.selectedCurrencies);    
  };

  app.updateDataTimestamp = function() {
    localforage.getItem('currencies-data').then(function(data) {
      if (data) {
        data = JSON.parse(data);

        var datetime = moment.unix(data.timestamp);

        document.querySelector('p.credits').innerHTML = 
        "Last updated on " + datetime.format('LLL');
      }
    }).catch(function(err) {

    });
  };

  app.swapCurrencies = function() {
    var swap = app.selectedCurrencies.from;
    app.selectedCurrencies.from = app.selectedCurrencies.to;
    app.selectedCurrencies.to = swap;
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.bindModel = function(obj, property, domElem) {
    Object.defineProperty(obj, property, {
      get: function() { return property; }, 
      set: function(newValue) {
        var oldCode = '';
        switch(domElem.id) {
          case 'from-widget':
            oldCode = app.selectedCurrencies.from.code;
            //console.log(app.selectedCurrencies.from.code);
            break;
          case 'to-widget':
            oldCode = app.selectedCurrencies.to.code;
            //console.log(app.selectedCurrencies.from.code);
            break;
        }
        //console.log(oldCode);
        property = newValue;
        var button = domElem.querySelector('button');
        var input = domElem.querySelector('input');
        
        button.querySelector('.code').innerHTML = newValue.code;
        button.querySelector('.flag').src = newValue.flag;
        input.placeholder = '';

        var symbols = newValue.symbol.split(';');
        if (symbols) {
          symbols.forEach(function(item, index) {
            if (item !== '') {
              input.placeholder += Entities.convert(item + ';', 'utf-8');
            }
          });
        } else {
          input.placeholder = newValue.symbol;
        }

        var currenciesList = document.querySelectorAll('#modal-body .item');

        currenciesList.forEach(function (item, index) {
        //console.log(currenciesList);
          var code = item.querySelector('.code').innerHTML;
          if (code === oldCode) {
            item.classList.remove('is-selected');
          } else if (code === newValue.code){
            item.classList.add('is-selected');
          }
        });

        app.saveData('selected-currencies', app.selectedCurrencies);
        app.updateConverter();
      },
      configurable: true
    });
  };

  app.selectCurrency = function(el) {
    localforage.getItem('currencies-data').then(function(data) {
      var data = JSON.parse(data);
      var code = el.querySelector('.code').innerHTML;
      var currencies = data.currencies;

      var fromCode = app.selectedCurrencies.from.code;  
      var toCode = app.selectedCurrencies.to.code;

      if (code === fromCode || code === toCode) {
        return false;
      } 

      var selectedCurrency = currencies.find(function (element, index, array) {
        if (element.code === code) {
          return element;
        }
      });

      if (app.selectedWidget === 'from') {
        app.selectedCurrencies.from = selectedCurrency;
      } else {
        app.selectedCurrencies.to = selectedCurrency;
      }

      //el.querySelector('.name').innerHTML += ' (selected)';

      app.toggleCurrenciesMenu(false);
    }).catch(function(err) {

    });
  };

  // Gets a forecast for a specific city and update the card with the data
  app.getCurrenciesData = function() {
    var url = 'https://monney.trade/api?';
    
    localforage.getItem('currencies-data').then(function(data) {
      if (data) {
        data = JSON.parse(data);
        url += 'timestamp=' + data.timestamp;
      }

      if ('caches' in window) {
        caches.match(url).then(function(response) {
          if (response) {
            response.json().then(function(json) {
              // Only update if the XHR is still pending, otherwise the XHR
              // has already returned and provided the latest data.
              if (app.hasRequestPending) {
                console.log('[App] Forecast Updated From Cache');
                
                app.saveData('currencies-data', json);
              }
            });
          }
        });
      }
      app.hasRequestPending = true;
      // Make the XHR to get the data, then update the card
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status === 200) {
            var response = JSON.parse(request.response);
            app.hasRequestPending = false;
            console.log('[App] Forecast Updated From Network');
            
            if (!response.error) {
              app.saveData('currencies-data', response);
            }
          }
        }
      };
      request.open('GET', url);
      request.send();

      app.updateCurrenciesMenu();

      app.updateDataTimestamp();
    }).catch(function(err) {

    });
  };

  // Save list of cities to localStorage, see note below about localStorage.
  app.saveData = function(key, data) {
    var data = JSON.stringify(data);
    localforage.setItem(key, data)
    .then(function (value) {
      if (app.isLoading) {
        app.spinner.setAttribute('hidden', true);
        app.container.removeAttribute('hidden');
        app.isLoading = false;
      }
    }).catch(function(err) {
      
    });
  };

  /*****************************************************************************
   *
   * Start up
   *
   ****************************************************************************/

  app.bindModel(app.selectedCurrencies, 'from', 
    document.getElementById('from-widget'));
  app.bindModel(app.selectedCurrencies, 'to', 
    document.getElementById('to-widget'));

  app.getCurrenciesData();

  localforage.getItem('selected-currencies').then(function(value) {
    if (value) {
      var selectedCurrencies = JSON.parse(value);
      app.selectedCurrencies.from = selectedCurrencies.from;
      app.selectedCurrencies.to = selectedCurrencies.to;

      var fromInput = document.querySelector('#from-widget input');
      fromInput.value = selectedCurrencies.value;

      fromInput.dispatchEvent(new Event('input'));
    } else {
      app.selectedCurrencies.from = 
      currencies.find(function (element, index, array) {
        if (element.code === 'USD') {
          return element;
        }
      });
      app.selectedCurrencies.to = 
      currencies.find(function (element, index, array) {
        if (element.code === 'EUR') {
          return element;
        }
      });

      var fromInput = document.querySelector('#from-widget input');
      fromInput.value = 1;

      fromInput.dispatchEvent(new Event('input'));

      app.saveData('selected-currencies', app.selectedCurrencies);      
    }
  }).catch(function(err) {

  });
})();
