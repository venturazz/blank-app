# FMHY TV Launcher

A TV-friendly landing page that imports links from https://fmhy.net/video, builds poster-style cards, checks link health, and can be deployed to GitHub Pages.

## What you get

- Auto-import from FMHY video page
- Poster-style cards for Android TV browsing
- Search and tag filters
- Pinned favorites stored in localStorage
- Link health checks with soft disable after repeated failures
- GitHub Pages deployment workflow

## 1. Create the project from scratch

### Option A: Use the ZIP from ChatGPT

1. Download `fmhy-tv-launcher.zip` from the chat.
2. Extract it on your computer.
3. Open the extracted folder.

### Option B: Start from an empty folder

1. Create a new folder named `fmhy-tv-launcher`.
2. Put all project files into that folder.

## 2. Install requirements

You need:

- Node.js 20 or newer
- A GitHub account
- Git installed (recommended)

Check versions:

```bash
node -v
npm -v
git --version
```

## 3. Run locally

Open terminal inside the project folder and run:

```bash
npm install
npm run update
npm run serve
```

Then open the local URL shown in the terminal, usually something like:

```txt
http://localhost:3000
```

## 4. What each command does

```bash
npm install
```
Installs dependencies.

```bash
npm run update
```
Fetches FMHY video links, builds poster placeholders, and checks link health.

```bash
npm run serve
```
Starts a local static server so `data.json` can be loaded by the browser.

## 5. Create a GitHub repo

1. Go to GitHub.
2. Create a new repository, for example `fmhy-tv-launcher`.
3. Do not add extra files from GitHub if you already extracted the ZIP locally.

## 6. Upload to GitHub

### If using Git locally

Run these commands inside the project folder:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fmhy-tv-launcher.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### If using GitHub web upload

1. Open your new repository.
2. Choose **uploading an existing file**.
3. Upload all extracted files.
4. Commit the changes.

## 7. Enable GitHub Pages

1. Open your repository on GitHub.
2. Go to **Settings** -> **Pages**.
3. Under **Source**, choose **GitHub Actions**.
4. Go to the **Actions** tab.
5. Run the workflow named **Build and Deploy FMHY TV** once.

After the workflow finishes, GitHub Pages will publish the site.

## 8. Update later

For local update:

```bash
npm run update
```

Then commit and push the changed `data.json` if you want the repo to store the latest snapshot:

```bash
git add data.json favorites.json
git commit -m "Update launcher data"
git push
```

## 9. Notes

- Favorites in the UI are stored in the browser with `localStorage`, not in GitHub.
- Some sites may fail temporary health checks because of rate limits, bot blocking, or timeout.
- A link is soft-disabled only after repeated failed checks.
- The FMHY page structure can change, so the scraper may need adjustments later.

## 10. Main files

- `scrape-fmhy.mjs` -> imports and structures FMHY links
- `build-posters.mjs` -> creates poster-style SVG placeholders
- `check-links.mjs` -> validates links and updates health info
- `index.html` -> main page
- `style.css` -> TV-friendly styles
- `app.js` -> browser UI logic
- `.github/workflows/deploy-pages.yml` -> deploys to GitHub Pages
