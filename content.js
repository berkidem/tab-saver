// Content script for extracting page metadata
// Currently minimal, but can be enhanced to extract:
// - meta descriptions
// - Open Graph tags
// - structured data
// - reading time estimates

// Listen for requests from background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMetadata') {
    const metadata = {
      description: document.querySelector('meta[name="description"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
      author: document.querySelector('meta[name="author"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      // Add more metadata extraction as needed
    };
    
    sendResponse(metadata);
  }
});