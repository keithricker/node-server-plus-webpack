const path = require('path');
const express = require('express');
const app = express();
const hbs = require('hbs');

const viewsPath = path.join(__dirname,'../templates/views');
const partialsPath = path.join(__dirname,'../templates/partials');

const { getLatLon } = require('./utils/geocode');
const { getWeather } = require('./utils/weather');

app.set("view engine", "hbs");
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);

publicPath = path.join(__dirname,'../public');
app.use(express.static(publicPath));

app.get('', (req, res) => {
    res.render("index", {
        title: "Weather",
        body: "More text here, bla bla bla ...",
        name: "Keith Ricker"
    });
    console.log(req.query);
});

app.get('/help', (req, res) => {
    res.render("help", {
        title: "Help",
        body: "This is where you get help, bla bla bla ...",
        name: "Keith Ricker"
    });
});

app.get('/about', (req, res) => {
    res.render("about", {
        title: "About",
        body: "More text here, bla bla bla ...",
        name: "Keith Ricker"
    });
});

app.get('/weather', async (req, res) => {
    if (!req.query.address) {
        return res.send({
            error: "Address is required. Please try again."
        })
    }
    const queryString = decodeURIComponent(req.query.address);
    const forecast = await getWeather(queryString);
    res.send(forecast);
});

app.get('help/*', (req, res) => {
    res.render("404", {
        title: "404 Not Found",
        body: "Cannot find the help topic you are looking for.",
        name: "Keith Ricker"
    });
});

app.get('*', (req, res) => {
    res.render("404", {
        title: "404 Not Found",
        body: "The page you are looking for cannot be found on this server.",
        name: "Keith Ricker"
    });
});

app.listen(3000, () => {
   console.log("Server is up on port 3000");
});
