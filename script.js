// SUPABASE INITIALIZATION
const supabaseUrl = 'https://xeculwukoufasbhprcxv.supabase.co';
const supabaseKey = 'sb_publishable_GjUlnJ_k8cpOUet9a0OxQw_N642ByCq';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// DOM ELEMENTS
const audio = new Audio();

// Left Panel
const trackTitleEl = document.getElementById('track-title');
const trackArtistEl = document.getElementById('track-artist');
const vinylEl = document.getElementById('vinyl');

// Controls
const playPauseBtn = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('icon-play');
const pauseIcon = document.getElementById('icon-pause');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const shuffleBtn = document.getElementById('btn-shuffle');
const repeatBtn = document.getElementById('btn-repeat');
const favoriteBtn = document.getElementById('btn-favorite');
const heartOutline = document.getElementById('icon-heart-outline');
const heartFilled = document.getElementById('icon-heart-filled');
const volumeBtn = document.getElementById('btn-volume');
const volumeSlider = document.getElementById('volume-slider');

// Progress
const progressWrapper = document.getElementById('progress-wrapper');
const progressBar = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

// Playlist Panel
const fileImport = document.getElementById('file-import');
const playlistEl = document.getElementById('playlist');
const searchInput = document.getElementById('search-input');
const dropOverlay = document.getElementById('drop-overlay');
const appContainer = document.getElementById('drop-zone');
const notificationEl = document.getElementById('notification');

// Mobile Drawer
const btnHamburger = document.getElementById('btn-hamburger');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const playlistPanel = document.getElementById('playlist-panel');

// APPLICATION STATE
let tracks = [];
let currentTrackIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0: off, 1: all, 2: one
let favorites = JSON.parse(localStorage.getItem('music_favorites')) || [];

// INITIALIZE
async function init() {
    // Load local storage states
    volumeSlider.value = localStorage.getItem('music_volume') || 1;
    audio.volume = volumeSlider.value;
    
    isShuffle = localStorage.getItem('music_shuffle') === 'true';
    if(isShuffle) shuffleBtn.style.opacity = '1';
    
    repeatMode = parseInt(localStorage.getItem('music_repeat')) || 0;
    updateRepeatUI();

    await loadSongsFromSupabase();
}

async function loadSongsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const currentId = currentTrackIndex !== -1 && tracks[currentTrackIndex] ? tracks[currentTrackIndex].id : null;

        if (data) {
            tracks = data.map(song => ({
                id: song.id,
                url: song.file_url,
                title: song.title,
                artist: song.artist || 'Unknown Artist',
                album: song.album || 'Unknown Album',
                duration: song.duration || 0,
                genre: 'Other',
                file_path: song.file_path
            }));
        }
        
        if (currentId) {
            currentTrackIndex = tracks.findIndex(t => t.id === currentId);
        }
        
        renderPlaylist();
    } catch (error) {
        console.error('Error loading songs:', error);
        showNotification('Failed to load songs from database.');
    }
}

// FORMAT TIME
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// NOTIFICATIONS
let notifTimeout;
function showNotification(msg) {
    notificationEl.textContent = msg;
    notificationEl.classList.add('show');
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => {
        notificationEl.classList.remove('show');
    }, 3000);
}

// FILE IMPORT
fileImport.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// DRAG AND DROP
appContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
});

appContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
});

appContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
    handleFiles(e.dataTransfer.files);
});

async function handleFiles(files) {
    const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4', 'audio/mp3', 'audio/flac', 'audio/aac'];
    
    let addedCount = 0;
    
    for (const file of Array.from(files)) {
        if (validAudioTypes.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            if (file.size > 30 * 1024 * 1024) {
                showNotification(`File ${file.name} is too large (max 30MB).`);
                continue;
            }

            const localUrl = URL.createObjectURL(file);
            
            let nameParts = file.name.replace(/\.[^/.]+$/, "").split(" - ");
            let title = nameParts.length > 1 ? nameParts[1].trim() : nameParts[0].trim();
            let artist = nameParts.length > 1 ? nameParts[0].trim() : "Unknown Artist";

            const duration = await new Promise((resolve) => {
                const tempAudio = new Audio(localUrl);
                tempAudio.addEventListener('loadedmetadata', () => resolve(tempAudio.duration));
                tempAudio.addEventListener('error', () => resolve(0));
            });
            
            const tempId = 'temp-' + Date.now() + Math.random();
            
            // Optimistic UI update
            tracks.unshift({
                id: tempId,
                url: localUrl,
                title: title,
                artist: artist,
                album: 'Unknown Album',
                duration: duration,
                genre: 'Other',
                isUploading: true,
                file_path: '' // Will be updated after upload
            });
            addedCount++;
            
            // Start background upload
            uploadTrackInBackground(file, tempId, title, artist, duration, localUrl);
        }
    }
    
    if (addedCount > 0) {
        showNotification(`Added ${addedCount} track(s) locally. Uploading in background...`);
        renderPlaylist();
        
        if (currentTrackIndex === -1 && tracks.length > 0) {
            loadTrack(0, true);
        }
    }
}

