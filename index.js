const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/igdl', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is missing' });
    }

    // Descargar video usando snapsave
    const downloadedURL = await snapsave(url);
    
    // Obtener descripción basada en la plataforma
    let description = "Sin descripción disponible";
    
    if (url.includes('instagram.com')) {
      // Usar oEmbed público de Instagram
      const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&omitscript=true`;
      const oembedResponse = await axios.get(oembedUrl);
      description = oembedResponse.data.title || description;
    } else if (url.includes('facebook.com')) {
      // Solución alternativa para Facebook usando Open Graph
      try {
        const response = await axios.get(url);
        const html = response.data;
        
        // Buscar la descripción en meta tags
        const descriptionMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);
        if (descriptionMatch && descriptionMatch[1]) {
          description = descriptionMatch[1];
        }
      } catch (fbErr) {
        console.log("No se pudo obtener descripción de Facebook");
      }
    }
    
    res.json({
      download_url: downloadedURL,
      description: description
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});