# 🎥 YouTube Video Summarizer with Gemini

A powerful Firefox browser extension that seamlessly integrates YouTube with Google's Gemini AI to provide instant video summaries. Get the key insights from any YouTube video without watching the entire content!

![Extension Version](https://img.shields.io/badge/version-1.2-blue.svg)
![Firefox Support](https://img.shields.io/badge/firefox-supported-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **🚀 One-Click Summarization**: Click the extension icon on any YouTube video page to instantly open Gemini with a pre-filled summarization prompt
- **🖱️ Right-Click Context Menu**: Right-click on video thumbnails anywhere on YouTube to summarize videos without navigating to them
- **📱 Sidebar Integration**: Opens Gemini in a convenient sidebar panel for seamless multitasking
- **🎯 Smart Detection**: Intelligently detects video URLs from thumbnails, links, and page context
- **⚡ Automatic Prompt Injection**: Automatically sends the video URL to Gemini with optimized prompting
- **🔔 Visual Feedback**: Provides notifications to confirm actions and guide user experience

## 🛠️ Installation

### From Firefox Add-ons Store

*Coming soon - currently in development*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on..."
5. Select the `manifest.json` file from the extension directory
6. The extension will be loaded and ready to use!

## 📖 How to Use

### Method 1: Page Action Icon

1. Navigate to any YouTube video page (`youtube.com/watch?v=...`)
2. Look for the extension icon in the address bar
3. Click the icon to open Gemini in the sidebar
4. Gemini will automatically receive the video URL for summarization

### Method 2: Right-Click Context Menu

1. Visit any YouTube page (homepage, search results, channel pages, etc.)
2. Right-click on any video thumbnail
3. Select "Summarize with Gemini" from the context menu
4. The sidebar will open with Gemini ready to summarize the selected video

### Method 3: Direct Sidebar Access

1. Click the extension icon in the Firefox toolbar
2. If you're on a YouTube video page, it will automatically prepare for summarization
3. Otherwise, navigate to a YouTube video first

## 🔧 Technical Details

### Architecture

- **Manifest Version**: 2 (Firefox WebExtensions API)
- **Background Script**: Handles page action visibility, context menu creation, and webRequest interception
- **Content Script**: Detects video thumbnails and extracts URLs from YouTube's dynamic content
- **Sidebar**: Lightweight interface that redirects to Gemini with automatic prompt injection

### Key Technologies

- **WebExtensions API**: Cross-browser extension development
- **WebRequest API**: HTTP header injection for seamless Gemini integration
- **Context Menus API**: Right-click functionality
- **Notifications API**: User feedback and confirmation
- **Sidebar API**: Integrated panel experience

### Permissions Used

- `activeTab`: Access current tab information
- `tabs`: Manage tab states and navigation
- `webRequest` & `webRequestBlocking`: Inject custom headers for Gemini integration  
- `notifications`: Provide user feedback
- `contextMenus`: Right-click menu functionality
- `*://gemini.google.com/*`: Communicate with Gemini AI service

## 📁 Project Structure

```
yt-gemini-vid-summarizer/
├── manifest.json          # Extension configuration
├── background.js          # Background script (event handling)
├── content.js            # Content script (YouTube integration)
├── sidebar.html          # Sidebar interface
├── sidebar.js            # Sidebar functionality
├── icons/
│   └── icon-48.png       # Extension icon
└── README.md             # This file
```

## 🚀 Development

### Prerequisites

- Firefox Developer Edition (recommended)
- Basic knowledge of WebExtensions API
- Access to Google Gemini

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/yt-gemini-vid-summarizer.git
   cd yt-gemini-vid-summarizer
   ```

2. Load the extension in Firefox:
   - Open `about:debugging`
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

3. Make your changes and reload the extension as needed

### Key Components

#### Background Script (`background.js`)

- Manages page action visibility based on current tab
- Creates and handles context menu interactions
- Injects custom headers for Gemini communication
- Handles video URL storage and sidebar communication

#### Content Script (`content.js`)

- Runs on all YouTube pages
- Detects right-clicks on video elements
- Extracts video IDs from various URL formats
- Communicates video URLs back to background script

#### Sidebar (`sidebar.html` + `sidebar.js`)

- Provides loading interface
- Automatically redirects to Gemini
- Handles error states and user feedback

## 🏗️ CI/CD & Automation

This project uses GitHub Actions to automatically build and package the extension for distribution.

### Automated Building

Every push to the main branch and pull request triggers our CI/CD pipeline that:

1. **Validates** the extension using `web-ext lint`
2. **Builds** browser-specific packages using the official `web-ext` tool
3. **Creates** ready-to-install ZIP files for both Firefox and Chrome
4. **Uploads** artifacts for easy download

### Download Pre-built Extensions

Instead of building manually, you can download pre-built extension packages:

1. Go to the [Actions tab](../../actions) in this repository
2. Click on the latest successful "Package Extension" workflow run
3. Download the artifact for your browser:
   - **Firefox**: `firefox-extension-v{version}.zip`
   - **Chrome**: `chrome-extension-v{version}.zip`

### Build Status

![Build Status](https://github.com/yourusername/yt-gemini-vid-summarizer/workflows/Package%20Extension/badge.svg)

### Installation from Pre-built Package

#### Firefox
1. Download the Firefox artifact
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Select the downloaded ZIP file

#### Chrome/Edge
1. Download the Chrome artifact
2. Extract the ZIP file to a folder
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

## 🤝 Contributing

Contributions are welcome! Here are some ways you can help:

- 🐛 **Bug Reports**: Found an issue? Please open a GitHub issue with details
- 💡 **Feature Requests**: Have an idea? We'd love to hear it
- 🔧 **Code Contributions**: Submit pull requests for improvements
- 📚 **Documentation**: Help improve our docs and guides

### Development Guidelines

1. Follow existing code style and structure
2. Test thoroughly on different YouTube page types
3. Ensure compatibility with latest Firefox versions
4. Update documentation for any new features

## ⚠️ Known Limitations

- Currently Firefox-only (Chrome support planned)
- Requires manual navigation to Gemini (due to browser security restrictions)
- Dependent on Gemini's availability and rate limits
- Some YouTube layouts may affect thumbnail detection accuracy

## 🔒 Privacy & Security

- The extension only processes YouTube video URLs
- No personal data is stored or transmitted
- All communication with Gemini follows standard web protocols
- Extension permissions are minimal and purposeful

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for productivity and learning**

*If you find this extension helpful, please consider giving it a star ⭐ and sharing it with others!*
