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

/**
 * Authorize ourselves
 * OATH Client Credentials Grant
 */
spotifyApi
  .clientCredentialsGrant()
  .then(data => {
    spotifyApi.setAccessToken(data.body["access_token"]);
  })
  .catch(err => {
    console.log(err.message);
  });


router.get("/", (req, res) => {
  res.redirect('/');
});


function isValid(str) {
  if (str === undefined) return false;
  if (str === null) return false;
  // Trim whitespace then check length
  str = str.trim();
  if (str.length === 0) return false;
  return true;
}

/**
 * Usage: /area?q=""
 * Search the Songkick API search endpoint for locations 
 */
router.get("/area", async (req, res) => {
  try { 
    // Check if query string is valid
    const query = req.query.q;
    if (!isValid(query)) {
      console.log('wasnt valid???')
      res.render('noResults');
      return;
    }

    let areas = []; // array of returned areas
    const url = `${songkickBaseUrl}search/locations.json?query=${query}&apikey=${songkickApiKey}`; // url to fetch

    const data = await axios.get(url).then(res => res.data.resultsPage);

    // Throw an error if a bad request was made
    if (data.status === 'error') throw new Error('Invalid Request');

    // If no results were found, render noResults.jade
    if (Object.keys(data.results).length === 0) {
      console.log('whjatttt');
      res.render('noResults');
      return;
    }
    
    areas = data.results.location;
    res.render('areas', { areas, query });

  } catch (err) {
      console.log(err.message);
  }
});


/**
 * Usage: /area?id=""
 * Use SongKick API to get the upcoming events for area with given id
 */
router.get("/upcomingEvents", async (req, res) => {
  try {
    // Check if query string is valid
    const id = req.query.id;
    if (!isValid(id)) {
      res.render('noResults');
      return;
    }

    // For some reason the upcoming endpoint can return past events
    // So.. get current date and pass as min_date to request
    // Format must be YYYY-MM-DD
    const min_date = new Date().toISOString().split('T')[0];

    let events = []; // array or returned events
    const url = `${songkickBaseUrl}metro_areas/${id}/calendar.json?apikey=${songkickApiKey}&min_date=${min_date}`; // url to fetch

    const data = await axios.get(url).then(res => res.data.resultsPage);
    
    // Throw an error if a bad request was made
    if (data.status === 'error') throw new Error('Invalid Request');

    // If no results were found, render noResults.jade
    if (Object.keys(data.results).length === 0) {
      res.render('noResults');
      return;
    }

    events = data.results.event;
    res.render('upcomingEvents', { events });

  } catch (err) {
    console.log(err.message);
  }
});

router.get("/artist", async (req, res) => {
    try {
        // Check if query string is valid
        const query = req.query.q;
        if (!isValid(query)) {
          res.render('noResults');
          return;
        }

        artists = await spotifyApi.searchArtists(query, {limit: 1}).then(res => res.body.artists.items) // Search for the artist

        if (artists.length === 0) {
          res.render('noResults');
          return;
        }

        // Only grabbing the first result
        const id = artists[0].id;

        // Following API calls do not rely on each other so use Promise.all()
        const albums = spotifyApi.getArtistAlbums(`${id}`, { include_groups: 'album' }).then(res => res.body.items)
        const top_tracks = spotifyApi.getArtistTopTracks(`${id}`, 'AU').then(res => res.body.tracks)
        const resolved = await Promise.all([albums, top_tracks]);

        res.render('artist',  { artist: artists[0], albums: resolved[0], top_tracks: resolved[1] });

    } catch (err) {
        console.log(err.message);
    }

}) 

module.exports = router;
