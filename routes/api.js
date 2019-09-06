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

/**
 * /api route
 */
router.get("/", (req, res) => {
  res.end();
});


/**
 * GET /area
 * 
 */
router.get("/area", async (req, res) => {

  let areas = [];
  const query = req.query.area;
  const url = songkickBaseUrl + `search/locations.json?query=${query}&apikey=${songkickApiKey}`;

  if (query === "") res.end();

  try {
    const data = await axios.get(url).then(res => { return res.data.resultsPage.results.location } );

    if (data !== undefined) areas = data;

    if (areas.length > 0) {
      res.render('areas', { areas, query });
    } else {
      res.render('noResults');
    }
  } catch (err) {
      console.log(err.message);
      res.status(500).json({ message: err.message });
  }
});


// Get upcoming events for area with :areaID
router.get("/upcomingEvents", async (req, res) => {

    const query = req.query.id;
    const url = songkickBaseUrl + `metro_areas/${query}/calendar.json?apikey=${songkickApiKey}`;
    let events = []

    try {
      const data = await axios.get(url).then(res => {return res.data.resultsPage.results.event;})

      if (data !== undefined) events = data; 

      if (events.length > 0) {
        res.render('upcomingEvents', { events })
      } else {
        res.render('noResults');
      }

    } catch (err) {
      console.log(err.message);
      res.status(500).json({ message: err.message });
    }
});


// Search for an artist
router.get("/artist", async (req, res) => {

    const query = req.query.artist;
    let artist;
    let albums;
    let top_tracks
    let id;

    try {
        const data = await spotifyApi.searchArtists(query, {limit: 1}).then(res => {return res.body.artists.items})

        if (data.length > 0) {
          artist = data[0];
        } else {
          res.render('noResults');
          return;
        }

        id = artist.id;

        albums = await spotifyApi.getArtistAlbums(`${id}`, { include_groups: 'album,single' }).then(res => { return res.body.items })
        top_tracks = await spotifyApi.getArtistTopTracks(`${id}`, 'AU').then(res => { return res.body.tracks })

        res.render('artist',  { artist, albums, top_tracks });

    } catch (err) {
        console.log(err.message);
    }

}) 

module.exports = router;
