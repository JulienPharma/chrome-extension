/**
 * PharmaTalent LinkedIn Scraper - Popup Script
 * Manages the popup interface and functionality
 */

// Element references
const loginContainer = document.getElementById('login-container');
const mainContainer = document.getElementById('main-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const loginStatus = document.getElementById('login-status');
const projectSelect = document.getElementById('project-select');
const scrapeButton = document.getElementById('scrape-button');
const pipelineButton = document.getElementById('pipeline-button');
const scrapeStatus = document.getElementById('scrape-status');
const currentUrlElement = document.getElementById('current-url');
const logoutButton = document.getElementById('logout-button');
const optionsButton = document.getElementById('options-button');

// Initialize auth and UI
let auth;
let currentTabUrl = '';
let currentTabId = null;

// Initialize on popup load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize auth with API base URL from config
    auth = new Auth(CONFIG.API_BASE_URL || 'https://linkedin-profile-scraper.replit.app');
    
    // Check if user is authenticated
    const isAuthenticated = await auth.isAuthenticated();
    
    // Show appropriate container based on auth status
    loginContainer.classList.toggle('hidden', isAuthenticated);
    mainContainer.classList.toggle('hidden', !isAuthenticated);
    
    // If authenticated, load projects and get current tab URL
    if (isAuthenticated) {
      loadProjects();
      getCurrentTab();
    }
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    showStatus(loginStatus, `Error: ${error.message}`, 'error');
  }
});

// Set up all event listeners
function setupEventListeners() {
  // Login button
  loginButton.addEventListener('click', handleLogin);
  
  // Login form enter key
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  
  // Scrape button
  scrapeButton.addEventListener('click', handleScrape);
  
  // Pipeline button
  pipelineButton.addEventListener('click', handlePipelineScrape);
  
  // Logout button
  logoutButton.addEventListener('click', handleLogout);
  
  // Options button
  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Project select change - save selection
  projectSelect.addEventListener('change', handleProjectChange);
}

// Handle login form submission
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!email || !password) {
    showStatus(loginStatus, 'Please enter both email and password', 'error');
    return;
  }
  
  try {
    loginStatus.classList.remove('hidden');
    loginStatus.textContent = 'Logging in...';
    loginStatus.className = 'status info';
    
    // Attempt to login
    const result = await auth.login(email, password);
    
    if (result.authenticated) {
      // Success - reload popup
      window.location.reload();
    } else {
      showStatus(loginStatus, 'Invalid credentials', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showStatus(loginStatus, `Error: ${error.message}`, 'error');
  }
}

// Load projects from API
async function loadProjects() {
  try {
    // Clear existing options
    projectSelect.innerHTML = '<option value="">Select a project</option>';
    
    // Fetch projects
    const projects = await auth.getProjects();
    
    if (projects && projects.length > 0) {
      // Add project options
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
      });
      
      // Try to select previously selected project
      chrome.storage.local.get(['pt_selected_project'], (result) => {
        if (result.pt_selected_project) {
          projectSelect.value = result.pt_selected_project;
        }
      });
    } else {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No projects available";
      projectSelect.appendChild(option);
    }
  } catch (error) {
    console.error('Error loading projects:', error);
    const option = document.createElement('option');
    option.value = "";
    option.textContent = "Error loading projects";
    projectSelect.appendChild(option);
  }
}

// Handle project selection change
function handleProjectChange() {
  const projectId = projectSelect.value;
  const projectName = projectSelect.options[projectSelect.selectedIndex].text;
  
  if (projectId) {
    // Save selected project
    chrome.storage.local.set({
      pt_selected_project: projectId,
      pt_selected_project_name: projectName
    });
    
    console.log(`Selected project: ${projectName} (${projectId})`);
  }
}

// Get current tab URL
async function getCurrentTab() {
  try {
    // Query for the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length > 0) {
      currentTabUrl = tabs[0].url;
      currentTabId = tabs[0].id;
      
      // Display URL in the popup
      currentUrlElement.textContent = currentTabUrl ? 
        (currentTabUrl.length > 30 ? currentTabUrl.substring(0, 30) + '...' : currentTabUrl) : 
        'No active tab';
      
      // Enable/disable scrape button based on whether URL is a LinkedIn profile
      const isLinkedInProfile = currentTabUrl && 
        (currentTabUrl.includes('linkedin.com/in/') || 
         currentTabUrl.includes('/talent/profile/') || 
         currentTabUrl.includes('/recruiter/profile/'));
      
      scrapeButton.disabled = !isLinkedInProfile;
      
      // Enable/disable pipeline button based on whether URL is a LinkedIn search results page
      const isLinkedInSearch = currentTabUrl && 
        (currentTabUrl.includes('linkedin.com/talent/') || 
         currentTabUrl.includes('linkedin.com/recruiter/'));
      
      pipelineButton.disabled = !isLinkedInSearch;
    }
  } catch (error) {
    console.error('Error getting current tab:', error);
    currentUrlElement.textContent = 'Error getting tab info';
  }
}