async function uploadTrackInBackground(file, tempId, title, artist, duration, localUrl) {
    try {
        const fileExt = file.name.split('.').pop();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}_${sanitizedName}.${fileExt}`;
        const filePath = `songs/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('music')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
            .from('music')
            .getPublicUrl(filePath);

        const publicUrl = publicUrlData.publicUrl;

        const { data: insertData, error: insertError } = await supabaseClient
            .from('songs')
            .insert([
                {
                    title: title,
                    artist: artist,
                    album: 'Unknown Album',
                    duration: duration,
                    file_path: filePath,
                    file_url: publicUrl
                }
            ])
            .select();

        if (insertError) throw insertError;
        
        // Find track and update
        const trackIndex = tracks.findIndex(t => t.id === tempId);
        if (trackIndex !== -1) {
            tracks[trackIndex].id = insertData[0].id;
            tracks[trackIndex].url = publicUrl;
            tracks[trackIndex].file_path = filePath;
            tracks[trackIndex].isUploading = false;
        }
        renderPlaylist();
    } catch (err) {
        console.error('Upload error:', err);
        showNotification(`Failed to upload ${title}`);
        
        // Find track and mark failed
        const trackIndex = tracks.findIndex(t => t.id === tempId);
        if (trackIndex !== -1) {
            tracks[trackIndex].uploadFailed = true;
            tracks[trackIndex].isUploading = false;
            renderPlaylist();
        }
    }
}

async function deleteTrack(index) {
    const track = tracks[index];
    if (!track || track.isUploading) {
        showNotification("Cannot delete track while uploading.");
        return;
    }
    
    // Skip db delete if it was just a local failed upload
    if (track.uploadFailed || track.id.startsWith('temp-')) {
        tracks.splice(index, 1);
        adjustCurrentIndexAfterDelete(index);
        renderPlaylist();
        return;
    }
    
    showNotification("Deleting song from server... please wait");
    
    try {
        // Delete from DB first to ensure permissions
        const { error, data } = await supabaseClient
            .from('songs')
            .delete()
            .eq('id', track.id)
            .select();
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            throw new Error("Deletion blocked by database policies (RLS) or row not found.");
        }
        
        // Delete from storage if we have the path
        if (track.file_path) {
            await supabaseClient.storage.from('music').remove([track.file_path]);
        }

        // Now that server confirmed deletion, remove from UI
        tracks.splice(index, 1);
        adjustCurrentIndexAfterDelete(index);
        renderPlaylist();
        
        showNotification("Song deleted successfully.");
        
    } catch (err) {
        console.error('Delete error:', err);
        showNotification("Failed to delete song: " + (err.message || "Server error"));
    }
}

function adjustCurrentIndexAfterDelete(deletedIndex) {
    if (currentTrackIndex === deletedIndex) {
        pauseTrack();
        if (tracks.length > 0) {
            loadTrack(Math.min(deletedIndex, tracks.length - 1), false);
        } else {
            currentTrackIndex = -1;
            trackTitleEl.textContent = 'No song selected';
            trackArtistEl.textContent = 'Import your music to begin';
            audio.src = '';
            durationEl.textContent = '00:00';
            currentTimeEl.textContent = '00:00';
            progressBar.style.width = '0%';
        }
    } else if (currentTrackIndex > deletedIndex) {
        currentTrackIndex--;
    }
}

