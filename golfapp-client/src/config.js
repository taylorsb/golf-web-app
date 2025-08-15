const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://golf-app-server-simon.jollymoss-72694da1.uksouth.azurecontainerapps.io' 
    : 'http://127.0.0.1:5000';

export default API_URL;
