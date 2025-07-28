const axios = require('axios');
const sharp = require('sharp');
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
    // Check if API key is set
    if (!process.env.REMOVEBG_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Remove.bg API key is not configured.' 
      });
    }

    // Get the image data
    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');

    // Step 1: Remove background using Remove.bg
    console.log('Removing background...');
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

    // Step 2: Process the image
    console.log('Processing image...');
    
    // First pass: Prepare for vectorization
    const preparedBuffer = await sharp(cleanedBuffer)
      .resize(200, 200, { 
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    // Apply color tint
    const coloredBuffer = await sharp(preparedBuffer)
      .tint({ r: 210, g: 215, b: 235 }) // RGB values for #D2D7EB
      .png()
      .toBuffer();

    // Final resize to 50x50
    const finalBuffer = await sharp(coloredBuffer)
      .resize(50, 50, {
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Step 3: Use SVG trace API or create high-quality PNG-based SVG
    // For now, we'll use a different approach - creating a crisp PNG and embedding it
    const base64Image = finalBuffer.toString('base64');
    
    // Create SVG with embedded image
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="colorize">
      <feColorMatrix type="matrix" values="
        0 0 0 0 0.824
        0 0 0 0 0.843
        0 0 0 0 0.922
        0 0 0 1 0"/>
    </filter>
  </defs>
  <image href="data:image/png;base64,${base64Image}" 
         width="50" 
         height="50" 
         preserveAspectRatio="xMidYMid meet"
         filter="url(#colorize)"/>
</svg>`;

    res.status(200).json({ 
      success: true, 
      svg: svg,
      note: 'This is a raster image embedded in SVG. For true vector conversion, consider using Adobe Illustrator or a professional vectorization service.'
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
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
