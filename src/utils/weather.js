const request = require('request-promise-native');
const sampleApiCall = 'https://api.darksky.net/forecast/ad2dfa0c2f06e24c0478c495520117ee/41.8781,-87.6298';
const darkSky_base = 'https://api.darksky.net/forecast/ad2dfa0c2f06e24c0478c495520117ee/';
const darkSky_key = 'ad2dfa0c2f06e24c0478c495520117ee';
const { getLatLon, returnLatLon, geocodingWithCallback} = require('./geocode');

const getWeather = async (address) => {
    var result;
    const latLon = await getLatLon(address);
    if (latLon && latLon.error) {
        return latLon;
    } else {
        apiCall = darkSky_base+latLon.lat+','+latLon.lon;
        await request({url: apiCall, json: true}, (error, response) => {
            const currently = response.body.currently;
            const daily = response.body.daily;
            result = {
                location: latLon.location,
                forecast: daily.data[0].summary+' The current temperature is '+currently.temperature+', and there is a '+currently.precipProbability+'% chance of rain.',
                address: address            
            }
        })
        return result;
    }
}

const getWeatherCallback = (address) => {
    geocodingWithCallback(address, (error,latLon) => {
        if (error) {
            console.log(error.error);
        } else {
            apiCall = darkSky_base+latLon.lat+','+latLon.lon;
            request({url: apiCall, json: true}, (error, response) => {
                const currently = response.body.currently;
                const daily = response.body.daily;
                console.log(latLon.location);
                console.log(daily.data[0].summary);
                console.log('The current temperature is '+currently.temperature);
                console.log('And there is a '+(currently.precipProbability * 100)+'% chance of rain.')
            })           
        }

    });
}

const returnWeather = (latLon, callback) => {
    apiCall = darkSky_base+latLon.lat+','+latLon.lon;
    request({url: apiCall, json: true}, (error, response) => {
        const currently = response.body.currently;
        const daily = response.body.daily;
        const returnValue = {
            location: latLon.location,
            summary: daily.data[0].summary,
            temp: 'The current temperature is '+currently.temperature,
            precip: 'And there is a '+(currently.precipProbability * 100)+'% chance of rain.'
        }
        callback(null,returnValue);
    });
}

const weather = (string) => {
    returnLatLon(string, (err, res) => {
        if (err) {
            console.log(err.error);
        } else {
            location = res.location;
            returnWeather(res, (error, results) => {
                if (error) {
                    console.log(error.error);
                } else {
                    console.log(location);
                    console.log(results.location);
                    console.log(results.summary);
                    console.log(results.precip);
                }
            });
        }
    });
}

exports.getWeather = getWeather;
exports.getWeatherCallback = getWeatherCallback;
exports.returnWeather = returnWeather;
exports.weather = weather;

