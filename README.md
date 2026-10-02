# Music Inspiration Player

A premium, production-quality music player built with HTML5, CSS3, and Vanilla JavaScript.

## Features
- **Local File Import:** Add your own `.mp3`, `.wav`, or `.ogg` files via the "+ IMPORT MUSIC" button or by dragging and dropping them into the player.
- **Realistic Vinyl:** Features a rotating vinyl record that responds to playback state.
- **Full Playback Controls:** Play, pause, previous, next, shuffle, and repeat.
- **Custom Progress Bar:** Interactive and smooth seeking.
- **Playlist Management:** Automatically populates with imported tracks. Supports search and genre filtering.
- **Favorites:** Mark tracks as favorites (saved locally).
- **Responsive Design:** Optimized layout for both desktop and mobile devices.

## How to Run
1. Open the `music-player` folder.
2. Double-click on `index.html` to open it in any modern web browser.
3. No server or backend is required! Everything runs locally in your browser.

## Architecture
- **HTML5 (index.html):** Semantic structure using `<main>`, `<aside>`, and native `<audio>` (via JS).
- **CSS3 (style.css):** Custom properties (variables) for consistent theming. Flexbox used for responsive layout. CSS animations handle the smooth vinyl rotation.
- **Vanilla JS (script.js):** Manages application state, the Web Audio API (`new Audio()`), file importing (Object URLs), and DOM updates without any external libraries.
