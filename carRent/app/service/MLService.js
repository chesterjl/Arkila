const axios = require('axios');
const ApiError = require('../utils/ApiError');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 5000;

// Owner-facing: a bad response here should surface as an error so the
// widget can show it.
const predictDemand = async (payload) => {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/predict-demand`, payload, {
      timeout: TIMEOUT_MS,
    });
    return data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED' || !err.response) {
      throw new ApiError(503, 'Demand prediction service is currently unavailable.');
    }
    throw new ApiError(502, err.response?.data?.detail || 'Failed to get a demand prediction.');
  }
};

// Browse-page facing: this feature is a "nice to have" ranking, so a
// failure here returns null instead of throwing -- the caller falls back
// to standard sorting rather than breaking the whole car list.
const recommendCars = async (payload) => {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/recommend-cars`, payload, {
      timeout: TIMEOUT_MS,
    });
    return data;
  } catch (err) {
    console.error('ML recommend-cars unavailable:', err.message);
    return null;
  }
};

module.exports = { predictDemand, recommendCars };