// Handle scrape button click
async function handleScrape() {
  // Check if a project is selected
  const projectId = projectSelect.value;
  if (!projectId) {
    showStatus(scrapeStatus, 'Please select a project first', 'error');
    return;
  }
  
  // Check if current tab is a LinkedIn profile
  if (!currentTabUrl || 
      !(currentTabUrl.includes('linkedin.com/in/') || 
        currentTabUrl.includes('/talent/profile/') || 
        currentTabUrl.includes('/recruiter/profile/'))) {
    showStatus(scrapeStatus, 'Not a LinkedIn profile page', 'error');
    return;
  }
  
  try {
    // Show status
    showStatus(scrapeStatus, 'Scraping profile...', 'info');
    
    // Execute scraping script on the current tab
    chrome.tabs.sendMessage(currentTabId, {
      action: 'scrapeProfile',
      projectId: projectId
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Handle error - content script might not be loaded
        injectScriptAndScrape(projectId);
        return;
      }
      
      if (response && response.status === 'success') {
        showStatus(scrapeStatus, 'Profile scraped successfully!', 'success');
      } else {
        showStatus(scrapeStatus, 
          response && response.message ? response.message : 'Failed to scrape profile', 
          'error');
      }
    });
  } catch (error) {
    console.error('Scrape error:', error);
    showStatus(scrapeStatus, `Error: ${error.message}`, 'error');
  }
}

// Handle pipeline scrape button click
async function handlePipelineScrape() {
  // Check if a project is selected
  const projectId = projectSelect.value;
  if (!projectId) {
    showStatus(scrapeStatus, 'Please select a project first', 'error');
    return;
  }
  
  // Check if current tab is a LinkedIn search page
  if (!currentTabUrl || 
      !(currentTabUrl.includes('linkedin.com/talent/') || 
        currentTabUrl.includes('linkedin.com/recruiter/'))) {
    showStatus(scrapeStatus, 'Not a LinkedIn Recruiter page', 'error');
    return;
  }
  
  try {
    // Show status
    showStatus(scrapeStatus, 'Starting pipeline scraper...', 'info');
    
    // Execute pipeline script on the current tab
    chrome.scripting.executeScript({
      target: {tabId: currentTabId},
      files: ['pipeline-scraper.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Script injection error:', chrome.runtime.lastError);
        showStatus(scrapeStatus, `Error: ${chrome.runtime.lastError.message}`, 'error');
      } else {
        showStatus(scrapeStatus, 'Pipeline scraper injected successfully', 'success');
      }
    });
  } catch (error) {
    console.error('Pipeline error:', error);
    showStatus(scrapeStatus, `Error: ${error.message}`, 'error');
  }
}

// Inject script if content script isn't loaded
function injectScriptAndScrape(projectId) {
  // Execute script to scrape the profile
  chrome.scripting.executeScript({
    target: {tabId: currentTabId},
    func: (profileUrl, projId) => {
      // Get token from storage
      chrome.storage.local.get(['pt_auth_token', 'pt_base_url'], async (result) => {
        const token = result.pt_auth_token;
        const baseUrl = result.pt_base_url || 'https://linkedin-profile-scraper.replit.app';
        
        if (!token) {
          // No token found
          return {status: 'error', message: 'Not authenticated'};
        }
        
        try {
          // Make API request
          const response = await fetch(`${baseUrl}/api/scrape`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              linkedin_url: profileUrl,
              project_id: projId
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error (${response.status}): ${errorText}`);
          }
          
          const result = await response.json();
          
          // Show success message
          alert('Profile scraped successfully!');
          return {status: 'success', message: 'Profile scraped successfully'};
        } catch (error) {
          // Show error message
          alert(`Error: ${error.message}`);
          return {status: 'error', message: error.message};
        }
      });
    },
    args: [currentTabUrl, projectId]
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('Script execution error:', chrome.runtime.lastError);
      showStatus(scrapeStatus, `Error: ${chrome.runtime.lastError.message}`, 'error');
    } else if (results && results[0]) {
      const result = results[0].result;
      if (result && result.status === 'success') {
        showStatus(scrapeStatus, 'Profile scraped successfully!', 'success');
      } else {
        showStatus(scrapeStatus, 
          result && result.message ? result.message : 'Failed to scrape profile', 
          'error');
      }
    }
  });
}

// Handle logout button click
function handleLogout() {
  // Clear tokens and reload popup
  auth.logout();
  window.location.reload();
}

// Helper to show status messages
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
  element.classList.remove('hidden');
  
  // Auto-hide success and info messages after 5 seconds
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      element.classList.add('hidden');
    }, 5000);
  }
}