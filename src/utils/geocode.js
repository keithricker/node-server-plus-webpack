const request = require('request-promise-native');
const mapBox_token = 'pk.eyJ1Ijoia2VpdGhyaWNrZXIiLCJhIjoiY2s1b3I1NHB6MDAwNDNscXhibmhpcWIyMCJ9.EEyczoEl94bDSUu7jlZFAQ';
const mapBox_base = 'https://api.mapbox.com/geocoding/v5/mapbox.places/';
const sampleMapBoxCall = 'https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token='+mapBox_token;

const getLatLon = async queryString => {
    const call = mapBox_base+encodeURIComponent(queryString)+'.json?access_token='+mapBox_token;
    var coordinates;
    var errorMsg = null;
    await request({url: call, json: true}, (error, response) => {
        if (error) {
            errorMsg = "Unable to connect to the weather ServiceUIFrameContext."
        } else if (response.body.error) {
            errorMsg = "Unable to find a match. Please try again with new search text.";
        } else if (!(response && response.body && response.body.features && response.body.features[0] && response.body.features[0].center)) {
            errorMsg = 'Unable to find a match. Please try again with new search text.';
        } else {
            const features = response.body.features;
            coordinates = {
                lat: features[0].center[1],
                lon: features[0].center[0],
                location: features[0].place_name
            }
        }
        if (errorMsg) {
            coordinates = { error: errorMsg }
        }
    });
    return coordinates;
}

const geocodingWithCallback = (queryString, callback) => {
    const call = mapBox_base+encodeURIComponent(queryString)+'.json?access_token='+mapBox_token;
    var coordinates;
    var errorMsg = null;
    request({url: call, json: true}, (error, response) => {
        if (error) {
            errorMsg = "Unable to connect to the weather ServiceUIFrameContext."
        } else if (response.body.error) {
            errorMsg = "Unable to find a match. Please try agaain with new search text.";
        } else if (!(response && response.body && response.body.features && response.body.features[0] && response.body.features[0].center)) {
            errorMsg = 'Unable to find a match. Please try agaain with new search text.';
        } else {
            const features = response.body.features;
            coordinates = {
                lat: features[0].center[1],
                lon: features[0].center[0],
                location: features[0].place_name
            }
            callback(null, coordinates);
        }
        if (errorMsg) {
            coordinates = { error: errorMsg }
            callback(coordinates,null);
        }
    });
}

const returnLatLon = (queryString, callback) => {
    const call = mapBox_base+encodeURIComponent(queryString)+'.json?access_token='+mapBox_token;
    var coordinates;
    var errorMsg = null;
    request({url: call, json: true}, (error, response) => {
        if (error) {
            errorMsg = "Unable to connect to the weather ServiceUIFrameContext."
        } else if (response.body.error) {
            errorMsg = "Unable to find a match. Please try agaain with new search text.";
        } else if (!(response && response.body && response.body.features && response.body.features[0] && response.body.features[0].center)) {
            errorMsg = 'Unable to find a match. Please try agaain with new search text.';
        } else {
            const features = response.body.features;
            coordinates = {
                lat: features[0].center[1],
                lon: features[0].center[0],
                location: features[0].place_name
            }
            callback(null, coordinates);
        }
        if (errorMsg) {
            coordinates = { error: errorMsg }
            callback(coordinates, null);
        }
    });
}

exports.getLatLon = getLatLon;
exports.geocodingWithCallback = geocodingWithCallback;
exports.returnLatLon = returnLatLon;
