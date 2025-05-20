/**
 * LinkedIn Recruiter Pipeline Scraper 
 * This is a self-contained script that can be injected into LinkedIn Recruiter pages
 * to extract profile URLs and send them to your API.
 * 
 * Features:
 * - Extracts all profile URLs from LinkedIn Recruiter search results
 * - Works with pagination to scrape multiple pages
 * - Sends extracted profiles to your API with proper project ID
 * - Visual UI with progress tracking
 */

(function() {
  // Configuration
  const API_BASE_URL = 'https://linkedin-profile-scraper.replit.app';
  const MAX_BATCH_SIZE = 5; // Process profiles in small batches for reliability
  
  // State tracking
  const profilesFound = new Set();
  const profilesProcessed = new Set();
  const resultsTracking = [];
  let selectedProjectId = null;
  let selectedProjectName = null;
  let isRunning = false;
  let uiElement = null;
  
  // Utility functions
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Get authentication token from storage
  const getAuthToken = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get('pt_auth_token', (result) => {
        resolve(result.pt_auth_token || null);
      });
    });
  };
  
  // Get project info from storage
  const getProjectInfo = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pt_selected_project', 'pt_selected_project_name'], (result) => {
        resolve({
          id: result.pt_selected_project || null,
          name: result.pt_selected_project_name || null
        });
      });
    });
  };
  
  // Create UI to show progress
  const createUI = () => {
    // Remove existing UI if present
    const existingUI = document.getElementById('pipeline-scraper-ui');
    if (existingUI) existingUI.remove();
    
    // Create UI container
    const ui = document.createElement('div');
    ui.id = 'pipeline-scraper-ui';
    ui.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      width: 300px;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
    `;
    
    // Create header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid #555;
      padding-bottom: 10px;
    `;
    
    const title = document.createElement('h2');
    title.innerText = 'LinkedIn Pipeline Scraper';
    title.style.cssText = `margin: 0; font-size: 18px;`;
    
    const closeButton = document.createElement('button');
    closeButton.innerText = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    `;
    closeButton.onclick = () => {
      ui.remove();
      isRunning = false;
    };
    
    header.appendChild(title);
    header.appendChild(closeButton);
    ui.appendChild(header);
    
    // Project info section
    const projectInfo = document.createElement('div');
    projectInfo.innerHTML = `
      <div>Selected Project: <strong id="project-name">Loading...</strong></div>
      <div>Project ID: <span id="project-id" style="font-size: 12px; word-break: break-all;">Loading...</span></div>
    `;
    projectInfo.style.cssText = `margin-bottom: 15px;`;
    ui.appendChild(projectInfo);
    
    // Status section
    const statusElement = document.createElement('div');
    statusElement.id = 'status-message';
    statusElement.innerText = 'Initializing...';
    statusElement.style.cssText = `margin-bottom: 10px; font-weight: bold;`;
    ui.appendChild(statusElement);
    
    // Profile counts
    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `margin-bottom: 15px;`;
    
    const profilesFoundElement = document.createElement('div');
    profilesFoundElement.id = 'profiles-found';
    profilesFoundElement.innerText = 'Profiles found: 0';
    
    const profilesProcessedElement = document.createElement('div');
    profilesProcessedElement.id = 'profiles-processed';
    profilesProcessedElement.innerText = 'Profiles processed: 0';
    
    statsContainer.appendChild(profilesFoundElement);
    statsContainer.appendChild(profilesProcessedElement);
    ui.appendChild(statsContainer);
    
    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      background-color: #444;
      height: 20px;
      border-radius: 10px;
      margin-bottom: 15px;
    `;
    
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.cssText = `
      width: 0%;
      height: 100%;
      background-color: #4CAF50;
      border-radius: 10px;
      transition: width 0.3s;
    `;
    
    progressContainer.appendChild(progressBar);
    ui.appendChild(progressContainer);
    
    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
    `;
    
    const stopButton = document.createElement('button');
    stopButton.innerText = 'Stop';
    stopButton.style.cssText = `
      background: #e74c3c;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 3px;
      cursor: pointer;
    `;
    stopButton.onclick = () => {
      isRunning = false;
      updateStatus('Stopped by user');
    };
    
    const viewResultsButton = document.createElement('button');
    viewResultsButton.innerText = 'View Results';
    viewResultsButton.style.cssText = `
      background: #3498db;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 3px;
      cursor: pointer;
    `;
    viewResultsButton.onclick = () => {
      window.open(`${API_BASE_URL}/admin`, '_blank');
    };
    
    buttonContainer.appendChild(stopButton);
    buttonContainer.appendChild(viewResultsButton);
    ui.appendChild(buttonContainer);
    
    // Add to page
    document.body.appendChild(ui);
    uiElement = ui;
    
    return ui;
  };
  
  // UI update functions
  const updateStatus = (message) => {
    const element = document.getElementById('status-message');
    if (element) element.innerText = message;
    console.log(`[Pipeline Scraper] ${message}`);
  };
  
  const updateProfilesFound = (count) => {
    const element = document.getElementById('profiles-found');
    if (element) element.innerText = `Profiles found: ${count}`;
  };
  
  const updateProfilesProcessed = (count) => {
    const element = document.getElementById('profiles-processed');
    if (element) element.innerText = `Profiles processed: ${count}`;
  };
  
  const updateProgressBar = (percentage) => {
    const element = document.getElementById('progress-bar');
    if (element) element.style.width = `${percentage}%`;
  };
  
  const updateProjectInfo = (name, id) => {
    const nameElement = document.getElementById('project-name');
    const idElement = document.getElementById('project-id');
    
    if (nameElement) nameElement.innerText = name || 'None';
    if (idElement) idElement.innerText = id || 'None';
  };
  
  // Scroll to load all content
  async function scrollToLoadAllProfiles() {
    updateStatus('Scrolling to load all profiles...');
    
    let lastHeight = document.body.scrollHeight;
    let unchangedCount = 0;
    
    for (let i = 0; i < 20; i++) {  // Limit to 20 scrolls
      window.scrollTo(0, document.body.scrollHeight);
      await wait(1000);
      
      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        unchangedCount++;
        if (unchangedCount >= 3) break;  // If height stayed the same for 3 times, we're at the bottom
      } else {
        unchangedCount = 0;
      }
      
      lastHeight = newHeight;
    }
    
    window.scrollTo(0, 0);
    await wait(500);
    updateStatus('Scroll complete, extracting profiles...');
  }
  
  // Extract profile IDs from page
  function extractProfileIds() {
    updateStatus('Extracting profile IDs...');
    
    const newIds = new Set();
    
    // Look for profile elements using multiple selectors for reliability
    // This covers different Recruiter page layouts
    const profileElements = document.querySelectorAll([
      'a[href*="/talent/profile/"]',                    // Recruiter profile links
      'a[href*="/recruiter/profile/"]',                 // Alternate recruiter links
      'a[href*="linkedin.com/talent/profile/"]',        // Full URLs
      'a[href*="linkedin.com/recruiter/profile/"]',     // Full URLs alternate
      '[data-entity-urn*="profile:"]',                  // Data attribute with profile URN
      'li[data-chameleon-result-urn*="profile:"]'       // List items with profile URN
    ].join(','));
    
    profileElements.forEach((element) => {
      try {
        let profileId = null;
        
        // Extract ID from href
        if (element.href) {
          // Typical format: /talent/profile/AEM...
          const match = element.href.match(/\/profile\/([^/?#]+)/);
          if (match && match[1]) {
            profileId = match[1];
          }
        }
        
        // Try data attribute if href didn't work
        if (!profileId && element.getAttribute('data-entity-urn')) {
          const urn = element.getAttribute('data-entity-urn');
          if (urn.includes('profile:')) {
            profileId = urn.split('profile:')[1];
          }
        }
        
        // Try result URN if other methods failed
        if (!profileId && element.getAttribute('data-chameleon-result-urn')) {
          const urn = element.getAttribute('data-chameleon-result-urn');
          if (urn.includes('profile:')) {
            profileId = urn.split('profile:')[1];
          }
        }
        
        // If we found an ID and haven't processed it yet, add it
        if (profileId && !profilesFound.has(profileId)) {
          newIds.add(profileId);
          profilesFound.add(profileId);
        }
      } catch (error) {
        console.error('Error extracting profile ID:', error);
      }
    });
    
    updateStatus(`Found ${newIds.size} new profile IDs (total: ${profilesFound.size})`);
    updateProfilesFound(profilesFound.size);
    
    return Array.from(newIds);
  }
  
  // Convert LinkedIn ID to profile URL
  function convertIdToProfileUrl(profileId) {
    // If already a URL, return it
    if (profileId.includes('linkedin.com/')) {
      return profileId;
    }
    
    // Generate LinkedIn URL from ID
    return `https://www.linkedin.com/in/uid-${profileId}`;
  }
  
  // Process a single LinkedIn profile
  async function processIndividualProfile(profileUrl, projectId) {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please log in through the extension popup.');
    }
    
    try {
      console.log(`Processing profile: ${profileUrl} for project ${projectId}`);
      
      // Call the API to scrape the profile
      const response = await fetch(`${API_BASE_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          linkedin_url: profileUrl,
          project_id: projectId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        linkedin_url: profileUrl,
        status: "success",
        profile_id: result.profile_id,
        message: result.message || "Profile processed successfully"
      };
    } catch (error) {
      console.error(`Error processing profile ${profileUrl}:`, error);
      return {
        linkedin_url: profileUrl,
        status: "error",
        message: error.message
      };
    }
  }
  
  // Process all found profile IDs
  async function processAllProfileIds(ids) {
    if (ids.length === 0) return true;
    
    updateStatus(`Processing ${ids.length} profiles...`);
    
    // Convert IDs to LinkedIn URLs
    const profileUrls = ids.map(id => convertIdToProfileUrl(id));
    
    // Break into batches for better reliability
    const batches = [];
    for (let i = 0; i < profileUrls.length; i += MAX_BATCH_SIZE) {
      batches.push(profileUrls.slice(i, i + MAX_BATCH_SIZE));
    }
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      if (!isRunning) return false;
      
      const batchUrls = batches[i];
      updateStatus(`Processing batch ${i+1}/${batches.length} (${batchUrls.length} profiles)`);
      
      // Process each profile in this batch
      for (let j = 0; j < batchUrls.length; j++) {
        if (!isRunning) return false;
        
        const url = batchUrls[j];
        updateStatus(`Processing profile ${j+1}/${batchUrls.length} in batch ${i+1}/${batches.length}`);
        
        try {
          // Process individual profile
          const result = await processIndividualProfile(url, selectedProjectId);
          
          // Track result
          resultsTracking.push(result);
          profilesProcessed.add(url);
          
          // Update UI
          updateProfilesProcessed(profilesProcessed.size);
          
          // Short delay between profiles
          await wait(1500);
        } catch (error) {
          console.error(`Error processing profile ${url}:`, error);
          // Continue with next profile instead of stopping the entire process
        }
      }
      
      // Update progress bar
      const percentComplete = ((i + 1) / batches.length) * 100;
      updateProgressBar(percentComplete);
      
      // Short delay between batches
      await wait(2000);
    }
    
    return true;
  }
  
  // Go to next page of results
  function goToNextPage() {
    try {
      // Try to find and click the "Next" button
      const nextButton = document.querySelector('button.artdeco-pagination__button--next:not([disabled])');
      if (nextButton) {
        nextButton.click();
        return true;
      }
      
      // Try alternate next button selector
      const alternateNextButton = document.querySelector('a[data-test-pagination-page-btn="next"]:not([disabled]), button[data-test-pagination-next-btn]:not([disabled])');
      if (alternateNextButton) {
        alternateNextButton.click();
        return true;
      }
    } catch (error) {
      console.error('Error navigating to next page:', error);
    }
    
    return false;
  }
  
  // Main scraping process
  async function startPipelineScraper() {
    if (isRunning) return;
    isRunning = true;
    
    // Reset counters for a new run
    profilesFound.clear();
    profilesProcessed.clear();
    resultsTracking.length = 0;
    
    updateStatus('Pipeline scraper activated! Scanning for profiles...');
    updateProgressBar(0);
    
    let pageCount = 1;
    let hasMorePages = true;
    
    // Scrape up to 10 pages maximum
    while (isRunning && hasMorePages && pageCount <= 10) {
      updateStatus(`Scanning page ${pageCount}...`);
      
      // Scroll to load all profiles on the current page
      await scrollToLoadAllProfiles();
      
      // Extract profile IDs
      const newIds = extractProfileIds();
      
      // Process profiles found on this page
      if (newIds.length > 0) {
        await processAllProfileIds(newIds);
      }
      
      // Try to move to the next page
      if (goToNextPage()) {
        pageCount++;
        await wait(3000);  // Wait for the new page to load
      } else {
        hasMorePages = false;
      }
    }
    
    updateStatus(`Complete! Found ${profilesFound.size} profiles, processed ${profilesProcessed.size}.`);
    updateProgressBar(100);
  }
  
  // Initialize and start scraping
  async function initialize() {
    try {
      // Create UI first
      createUI();
      updateStatus('Initializing pipeline scraper...');
      
      // Get authentication token
      updateStatus('Checking authentication...');
      const token = await getAuthToken();
      
      if (!token) {
        updateStatus('Not authenticated. Please log in through the extension popup.');
        return;
      }
      
      // Get project info
      updateStatus('Getting selected project...');
      const project = await getProjectInfo();
      
      if (!project.id) {
        updateStatus('No project selected. Please select a project in the extension popup.');
        return;
      }
      
      selectedProjectId = project.id;
      selectedProjectName = project.name;
      updateProjectInfo(project.name, project.id);
      
      // Start the scraping process
      updateStatus('Starting pipeline scan...');
      await startPipelineScraper();
    } catch (error) {
      console.error('Error during initialization:', error);
      updateStatus(`Error: ${error.message}`);
    }
  }
  
  // Start the scraper
  initialize();
})();