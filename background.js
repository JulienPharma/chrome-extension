/**
 * Background script for PharmaTalent LinkedIn Scraper
 * Handles background tasks and messaging
 */

// Store selected project in memory for quick access
let selectedProject = null;
let selectedProjectName = null;

// Initialize on extension load
chrome.runtime.onInstalled.addListener(() => {
  console.log('PharmaTalent LinkedIn Scraper installed');
  
  // Load selected project from storage
  chrome.storage.local.get(['pt_selected_project', 'pt_selected_project_name'], (result) => {
    selectedProject = result.pt_selected_project || null;
    selectedProjectName = result.pt_selected_project_name || null;
    console.log(`Loaded selected project: ${selectedProjectName || 'None'}`);
  });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  // Handle different message actions
  if (request.action === 'getSelectedProject') {
    // Return currently selected project
    chrome.storage.local.get(['pt_selected_project', 'pt_selected_project_name'], (result) => {
      sendResponse({
        projectId: result.pt_selected_project || null,
        projectName: result.pt_selected_project_name || null
      });
    });
    
    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
  
  else if (request.action === 'setSelectedProject') {
    // Update selected project
    selectedProject = request.projectId;
    selectedProjectName = request.projectName;
    
    // Store in persistent storage
    chrome.storage.local.set({
      pt_selected_project: request.projectId,
      pt_selected_project_name: request.projectName
    }, () => {
      console.log(`Selected project updated: ${request.projectName} (${request.projectId})`);
      sendResponse({ success: true });
    });
    
    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
  
  else if (request.action === 'startPipeline') {
    // Inject pipeline script
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['pipeline-scraper.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Pipeline script injection error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('Pipeline script injected successfully');
        sendResponse({ success: true });
      }
    });
    
    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
});