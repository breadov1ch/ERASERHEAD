// Centralized API URL configuration
// Automatically targets local ASP.NET Core backend when running locally on localhost/127.0.0.1
export const API_URL = 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5031'
    : (process.env.REACT_APP_API_URL || 'http://localhost:5031');

export default API_URL;