// RENDER PLAYLIST
function renderPlaylist() {
    playlistEl.innerHTML = '';
    
    const searchTerm = searchInput.value.toLowerCase();
    
    if (tracks.length === 0) {
        playlistEl.innerHTML = `<li style="text-align:center; opacity:0.5; padding:20px;">No tracks. Import some music!</li>`;
        return;
    }
    
    tracks.forEach((track, index) => {
        // Filter
        if (searchTerm && !track.title.toLowerCase().includes(searchTerm) && !track.artist.toLowerCase().includes(searchTerm)) return;
        
        const li = document.createElement('li');
        li.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
        li.onclick = () => {
            loadTrack(index, true);
            closeDrawer();
        };
        
        li.innerHTML = `
            <span class="track-num">${(index + 1).toString().padStart(2, '0')}</span>
            <div class="track-thumb">MI</div>
            <div class="track-details">
                <div class="track-name">${track.title}</div>
                <div class="track-artist-name">${track.artist}</div>
            </div>
            <div class="track-duration">
                ${track.isUploading ? '...' : (track.uploadFailed ? 'Failed' : (track.duration ? formatTime(track.duration) : '--:--'))}
            </div>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.title = 'Delete Song';
        deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteTrack(index);
        };
        li.appendChild(deleteBtn);
        
        playlistEl.appendChild(li);
    });
}

// LOAD TRACK
function loadTrack(index, playNow = false) {
    if (index < 0 || index >= tracks.length) return;
    
    currentTrackIndex = index;
    const track = tracks[index];
    
    audio.src = track.url;
    audio.load();
    
    // Update UI
    trackTitleEl.textContent = track.title;
    trackArtistEl.textContent = track.artist;
    
    // Update favorite state
    const isFav = favorites.includes(track.id);
    if (isFav) {
        heartOutline.style.display = 'none';
        heartFilled.style.display = 'block';
    } else {
        heartOutline.style.display = 'block';
        heartFilled.style.display = 'none';
    }
    
    renderPlaylist(); // to update active state
    
    if (playNow) {
        playTrack();
    } else {
        pauseTrack();
    }
}

// PLAY/PAUSE
function togglePlayPause() {
    if (tracks.length === 0) return;
    if (audio.paused) {
        playTrack();
    } else {
        pauseTrack();
    }
}

function playTrack() {
    if (tracks.length === 0) return;
    audio.play().then(() => {
        isPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        vinylEl.classList.add('playing');
    }).catch(err => {
        showNotification("Error playing audio.");
        console.error(err);
    });
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    
    // Read the current computed transform and set it to freeze rotation
    const computedStyle = window.getComputedStyle(vinylEl);
    const transform = computedStyle.getPropertyValue('transform');
    vinylEl.classList.remove('playing');
    if (transform !== 'none') {
        vinylEl.style.transform = transform;
    }
}

// AUDIO EVENTS
audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    
    const current = audio.currentTime;
    const duration = audio.duration;
    
    currentTimeEl.textContent = formatTime(current);
    
    const progressPercent = (current / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
});

audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
    if (repeatMode === 2) { // Repeat one
        audio.currentTime = 0;
        playTrack();
    } else {
        nextTrack();
    }
});

// PROGRESS BAR SEEKING
progressWrapper.addEventListener('click', (e) => {
    if (tracks.length === 0 || !audio.duration) return;
    const width = progressWrapper.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    
    audio.currentTime = (clickX / width) * duration;
});

// NEXT / PREV
function nextTrack() {
    if (tracks.length === 0) return;
    
    let nextIndex = currentTrackIndex + 1;
    
    if (isShuffle) {
        nextIndex = Math.floor(Math.random() * tracks.length);
        // Avoid repeating the same track if possible
        if (nextIndex === currentTrackIndex && tracks.length > 1) {
            nextIndex = (nextIndex + 1) % tracks.length;
        }
    } else if (nextIndex >= tracks.length) {
        if (repeatMode === 1) {
            nextIndex = 0;
        } else {
            pauseTrack();
            return;
        }
    }
    
    vinylEl.style.transform = 'none'; // reset rotation for next track
    loadTrack(nextIndex, isPlaying);
}

function prevTrack() {
    if (tracks.length === 0) return;
    
    // If played more than 3 seconds, restart current
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
        prevIndex = tracks.length - 1;
    }
    
    vinylEl.style.transform = 'none';
    loadTrack(prevIndex, isPlaying);
}

// CONTROLS EVENT LISTENERS
playPauseBtn.addEventListener('click', togglePlayPause);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    localStorage.setItem('music_shuffle', isShuffle);
    shuffleBtn.style.opacity = isShuffle ? '1' : '0.5';
});

repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    localStorage.setItem('music_repeat', repeatMode);
    updateRepeatUI();
});

function updateRepeatUI() {
    if (repeatMode === 0) {
        repeatBtn.style.opacity = '0.5';
        repeatBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
    } else if (repeatMode === 1) {
        repeatBtn.style.opacity = '1';
        repeatBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
    } else { // Repeat One
        repeatBtn.style.opacity = '1';
        repeatBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>';
    }
}

favoriteBtn.addEventListener('click', () => {
    if (currentTrackIndex === -1) return;
    const track = tracks[currentTrackIndex];
    
    const index = favorites.indexOf(track.id);
    if (index > -1) {
        favorites.splice(index, 1);
        heartOutline.style.display = 'block';
        heartFilled.style.display = 'none';
    } else {
        favorites.push(track.id);
        heartOutline.style.display = 'none';
        heartFilled.style.display = 'block';
    }
    
    localStorage.setItem('music_favorites', JSON.stringify(favorites));
});

volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
    localStorage.setItem('music_volume', audio.volume);
    updateVolumeIcon();
});

let lastVolume = 1;
volumeBtn.addEventListener('click', () => {
    if (audio.volume > 0) {
        lastVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
    } else {
        audio.volume = lastVolume;
        volumeSlider.value = lastVolume;
    }
    localStorage.setItem('music_volume', audio.volume);
    updateVolumeIcon();
});

function updateVolumeIcon() {
    if (audio.volume === 0) {
        volumeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
    } else {
        volumeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    }
}

// SEARCH
searchInput.addEventListener('input', renderPlaylist);

// MOBILE DRAWER LOGIC
function openDrawer() {
    playlistPanel.classList.add('open');
    drawerOverlay.classList.add('active');
}

function closeDrawer() {
    playlistPanel.classList.remove('open');
    drawerOverlay.classList.remove('active');
}

if (btnHamburger) btnHamburger.addEventListener('click', openDrawer);
if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

// KEYBOARD ACCESSIBILITY
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDrawer();
    }
    
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === 'ArrowRight') {
        nextTrack();
    } else if (e.code === 'ArrowLeft') {
        prevTrack();
    }
});

// INITIALIZE APP
init();
