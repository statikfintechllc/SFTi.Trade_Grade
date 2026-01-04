# Installation Guide

## Quick Start (No Installation Required)

SFTi P.R.E.P is a Progressive Web App (PWA) that runs directly in your browser. No installation, build process, or dependencies required!

### Option 1: Open Locally

1. **Download or Clone Repository**
   ```bash
   git clone https://github.com/statikfintechllc/SFTi.Trade_Grade.git
   cd SFTi.Trade_Grade
   ```

2. **Open in Browser**
   - Double-click `index.html`
   - Or open with: `file:///path/to/index.html`

3. **Start Using**
   - App loads instantly
   - All features work locally
   - Data saved in browser storage

### Option 2: Serve with Web Server

For full PWA features (service worker, offline mode):

**Python:**
```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

**Node.js:**
```bash
npx http-server -p 8080
# Open http://localhost:8080
```

**PHP:**
```bash
php -S localhost:8080
# Open http://localhost:8080
```

---

## PWA Installation

### On Mobile (iOS/Android)

**iOS (Safari):**
1. Open app in Safari
2. Tap Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Name the app (default: "PREPARE Trading Journal")
5. Tap "Add"
6. App icon appears on home screen

**Android (Chrome):**
1. Open app in Chrome
2. Tap menu (three dots)
3. Tap "Add to Home Screen" or "Install App"
4. Confirm installation
5. App icon appears on home screen

### On Desktop

**Chrome/Edge:**
1. Open app in browser
2. Look for install icon in address bar (⊕ or computer icon)
3. Click icon
4. Click "Install" in popup
5. App opens in standalone window

**Firefox:**
- PWA installation not supported
- Can bookmark for quick access
- Use web app mode: `firefox --new-window --kiosk http://localhost:8080`

**Safari (macOS):**
- Limited PWA support
- Can "Add to Dock" for quick access

---

## Deployment Options

### Option 1: GitHub Pages (Free)

1. **Enable GitHub Pages**
   ```bash
   # Push your code to GitHub
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. **Configure Pages**
   - Go to repository Settings
   - Navigate to Pages section
   - Source: Deploy from branch
   - Branch: main, folder: / (root)
   - Save

3. **Access Your App**
   - URL: `https://yourusername.github.io/SFTi.Trade_Grade/`
   - Available in ~1 minute

### Option 2: Netlify (Free)

