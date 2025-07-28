const axios = require('axios');
const sharp = require('sharp');
const potrace = require('potrace');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Enable CORS for your Webflow domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the image data from the request
    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');

    // Step 1: Remove background using Remove.bg
    const formData = new FormData();
    formData.append('image_file', imageBuffer, 'image.png');
    formData.append('size', 'auto');

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

    // Step 2: Process the image with Sharp - prepare for better vectorization
    const processedBuffer = await sharp(Buffer.from(removeBgResponse.data))
      .resize(200, 200, { 
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .greyscale() // Convert to greyscale for better tracing
      .normalise() // Enhance contrast
      .png()
      .toBuffer();

    // Step 3: Convert to SVG using Potrace with optimized settings
    const svg = await new Promise((resolve, reject) => {
      potrace.trace(processedBuffer, {
        color: '#D2D7EB',
        threshold: 100, // Lower threshold for more detail
        blackOnWhite: false,
        turdSize: 2, // Smaller = more detail
        optTolerance: 0.2, // Lower = more accurate
        background: 'transparent'
      }, (err, svg) => {
        if (err) reject(err);
        else {
          // Post-process SVG to resize to 50px
          const scaledSvg = svg.replace(
            /<svg[^>]*>/,
            '<svg width="50" height="50" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
          );
          resolve(scaledSvg);
        }
      });
    });

    // Return the SVG
    res.status(200).json({ 
      success: true, 
      svg: svg 
    });

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process image' 
    });
  }
};
