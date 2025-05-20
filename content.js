/**
 * Content script for PharmaTalent LinkedIn Scraper
 * Runs on LinkedIn pages to handle profile scraping
 */

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  // Handle different message actions
  if (request.action === 'scrapeProfile') {
    // Get current LinkedIn URL
    const linkedinUrl = window.location.href;
    
    // Check if this is a valid LinkedIn profile page
    if (!isLinkedInProfilePage(linkedinUrl)) {
      sendResponse({ 
        status: 'error', 
        message: 'Not a LinkedIn profile page' 
      });
      return;
    }
    
    // Scrape the profile
    scrapeProfile(linkedinUrl, request.projectId)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ 
          status: 'error', 
          message: error.message 
        });
      });
    
    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
});

/**
 * Check if URL is a LinkedIn profile page
 * @param {string} url - URL to check
 * @returns {boolean} Whether URL is a LinkedIn profile page
 */
function isLinkedInProfilePage(url) {
  return url && (
    url.includes('linkedin.com/in/') || 
    url.includes('/talent/profile/') || 
    url.includes('/recruiter/profile/')
  );
}

/**
 * Scrape LinkedIn profile
 * @param {string} linkedinUrl - LinkedIn profile URL
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Scrape result
 */
async function scrapeProfile(linkedinUrl, projectId) {
  try {
    // Get authentication token
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Not authenticated. Please log in through the extension popup.');
    }
    
    console.log(`Scraping profile: ${linkedinUrl} for project: ${projectId}`);
    
    // Get API base URL from storage or use default
    const apiBaseUrl = await getApiBaseUrl();
    
    // Make API request
    const response = await fetch(`${apiBaseUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        linkedin_url: linkedinUrl,
        project_id: projectId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    return {
      status: 'success',
      profile_id: result.profile_id,
      message: result.message || 'Profile scraped successfully'
    };
  } catch (error) {
    console.error('Error scraping profile:', error);
    throw error;
  }
}

/**
 * Get authentication token from storage
 * @returns {Promise<string|null>} Authentication token
 */
function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('pt_auth_token', (result) => {
      resolve(result.pt_auth_token || null);
    });
  });
}

/**
 * Get API base URL from storage or use default
 * @returns {Promise<string>} API base URL
 */
function getApiBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get('pt_base_url', (result) => {
      resolve(result.pt_base_url || 'https://linkedin-profile-scraper.replit.app');
    });
  });
}