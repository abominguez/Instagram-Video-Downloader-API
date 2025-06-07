const express = require('express');
const axios = require('axios');
const app = express();
const snapsave = require('./snapsave-downloader');
const port = 3000;

// Configuración de Iframely
const IFRAMELY_API_KEY = '80c35cf85e5f42d8478c87';
const IFRAMELY_API_URL = 'https://cdn.iframe.ly/api/iframely';

// Función para convertir URLs de Facebook al formato share/v/
const normalizeFacebookUrl = (url) => {
  try {
    const urlObj = new URL(url);
    
    // Si ya es una URL share/v/, la devolvemos tal cual
    if (urlObj.pathname.includes('/share/v/')) {
      return url;
    }
    
    // Si es un Reel, extraemos el ID y lo convertimos
    const reelMatch = url.match(/facebook\.com\/reel\/(\d+)/);
    if (reelMatch) {
      return `https://www.facebook.com/share/v/${reelMatch[1]}/`;
    }
    
    // Si es un video normal, extraemos el ID
    const videoMatch = url.match(/videos(?:\/|%2F)(\d+)/) || url.match(/video\.php\?v=(\d+)/);
    if (videoMatch) {
      return `https://www.facebook.com/share/v/${videoMatch[1]}/`;
    }
    
    // Si no reconocemos el formato, devolvemos la URL original
    return url;
  } catch (e) {
    return url;
  }
};

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/igdl', async (req, res) => {
  try {
    let url = req.query.url;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is missing' });
    }

    // Normalizamos la URL de Facebook
    if (url.includes('facebook.com')) {
      url = normalizeFacebookUrl(url);
    }

    // Descargar video usando snapsave
    const downloadedURL = await snapsave(url);
    
    // Obtener descripción usando Iframely
    let description = "Sin descripción disponible";
    
    try {
      const iframelyResponse = await axios.get(`${IFRAMELY_API_URL}?url=${encodeURIComponent(url)}&api_key=${IFRAMELY_API_KEY}`);
      
      // Priorizamos meta.description para Facebook
      if (iframelyResponse.data?.meta?.description) {
        description = iframelyResponse.data.meta.description;
      } 
      // Si no hay descripción, intentamos con el HTML del player
      else if (iframelyResponse.data?.html) {
        const descMatch = iframelyResponse.data.html.match(/<p>(.*?)<\/p>/s);
        if (descMatch) {
          description = descMatch[1]
            .replace(/<[^>]+>/g, '') // Eliminar etiquetas HTML
            .replace(/\n{2,}/g, '\n\n') // Normalizar saltos de línea
            .trim();
        }
      }
      // Último recurso: el título
      else if (iframelyResponse.data?.meta?.title) {
        description = iframelyResponse.data.meta.title;
      }
    } catch (iframelyError) {
      console.error('Error con Iframely:', iframelyError.message);
    }
    
    res.json({
      download_url: downloadedURL,
      description: description,
      normalized_url: url // Para depuración
    });
    
  } catch (err) {
    console.error('Error principal:', err.message);
    
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});