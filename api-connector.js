/**
 * API Connector for PharmaTalent LinkedIn Scraper
 * Handles communication with the Replit API service
 * This is the version that properly saves data to Supabase
 */

// Configuration
const API_BASE_URL = 'https://linkedin-profile-scraper.replit.app';

// Get authentication token from storage
function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get('pt_auth_token', (result) => {
      resolve(result.pt_auth_token || null);
    });
  });
}

// Scrape a single LinkedIn profile
async function scrapeProfile(linkedinUrl, projectId) {
  if (!linkedinUrl) throw new Error('LinkedIn URL is required');
  if (!projectId) throw new Error('Project ID is required');
  
  const token = await getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  console.log(`Processing profile: ${linkedinUrl} for project ${projectId}`);
  
  try {
    // Make API request with proper headers and project ID
    const response = await fetch(`${API_BASE_URL}/api/scrape`, {
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
    console.log(`Profile processed: ${result.profile_id || 'Unknown ID'}`);
    
    return {
      status: "success",
      profile_id: result.profile_id,
      message: result.message || "Profile processed successfully"
    };
  } catch (error) {
    console.error(`Error processing profile:`, error);
    return {
      status: "error",
      message: error.message
    };
  }
}

// Batch scrape multiple LinkedIn profiles
async function batchScrapeProfiles(linkedinUrls, projectId) {
  if (!linkedinUrls || !linkedinUrls.length) throw new Error('LinkedIn URLs are required');
  if (!projectId) throw new Error('Project ID is required');
  
  const token = await getAuthToken();
  if (!token) throw new Error('Authentication required');
  
  console.log(`Batch processing ${linkedinUrls.length} profiles for project ${projectId}`);
  
  try {
    // Process in small batches of 5 for reliability
    const results = [];
    const batchSize = 5;
    
    for (let i = 0; i < linkedinUrls.length; i += batchSize) {
      const batch = linkedinUrls.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(linkedinUrls.length/batchSize)}`);
      
      // Make API request for this batch
      const response = await fetch(`${API_BASE_URL}/api/batch-scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          linkedin_urls: batch,
          project_id: projectId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const batchResult = await response.json();
      
      // Add batch results to overall results
      if (batchResult.profiles) {
        results.push(...batchResult.profiles);
      }
      
      // Short delay between batches
      if (i + batchSize < linkedinUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return {
      status: "success",
      total: linkedinUrls.length,
      successful: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status !== "success").length,
      profiles: results
    };
  } catch (error) {
    console.error(`Batch processing error:`, error);
    return {
      status: "error",
      message: error.message
    };
  }
}

// Export functions
window.PharmaTalentAPI = {
  scrapeProfile,
  batchScrapeProfiles
};