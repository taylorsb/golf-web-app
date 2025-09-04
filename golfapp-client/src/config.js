const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://golf-app--0000003.greensky-eadbd98c.uksouth.azurecontainerapps.io' 
    : 'http://127.0.0.1:5000';

export default API_URL;
