const express = require("express");
const router = express.Router();
const axios = require("axios");
const SpotifyWebApi = require("spotify-web-api-node");
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});
const songkickApiKey = process.env.SONGKICK_API_KEY;
const songkickBaseUrl = "https://api.songkick.com/api/3.0/";

// authorize server with spotify to make api calls
spotifyApi
  .clientCredentialsGrant()
  .then(data => {
    spotifyApi.setAccessToken(data.body["access_token"]);
  })
  .catch(err => {
    console.log(err.message);
  });

router.get("/", (req, res) => {
  res.end();
});

// Get array of areas for :query
router.get("/area", async (req, res) => {

  let response = { results: [] }
  const query = req.query.area;

  if (query === "") res.end();

  try {
    const url = songkickBaseUrl + `search/locations.json?query=${query}&apikey=${songkickApiKey}`;
    // console.log(`Fetching: ${url}`) 

    const data = await axios.get(url).then(res => { return res.data.resultsPage.results.location } );
    // console.log(`Finished fetching: ${url}`)
    if (data !== undefined) response.results = data;
    res.render('areas', {'results': response.results, query: query});

  } catch (err) {
      console.log(err.message);
      res.status(500).json({ message: err.message });
  }
});


// Get upcoming events for area with :areaID
router.get("/upcomingEvents", async (req, res) => {

    const query = req.query.id;
    let response = { results: [] };

    try {
      const url = songkickBaseUrl + `metro_areas/${query}/calendar.json?apikey=${songkickApiKey}`;
      // console.log(`Fetching: ${url}`);

      const data = await axios.get(url).then(res => {return res.data.resultsPage.results.event;})
      // console.log(`Finished fetching: ${url}`)

      if (data !== undefined) response.results = data;
      console.log(response.results[0]);
      res.render('upcomingEvents', response)

    } catch (err) {
      console.log(err.message);
      res.status(500).json({ message: err.message });
    }
});


// Search for an artist
router.get("/artist/:query", async (req, res) => {
    try {
        const response = { artists: [] }
        const results = await spotifyApi.searchArtists(req.params.query, {limit: 1}).then(res => {return res.body.artists.items})
        if (results !== undefined) response.artists = results;
        res.status(200).json(results);
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: err.message })
    }
}) 
module.exports = router;
