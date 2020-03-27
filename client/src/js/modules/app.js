export default function() {
    console.log('helloo from app.js, mofosss!');
}

/* 
const weatherForm = document.getElementById("weatherForm");
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