1. **Sign Up**
   - Visit [netlify.com](https://netlify.com)
   - Sign up with GitHub account

2. **Deploy**
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository
   - Build settings:
     - Build command: (leave empty)
     - Publish directory: `.` (root)
   - Deploy

3. **Access Your App**
   - URL: `https://your-site-name.netlify.app`
   - Custom domain available (free)

### Option 3: Vercel (Free)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd SFTi.Trade_Grade
   vercel
   ```

3. **Follow Prompts**
   - Link to existing project or create new
   - Deploy to production

4. **Access Your App**
   - URL provided in terminal
   - Custom domain available (free)

### Option 4: Self-Hosted Server

**Requirements:**
- Web server (Apache, Nginx, etc.)
- HTTPS (required for PWA features)

**Apache (.htaccess):**
```apache
# Enable service worker
<FilesMatch "sw.js">
  Header set Service-Worker-Allowed "/"
  Header set Cache-Control "no-cache"
</FilesMatch>

# Cache static assets
<FilesMatch "\.(jpg|jpeg|png|gif|svg|css|js|ico)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

**Nginx (nginx.conf):**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    root /var/www/SFTi.Trade_Grade;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(jpg|jpeg|png|gif|svg|css|js|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /sw.js {
        add_header Service-Worker-Allowed "/";
        add_header Cache-Control "no-cache";
    }
}
```

---

## Configuration

### GitHub Models API (Optional)

For AI Assistant features:

1. **Get API Token**
   - Visit [github.com/settings/tokens](https://github.com/settings/tokens)
   - Generate new token (classic)
   - Scopes: `read:packages` + model access
   - Copy token

2. **Configure in App**
   - Open app
   - Navigate to AI Assistant tab
   - Paste token in field
   - Click "Save Token"

### Customization (Optional)

**Edit Configuration:**

Open `index.html` and find the `CONFIG` object (around line 1668):

```javascript
const CONFIG = {
    MAX_SCREENSHOT_SIZE: 2 * 1024 * 1024, // 2MB
    MAX_GRADES_FOR_REVIEW: 10,
    MAX_GRADES_FOR_PATTERNS: 20,
    CHAT_MESSAGE_PREVIEW_LENGTH: 200,
    AI_MODEL: 'gpt-4o-mini',              // Default AI model
    AI_MAX_TOKENS: 1500,                  // Response length
    AI_TEMPERATURE: 0.7,                  // Creativity (0-1)
    API_ENDPOINT: 'https://models.inference.ai.azure.com/chat/completions'
};
```

**Customize Theme:**

Colors defined in `<style>` section (starting around line 17):

```css
/* Main theme colors */
--primary-color: #cc0000;     /* Red accent */
--bg-dark: #1a1a1a;          /* Dark background */
--bg-darker: #0d0d0d;        /* Darker background */
--text-light: #e0e0e0;       /* Light text */
```

---

## Browser Requirements

### Minimum Requirements

- **Chrome/Edge:** Version 80+
- **Firefox:** Version 75+
- **Safari:** Version 13+
- **Opera:** Version 67+

### Recommended

- **Chrome/Edge:** Latest version
- **Firefox:** Latest version
- **Safari:** Latest version (iOS 14+ for best PWA experience)

### Feature Support

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| Core App | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ❌ | ⚠️ Limited |
| Service Worker | ✅ | ✅ | ✅ |
| Local Storage | ✅ | ✅ | ✅ |
| File Upload | ✅ | ✅ | ✅ |
| AI Assistant | ✅ | ✅ | ✅ |

---

## Storage Requirements

### Browser Storage

- **Minimum:** 5MB (empty app)
- **Typical:** 10-20MB (with data)
- **Maximum:** ~50MB (with many screenshots)

### Data Stored Locally

- Trade grades and scores
- Trade plans and outcomes
- Screenshots (compressed)
- GitHub API token (encrypted)
- User preferences
- Chat history (temporary)

### Storage Management

**Check Available Space:**
```javascript
// Open browser console
navigator.storage.estimate().then(estimate => {
  console.log(`Used: ${estimate.usage / 1024 / 1024} MB`);
  console.log(`Quota: ${estimate.quota / 1024 / 1024} MB`);
});
```

**Clear Data:**
- Settings → Privacy → Clear browsing data
- Select "Local storage" and app domain
- Or use app's built-in clear function (if added)

---

## Offline Mode

### How It Works

1. **First Visit:**
   - Service worker registers
   - App assets cached
   - Ready for offline use

2. **Offline Usage:**
   - View/add/edit trades
   - All features work except AI
   - Data saved locally

3. **Online Sync:**
   - No automatic sync (local-only app)
   - AI features require connection
   - Export data manually if needed

### Testing Offline

1. **Chrome DevTools:**
   - Open DevTools (F12)
   - Network tab → Throttling → Offline
   - Reload page

2. **Firefox:**
   - File → Work Offline
   - Reload page

3. **Physical Test:**
   - Enable airplane mode
   - Access app
   - Try all features

---

## Troubleshooting

### App Won't Load

**Problem:** Blank page or errors

**Solutions:**
1. Check browser console for errors
2. Clear browser cache
3. Try different browser
4. Disable ad blockers
5. Check file permissions (if local)

### Service Worker Issues

**Problem:** PWA features not working

**Solutions:**
1. Must use HTTPS (or localhost)
2. Check `sw.js` is accessible
3. Unregister old service workers:
   ```javascript
   navigator.serviceWorker.getRegistrations()
     .then(regs => regs.forEach(reg => reg.unregister()));
   ```
4. Clear site data and reload

### Storage Full

**Problem:** Can't save new trades

**Solutions:**
1. Delete old trade screenshots
2. Remove old trade history
3. Clear browser cache
4. Use browser with more storage
5. Export data and start fresh

### PWA Won't Install

**Problem:** No install prompt

**Solutions:**
1. Use supported browser (Chrome/Edge)
2. Serve over HTTPS (not file://)
3. Check manifest.json is valid
4. Ensure service worker registered
5. Try incognito/private mode

---

## Updates

### App Updates

**Automatic:**
- Service worker checks for updates
- Downloads new version in background
- Updates on next app launch

**Manual:**
- Click "Refresh" in side menu
- Clears cache and reloads
- Or: Clear browser cache manually

### Checking Version

Look for version number:
- Bottom of README.md
- In browser console: `console.log('Version: 1.0.0')`

---

## Security Considerations

### HTTPS Required

For production deployment:
- Use HTTPS (not HTTP)
- PWA features require secure context
- API calls require secure connection

### Data Privacy

- All data stored locally
- No server-side storage
- No analytics or tracking
- GitHub token only for API calls

### Best Practices

1. **Don't share API tokens**
2. **Use strong browser passwords**
3. **Lock device when away**
4. **Export data regularly**
5. **Use private browsing for shared devices**

---

## Performance Optimization

### Loading Speed

- **First load:** < 1 second
- **Subsequent loads:** < 100ms (cached)
- **Service worker:** Instant loading

### Tips for Best Performance

1. **Compress screenshots before upload**
2. **Archive old trades periodically**
3. **Clear unused data**
4. **Use faster AI model for quick queries**
5. **Close unused browser tabs**

---

## Migration & Backup

### Export Data (Manual)

```javascript
// Open browser console
const data = {
  grades: localStorage.getItem('prepareGrades'),
  token: localStorage.getItem('githubToken'),
  models: localStorage.getItem('availableModels')
};

// Copy to clipboard
copy(JSON.stringify(data, null, 2));

// Or download as file
const blob = new Blob([JSON.stringify(data, null, 2)], 
  { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'prepare-backup.json';
a.click();
```

### Import Data (Manual)

```javascript
// Open browser console
const importedData = /* paste JSON here */;

localStorage.setItem('prepareGrades', importedData.grades);
localStorage.setItem('githubToken', importedData.token);
localStorage.setItem('availableModels', importedData.models);

location.reload();
```

---

## Support

### Getting Help

1. Check this installation guide
2. Review [USER_GUIDE.md](./USER_GUIDE.md)
3. Check [TECHNICAL.md](./TECHNICAL.md)
4. Open GitHub issue
5. Contact support

### Reporting Issues

Include in bug report:
- Browser and version
- Operating system
- Steps to reproduce
- Console errors (F12 → Console)
- Screenshots if relevant

---

**Last Updated:** January 2026  
**Version:** 1.0.0
