const axios = require('axios');
const sharp = require('sharp');
const potrace = require('potrace');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Remove.bg API key is set
    if (!process.env.REMOVEBG_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Remove.bg API key is not configured.' 
      });
    }

    // Get the image data
    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');

    // Step 1: Remove background using Remove.bg
    const formData = new FormData();
    formData.append('image_file', imageBuffer, 'image.png');
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const removeBgResponse = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: formData,
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
      },
      responseType: 'arraybuffer'
    });

    const cleanedBuffer = Buffer.from(removeBgResponse.data);

    // Step 2: Process image for better vectorization
    // First, resize larger for better trace quality
    const preparedBuffer = await sharp(cleanedBuffer)
      .resize(200, 200, { 
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background
      .greyscale() // Convert to greyscale for tracing
      .threshold(128) // Make it pure black and white
      .png()
      .toBuffer();

    // Step 3: Use Potrace for SVG conversion
    const svg = await new Promise((resolve, reject) => {
      potrace.trace(preparedBuffer, {
        color: '#D2D7EB',
        threshold: 0.5,
        blackOnWhite: true,
        turdSize: 10,
        optTolerance: 0.2
      }, (err, svg) => {
        if (err) reject(err);
        else {
          // Post-process SVG
          let processedSvg = svg
            // Set proper dimensions
            .replace(/<svg[^>]*>/, '<svg width="50" height="50" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">')
            // Ensure color is applied
            .replace(/fill="[^"]*"/g, 'fill="#D2D7EB"')
            .replace(/stroke="[^"]*"/g, 'stroke="none"');
          
          resolve(processedSvg);
        }
      });
    });

    res.status(200).json({ 
      success: true, 
      svg: svg
    });

  } catch (error) {
    console.error('Error:', error.message);
    
    let errorMessage = 'Failed to process image.';
    if (error.response?.status === 402) {
      errorMessage = 'Remove.bg credits exhausted. Please check your account.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Remove.bg API key is invalid.';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage
    });
  }
};
