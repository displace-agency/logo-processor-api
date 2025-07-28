const axios = require('axios');
const sharp = require('sharp');
const FormData = require('form-data');
const potrace = require('potrace');

module.exports = async (req, res) => {
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
    if (!process.env.REMOVEBG_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Remove.bg API key is not configured.' 
      });
    }

    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');

    // Step 1: Remove background
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

    // Step 2: Prepare image for optimal tracing
    // Key improvements:
    // 1. Larger size for better detail capture
    // 2. High contrast preprocessing
    // 3. Smart threshold adjustment
    const metadata = await sharp(cleanedBuffer).metadata();
    const aspectRatio = metadata.width / metadata.height;
    
    let width = 300;
    let height = 300;
    if (aspectRatio > 1) {
      height = Math.round(300 / aspectRatio);
    } else {
      width = Math.round(300 * aspectRatio);
    }

    // Create high contrast version
    const highContrastBuffer = await sharp(cleanedBuffer)
      .resize(width, height, { 
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .greyscale()
      .normalize() // Stretch contrast
      .threshold(140) // Adjusted threshold for better detail
      .png()
      .toBuffer();

    // Step 3: Advanced Potrace settings for better quality
    const svg = await new Promise((resolve, reject) => {
      potrace.trace(highContrastBuffer, {
        threshold: 128,
        blackOnWhite: true,
        color: '#D2D7EB',
        background: 'transparent',
        turdSize: 2,        // Smaller = more detail preserved
        alphaMax: 1.0,      // Corner rounding
        optCurve: true,     // Optimize curves
        optTolerance: 0.2   // Optimization tolerance
      }, (err, svg) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Post-process SVG for final size and color
        let finalSvg = svg
          // Set viewBox based on actual dimensions
          .replace(/<svg[^>]*>/, `<svg width="50" height="50" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">`)
          // Ensure color is properly applied
          .replace(/fill="[^"]*"/g, 'fill="#D2D7EB"')
          .replace(/stroke="[^"]*"/g, 'stroke="none"');
        
        resolve(finalSvg);
      });
    });

    res.status(200).json({ 
      success: true, 
      svg: svg
    });

  } catch (error) {
    console.error('Error:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.errors?.[0]?.title || 'Failed to process image.'
    });
  }
};
