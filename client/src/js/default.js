import app from './modules/app';
import * as serviceWorker from './utils/serviceWorker';

app();
console.log('hello from default.js');

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();