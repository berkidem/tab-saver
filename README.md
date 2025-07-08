# Tab Saver to Markdown

A Firefox browser extension that saves all your open tabs to a markdown file with rich metadata and tab relationships. It allows one to hoard tabs in a way that is relatively easy to archive.

### Why Did I Need This?

I have a tab problem; I regularly use dozens of browser windows with hundreds of tabs. To make the matters worse, many of my browsing start in private windows; at that point, I don't know how deep I will dive yet. Often enough, these deep dives graduate to being rabbitholes where I can claim residence for tax purposes. However, I am afraid to close them at that point because these sites are not in my browsing history, due to private browsing. Of course, there are ways to save all the tabs in a bookmark folder and such but (i) bookmarks are not easy to work with, (ii) without notes and annotations, lists become useless hoards. (See [here](https://en.wikipedia.org/wiki/The_Infinity_of_Lists) for some lists, and [here](https://en.wikipedia.org/wiki/La_Ricerca_della_Lingua_Perfetta_nella_Cultura_Europea) for more context on their uselessness.)

So, I wanted to be able to save the tabs in such a way that I would have the option to immediately add some notes about them; I knew that once it was saved without some annotation, it would be much less useful and unlikely to be annotated later on (without much work). I tried to find an existing tool but in the end, I vibe coded this.

## Features

### Core Functionality
- **Save All Tabs**: Export all open tabs in the current window to a structured markdown file
- **Rich Metadata**: Captures detailed information about each tab including:
  - First opened timestamp
  - Number of times accessed
  - Total active time spent on each tab
  - Navigation history (last 3 previous URLs)
  - Tab status (active, pinned, audio playing)
  - Container information (if using Firefox containers)

### Advanced Tab Tracking
- **Parent-Child Relationships**: Tracks which tabs opened other tabs and displays the hierarchy
- **Persistent Storage**: Tab metadata persists across browser sessions
- **Real-time Monitoring**: Continuously tracks tab usage patterns in the background

### Multiple Save Options
- **Editor Mode** (default): Opens an interactive editor where you can:
  - Edit the markdown content before saving
  - Add personal notes and annotations
  - Preview the formatted output in real-time
  - Auto-save drafts locally
- **Direct Download**: Instantly download the markdown file
- **Clipboard Copy**: Copy the markdown content to your clipboard

### User Experience
- **Keyboard Shortcut**: Quick access with `Ctrl+Alt+M`
- **Tab Numbering**: Preserves left-to-right tab order with position numbers
- **Auto-generated Filenames**: Timestamped filenames for easy organization/lookup; can be changed in the editor view

## Installation

Since this extension is currently for personal use and not yet published to the Mozilla Add-ons store, you'll need to install it manually:

### Step 1: Download the Source Code
#### Option 1: Download from GitHub Releases
1. Go to the [Releases page](https://github.com/berkidem/tab-saver/releases)
2. Download the latest `.zip` file
3. Rename it to `tab-saver.xpi` (or any name ending in `.xpi`)
4. Jump to Step 2 below to install in Firefox

#### Option 2: Manual Installation

##### Step 1a: Download the Source Code
1. Download or clone this repository to your local machine
2. Ensure you have all the files in a single folder

##### Step 1b: Create the Extension Package
1. Select all files in the extension folder (not the folder itself)
2. Right-click and choose "Send to" → "Compressed (zipped) folder" (Windows) or use your preferred zip utility
3. Rename the resulting `.zip` file to have a `.xpi` extension (e.g., `tab-saver.xpi`)

#### Step 2: Install in Firefox
1. Open Firefox
2. Navigate to `about:addons` or go to Menu --> Add-ons and Themes
3. Click the gear icon (⚙️) in the top-right corner
4. Select "Install Add-on From File..."
5. Choose your `.xpi` file
6. Click "Add" when prompted

NB: For step 2 to work as expected, you might need to go to `about:config`, search for `xpinstall` and set `xpinstall.signatures.required` to `false`. If this doesn't work, you might also need to switch to the Developer Edition of Firefox. This problem will be solved when I submit this add-on to Firefox's marketplace but I want to test it more extensively before that. I tested it on Firefox version 128.12.0esr.

#### Step 4: Grant Permissions
The extension will request permissions to:
- Access your tabs
- Download files
- Store data locally
- Show notifications

These permissions are necessary for the extension to function properly; without knowing the tabs, we can't save them.

## Usage

### Basic Usage
1. **Click the extension icon** in your toolbar, or
2. **Use the keyboard shortcut** `Ctrl+Alt+M`, or
3. **Right-click** and look for the extension in the context menu

### Customization
- Click the "Change settings" link in the popup to access different save modes
- Choose between Editor, Direct Download, or Clipboard copy methods

### Editor Features
When using the default editor mode:
- **Edit content**: Modify the markdown before saving
- **Add notes**: Each tab has a "Notes:" field for your annotations
- **Live preview**: See how your markdown will look when rendered
- **Auto-save**: Your edits are automatically saved as drafts

## Screenshots

![Editor - Preview](/images/editor-1.png)

![Editor - Statistics](/images/editor-2.png)

![Editor Without Preview](/images/editor-3.png)

## Output Format

The extension generates a structured markdown file with:

```markdown
# Saved Tabs - [Date and Time]

**Total tabs:** X
**Window:** Current window

---

1. [Tab Title](URL) [STATUS]
   - First opened: Date Time
   - Times accessed: X
   - Total active time: Xm Xs
   - Last 3 previous URLs:
       • Previous URL (Time)
   - Notes: 
   ↳ Child tab:
     2. [Child Tab Title](URL)

## Statistics
- Total tabs: X
- Pinned tabs: X
- Tabs with audio: X
- Total active time: Xm Xs
```

## Future Plans

This extension may be submitted to the Mozilla Add-ons store in the future to make installation easier. For now, it's designed for personal use and manual installation. In the future, I might make it compatible with more browsers, and also possibly add an option to open a window from a file.

## Contributing

This is currently a personal project, but suggestions and feedback are welcome through GitHub issues.

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Privacy & Data Collection
This extension collects and stores **locally**:
- Tab URLs and titles
- Access times and usage patterns  
- Navigation history

**Important:** All data stays on your device. Nothing is transmitted to external servers.

---