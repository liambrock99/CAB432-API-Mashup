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
    const url = songkickBaseUrl + `search/locations.json?query=${query}&apikey=${songkickApiKey}`; // url to fetch

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

    let events = []; // array or returned events
    const url = songkickBaseUrl + `metro_areas/${id}/calendar.json?apikey=${songkickApiKey}`; // url to fetch

    const data = await axios.get(url).then(res => res.data.resultsPage);
    
    // Throw an error if a bad request was made
    if (data.status === 'error') throw new Error('Invalid Request');

    // If no results were found, render noResults.jade
    if (Object.keys(data.results).length === 0) {
      res.render('noResults');
      return;
    }

    events = data.results.event;
    res.render('upcomingEvents', { events })
  } catch (err) {
    console.log(err.message);
  }
});

router.get("/artist", async (req, res) => {
    try {
        const query = req.query.artist;
        let artist
        let artists;
        let id;
        let albums;
        let top_tracks;
        let resolved;

        artists = await spotifyApi.searchArtists(query, {limit: 1}).then(res => res.body.artists.items)

        if (artists.length > 0) {
          artist = artists[0];
          id = artist.id;
        } else {
          res.render('noResults');
          return;
        }

        albums = spotifyApi.getArtistAlbums(`${id}`, { include_groups: 'album' }).then(res => res.body.items)
        top_tracks = spotifyApi.getArtistTopTracks(`${id}`, 'AU').then(res => res.body.tracks)
        resolved = await Promise.all([albums, top_tracks]);

        res.render('artist',  { artist, albums: resolved[0], top_tracks: resolved[1] });

    } catch (err) {
        console.log(err.message);
    }

}) 

module.exports = router;
