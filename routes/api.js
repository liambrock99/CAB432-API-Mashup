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
 * OATH2.0 Client Credentials Grant
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
      res.render('noResults', { query });
      return;
    }

    let areas = []; // array of returned areas
    const url = `${songkickBaseUrl}search/locations.json?query=${query}&apikey=${songkickApiKey}`; // url to fetch

    const data = await axios.get(url).then(res => res.data.resultsPage);

    // Throw an error if a bad request was made
    if (data.status === 'error') throw new Error('Invalid Request');

    // If no results were found, render noResults.jade
    if (Object.keys(data.results).length === 0) {
      res.render('noResults', { query });
      return;
    }
    
    areas = data.results.location;
    res.render('areas', { areas, query });

  } catch (err) {
      console.log(err.message);
      res.render('broken');
      return;
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
      res.render('noResults', { query: id });
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
      res.render('noResults', { query: id });
      return;
    }

    events = data.results.event;
    res.render('upcomingEvents', { events });

  } catch (err) {
    console.log(err.message);
    res.render('broken');
    return;
  }
});

router.get("/artist", async (req, res) => {
    try {
        // Check if query string is valid
        const query = req.query.q;
        if (!isValid(query)) {
          res.render('noResults', { query });
          return;
        }

        const artists = await spotifyApi.searchArtists(query, {limit: 1}).then(res => res.body.artists.items) // Search for the artist

        if (artists.length === 0) {
          res.render('noResults', { query });
          return;
        }

        // Only grabbing the first result
        const id = artists[0].id;

        // Following API calls do not rely on each other so use Promise.all()
        const albums = spotifyApi.getArtistAlbums(`${id}`, { include_groups: 'album' }).then(res => res.body.items);
        const top_tracks = spotifyApi.getArtistTopTracks(`${id}`, 'AU').then(res => res.body.tracks);
        const related_artists = spotifyApi.getArtistRelatedArtists(`${id}`).then(res => res.body.artists);
        const resolved = await Promise.all([albums, top_tracks, related_artists]);

        res.render('artist',  { artist: artists[0], albums: resolved[0], top_tracks: resolved[1], related_artists: resolved[2] });

    } catch (err) {
        console.log(err.message);
        res.render('broken');
        return;
    }
}) 

router.get('/related_artists', async (req, res) => {
  try {
    // Check if query string is valid
    const query = req.query.q;
    if (!isValid(query)) {
      res.render('noResults', { query });
      return;
    }

    const artist = await spotifyApi.searchArtists(query, {limit: 1}).then(res => res.body.artists.items) // Search for the artist

    if (artist.length === 0) {
      res.render('noResults', { query });
      return;
    }

    const id = artist[0].id;
    const related_artists = await spotifyApi.getArtistRelatedArtists(`${id}`).then(res => res.body.artists);

    res.render('related_artists', { artist: artist[0].name, related_artists })
    
  } catch (err) {
    console.log(err.message);
    res.render('broken');
    return;
  }
})

router.get('/artistUpcomingEvents', async (req, res) => {
  try {
    // Check if query string is valid
    const query = req.query.q;
    if (!isValid(query)) {
      res.render('noResults', { query });
      return;
    }
    
    // Attempt to find the artists songkick artist_id
    const url1 = `${songkickBaseUrl}search/artists.json?apikey=${songkickApiKey}&query=${query}`;
    const artist = await axios.get(url1).then(res => res.data.resultsPage);

    // Throw an error if a bad request was made
    if (artist.status === 'error') throw new Error('Invalid Request');

    // If no results were found, render noResults.jade
    if (Object.keys(artist.results).length === 0) {
      res.render('noResults', { query });
      return;
    }

    // Just getting first result
    const id = artist.results.artist[0].id;

    // Get upcoming events for artist
    const url2 = `${songkickBaseUrl}artists/${id}/calendar.json?apikey=${songkickApiKey}`;
    const events = await axios.get(url2).then(res => res.data.resultsPage);

    // If no events were found, render noResults.jade
    if (Object.keys(events.results).length === 0) {
      res.render('noResults', { query });
      return;
    }

    res.render('upcomingEvents', { events: events.results.event });
  } catch (err) {
    console.log(err.message);
    res.render('broken');
    return;
  }
})

module.exports = router;
