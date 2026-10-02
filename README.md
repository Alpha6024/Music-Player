# Music Inspiration Player

A premium, production-quality music player built with HTML5, CSS3, and Vanilla JavaScript, integrated with Supabase for a shared cloud playlist.

<img width="1915" height="919" alt="image" src="https://github.com/user-attachments/assets/e6b3a7a9-9338-4f06-b1be-236e83c284b3" />


## Features
- **Cloud Database & Storage:** Powered by Supabase. Uploaded songs are securely stored in the cloud, and everyone who visits the site sees the same shared playlist.
- **Optimistic UI:** Uploading a song instantly adds it to your player locally so you can play it immediately while the upload seamlessly completes in the background. 
- **Song Deletion:** Remove songs from the playlist, which cleanly deletes the record from the database and the actual audio file from the storage bucket.
- **Realistic Vinyl:** Features a dynamic rotating vinyl record that responds to playback state.
- **Full Playback Controls:** Play, pause, previous, next, shuffle, and repeat.
- **Custom Progress Bar:** Interactive and smooth seeking.
- **Responsive Design:** Optimized layout for both desktop and mobile devices, utilizing a sliding playlist drawer on mobile.

## Supabase Configuration
To run this project yourself or deploy it, you'll need to configure Supabase:
1. Create a Supabase project.
2. Create a table named `songs` in the `public` schema with columns: `id` (uuid), `title` (text), `artist` (text), `album` (text), `duration` (numeric), `file_path` (text), and `file_url` (text).
3. Create a Storage bucket named `music`.
4. Ensure you have set up proper Row Level Security (RLS) policies for both the `songs` table and the `music` bucket to allow `INSERT`, `SELECT`, and `DELETE` operations.

## How to Run Locally
1. Clone the repository.
2. Since it uses Supabase over the network, it's recommended to run a simple local web server to avoid browser `file://` CORS issues. 
   - Python: `python -m http.server 3000`
   - Node: `npx serve .`
3. Navigate to `http://localhost:3000` in your browser.

## Deployment (GitHub Pages)
This project consists purely of static frontend files (`index.html`, `style.css`, `script.js`), making it incredibly easy to host on GitHub Pages:
1. Go to the Settings tab of your GitHub repository.
2. On the left sidebar, click on **Pages**.
3. Under **Source**, select `Deploy from a branch`.
4. Under **Branch**, select `main` (or your default branch) and `/ (root)` folder, then click **Save**.
5. Wait a few minutes for the GitHub Actions pipeline to deploy your site. Your music player will be live at `https://<your-username>.github.io/<your-repo-name>/`!
