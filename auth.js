/**
 * Authentication module for PharmaTalent LinkedIn Scraper
 * Handles login, token management, and API requests
 */

class Auth {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || 'https://linkedin-profile-scraper.replit.app';
  }
  
  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }
  
  /**
   * Get stored authentication token
   * @returns {string|null} Authentication token or null if not found
   */
  getToken() {
    // Look for the token in localStorage and sessionStorage
    const localToken = localStorage.getItem('jwt_token');
    const sessionToken = sessionStorage.getItem('jwt_token');
    
    // Check chrome.storage if available
    const chromeToken = this._getChromeToken();
    
    // Return the first available token
    return chromeToken || localToken || sessionToken;
  }
  
  /**
   * Get token from Chrome storage (non-blocking)
   * @returns {string|null} Token from Chrome storage
   */
  _getChromeToken() {
    let token = null;
    
    try {
      // First try to get pt_auth_token (new format)
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('pt_auth_token', (result) => {
          if (result && result.pt_auth_token) {
            token = result.pt_auth_token;
          }
        });
      }
      
      // If not found, try legacy format
      if (!token && chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get('token', (result) => {
          if (result && result.token) {
            token = result.token;
          }
        });
      }
    } catch (e) {
      console.log('Chrome storage not available', e);
    }
    
    return token;
  }
  
  /**
   * Store authentication token
   * @param {string} token - Authentication token
   */
  setToken(token) {
    // Store in multiple locations for redundancy
    localStorage.setItem('jwt_token', token);
    sessionStorage.setItem('jwt_token', token);
    
    // Store in Chrome storage if available
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ 'pt_auth_token': token });
      }
    } catch (e) {
      console.log('Chrome storage not available', e);
    }
  }
  
  /**
   * Remove stored authentication token (logout)
   */
  logout() {
    // Clear from all storage locations
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');
    
    // Clear from Chrome storage if available
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['pt_auth_token', 'token']);
      }
    } catch (e) {
      console.log('Chrome storage not available', e);
    }
  }
  
  /**
   * Add authorization header to request options
   * @param {Object} options - Request options
   * @returns {Object} Options with authorization header
   */
  addAuthHeader(options = {}) {
    const token = this.getToken();
    if (!token) return options;
    
    return {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    };
  }
  
  /**
   * Authenticate with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.token) {
        this.setToken(data.token);
        return { authenticated: true, user: data.user };
      } else {
        return { authenticated: false, message: data.message || 'Authentication failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { authenticated: false, message: error.message };
    }
  }
  
  /**
   * Get available projects
   * @returns {Promise<Array>} List of projects
   */
  async getProjects() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/projects`, 
        this.addAuthHeader());
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }
  
  /**
   * Scrape a LinkedIn profile
   * @param {string} linkedinUrl - LinkedIn profile URL
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Scrape result
   */
  async scrapeProfile(linkedinUrl, projectId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/scrape`, {
        method: 'POST',
        ...this.addAuthHeader({
          headers: {
            'Content-Type': 'application/json'
          }
        }),
        body: JSON.stringify({
          linkedin_url: linkedinUrl,
          project_id: projectId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Scrape error:', error);
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Batch scrape LinkedIn profiles
   * @param {Array<string>} linkedinUrls - LinkedIn profile URLs
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Batch scrape result
   */
  async batchScrapeProfiles(linkedinUrls, projectId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/batch-scrape`, {
        method: 'POST',
        ...this.addAuthHeader({
          headers: {
            'Content-Type': 'application/json'
          }
        }),
        body: JSON.stringify({
          linkedin_urls: linkedinUrls,
          project_id: projectId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Batch scrape error:', error);
      return { status: 'error', message: error.message };
    }
  }
}