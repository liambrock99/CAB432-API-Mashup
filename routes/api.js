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
  res.end();
});

router.get("/area", async (req, res) => {

  let areas = [];
  const query = req.query.area;
  const url = songkickBaseUrl + `search/locations.json?query=${query}&apikey=${songkickApiKey}`;

  if (query.length === 0) {
    res.redirect('/');
    return;
  }

  try {
    const data = await axios.get(url).then(res => res.data.resultsPage.results.location);

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


router.get("/upcomingEvents", async (req, res) => {
    try {
      const query = req.query.id;
      const url = songkickBaseUrl + `metro_areas/${query}/calendar.json?apikey=${songkickApiKey}`;
      let events = []
  
      const data = await axios.get(url).then(res => res.data.resultsPage.results.event)

      if (data !== undefined) events = data; 

      if (events.length > 0) {
        res.render('upcomingEvents', { events })
      } else {
        res.render('noResults');
      }

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
