const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://flask-backend-z71k.onrender.com' 
    : 'http://127.0.0.1:5000';

export default API_URL;
