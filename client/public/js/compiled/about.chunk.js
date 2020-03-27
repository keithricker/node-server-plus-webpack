(this["webpackJsonpclient"] = this["webpackJsonpclient"] || []).push([["about"],{

/***/ "./src/js/about.js":
/*!*************************!*\
  !*** ./src/js/about.js ***!
  \*************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _modules_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modules/app */ "./src/js/modules/app.js");
/* harmony import */ var _utils_serviceWorker__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/serviceWorker */ "./src/js/utils/serviceWorker.js");


Object(_modules_app__WEBPACK_IMPORTED_MODULE_0__["default"])();
console.log('hello from about.js sir, its an honor to be here'); // If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA

_utils_serviceWorker__WEBPACK_IMPORTED_MODULE_1__["unregister"]();

/***/ }),

/***/ "./src/js/modules/app.js":
/*!*******************************!*\
  !*** ./src/js/modules/app.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = (function () {
  console.log('helloo from app.js, mofosss!');
});
/* const weatherForm = document.getElementById("weatherForm");

weatherForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("weatherLocation");
    const url = '/weather?address='+encodeURIComponent(input.value);
    const viewForecast = document.getElementById("weatherForecast");
    viewForecast.insertAdjacentHTML('beforeend', '<p>Loading ...</p>');
    const results = await fetch(url).then(result => result.json()).then(json => { return json });
    let html = '';
    if (results.error) {
        html = `<p><em>Error:</em></p><p>${results.error}</p>`;
    } else {
        html = `<p><div><em>Location:</em></div>
        <div>${results.location}</div></p>
        <p><div><em>Forecast:</em></div><div>${results.forecast}</div></p>`;
    }
    viewForecast.innerHTML = '';
    viewForecast.insertAdjacentHTML('beforeend', html);
});
*/

/***/ }),

/***/ "./src/js/utils/serviceWorker.js":
/*!***************************************!*\
  !*** ./src/js/utils/serviceWorker.js ***!
  \***************************************/
/*! exports provided: register, unregister */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "register", function() { return register; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "unregister", function() { return unregister; });
// This optional code is used to register a service worker.
// register() is not called by default.
// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.
// To learn more about the benefits of this model and instructions on how to
// opt-in, read https://bit.ly/CRA-PWA
const isLocalhost = Boolean(window.location.hostname === 'localhost' || // [::1] is the IPv6 localhost address.
window.location.hostname === '[::1]' || // 127.0.0.0/8 are considered localhost for IPv4.
window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));
function register(config) {
  if (false) {}
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker.register(swUrl).then(registration => {
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;

      if (installingWorker == null) {
        return;
      }

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // At this point, the updated precached content has been fetched,
            // but the previous service worker will still serve the older
            // content until all client tabs are closed.
            console.log('New content is available and will be used when all ' + 'tabs for this page are closed. See https://bit.ly/CRA-PWA.'); // Execute callback

            if (config && config.onUpdate) {
              config.onUpdate(registration);
            }
          } else {
            // At this point, everything has been precached.
            // It's the perfect time to display a
            // "Content is cached for offline use." message.
            console.log('Content is cached for offline use.'); // Execute callback

            if (config && config.onSuccess) {
              config.onSuccess(registration);
            }
          }
        }
      };
    };
  }).catch(error => {
    console.error('Error during service worker registration:', error);
  });
}

function checkValidServiceWorker(swUrl, config) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: {
      'Service-Worker': 'script'
    }
  }).then(response => {
    // Ensure service worker exists, and that we really are getting a JS file.
    const contentType = response.headers.get('content-type');

    if (response.status === 404 || contentType != null && contentType.indexOf('javascript') === -1) {
      // No service worker found. Probably a different app. Reload the page.
      navigator.serviceWorker.ready.then(registration => {
        registration.unregister().then(() => {
          window.location.reload();
        });
      });
    } else {
      // Service worker found. Proceed as normal.
      registerValidSW(swUrl, config);
    }
  }).catch(() => {
    console.log('No internet connection found. App is running in offline mode.');
  });
}

function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister();
    }).catch(error => {
      console.error(error.message);
    });
  }
}

/***/ })

},[["./src/js/about.js","runtime-about"]]]);
//# sourceMappingURL=about.chunk.js.map