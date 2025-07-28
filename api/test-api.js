const axios = require('axios');

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

  // Test endpoint to check API keys
  try {
    const removeBgKey = process.env.REMOVEBG_API_KEY;
    const vectorizerKey = process.env.VECTORIZER_API_KEY;

    const status = {
      removeBgKeySet: !!removeBgKey,
      removeBgKeyLength: removeBgKey ? removeBgKey.length : 0,
      removeBgKeyPrefix: removeBgKey ? removeBgKey.substring(0, 3) + '...' : 'not set',
      vectorizerKeySet: !!vectorizerKey,
      vectorizerKeyLength: vectorizerKey ? vectorizerKey.length : 0,
      vectorizerKeyPrefix: vectorizerKey ? vectorizerKey.substring(0, 3) + '...' : 'not set',
    };

    // Test Remove.bg API
    let removeBgStatus = 'not tested';
    if (removeBgKey) {
      try {
        const testResponse = await axios({
          method: 'get',
          url: 'https://api.remove.bg/v1.0/account',
          headers: {
            'X-Api-Key': removeBgKey,
          }
        });
        removeBgStatus = 'working - credits: ' + testResponse.data.data.attributes.credits.total;
      } catch (error) {
        removeBgStatus = 'error: ' + (error.response?.data?.errors?.[0]?.title || error.message);
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'API Test Results',
      apiKeys: status,
      removeBgTest: removeBgStatus,
      vectorizerTest: 'Please check Vectorizer.ai dashboard for API status'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
