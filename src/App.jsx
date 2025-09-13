import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import './App.css';

function App() {
  // Extract playlist ID from YouTube playlist URL
  function getPlaylistId(url) {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  // Provide a fallback video ID (YouTube requires a video for embed)
  function getFirstVideoId(url) {
    // YouTube playlist embed works with just the playlist ID, but react-youtube needs a videoId
    // Use a default video if not found
    return 'dQw4w9WgXcQ'; // Rickroll as fallback
  }
  const [playlists, setPlaylists] = useState([]);
  const [effects, setEffects] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [randomStartIndex, setRandomStartIndex] = useState(0);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState(null); // Track what's actually playing
  const [showDetailView, setShowDetailView] = useState(false); // Whether to show detailed player view
  const [currentVolume, setCurrentVolume] = useState(100); // Track current volume for fading

  // Function to fetch playlist title from YouTube oEmbed API
  async function fetchPlaylistTitle(url) {
    try {
      const playlistId = getPlaylistId(url);
      if (!playlistId) return null;
      
      // Use YouTube oEmbed API to get playlist title
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/playlist?list=${playlistId}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      return data.title;
    } catch (error) {
      console.warn('Failed to fetch title for:', url, error);
      return null;
    }
  }

  // Function to generate a name from URL if no title fetched
  function generateNameFromUrl(url) {
    const playlistId = getPlaylistId(url);
    return playlistId ? `Playlist ${playlistId.slice(-6)}` : 'Unknown Playlist';
  }

  // YouTube player event handlers
  const onPlayerReady = (event) => {
    console.log('Player ready, shuffle enabled:', shuffleEnabled, 'start index:', randomStartIndex);
    setYoutubePlayer(event.target);
    setPlayerVisible(true);
    
    // Start with volume at 0
    event.target.setVolume(0);
    
    // Simple start - playerVars should handle shuffle and index
    setTimeout(() => {
      console.log('Starting playback with playerVars handling shuffle and index');
      event.target.playVideo();
      setIsPlaying(true);
      
      // Start fade in
      setTimeout(() => {
        fadeIn(100, 2000, event.target);
      }, 500);
    }, 1000);
  };

  const onPlayerStateChange = (event) => {
    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (event.data === 1) {
      setIsPlaying(true);
    } else if (event.data === 2 || event.data === 0) {
      setIsPlaying(false);
    }
    
    // Handle loop functionality when playlist ends
    if (event.data === 0 && loopEnabled && youtubePlayer) {
      setTimeout(() => {
        youtubePlayer.playVideo();
      }, 1000);
    }
  };

  // Function to update player settings (shuffle/loop) without recreating player
  const updatePlayerSettings = () => {
    if (youtubePlayer && currentPlaylist) {
      console.log('Updating player settings - shuffle:', shuffleEnabled);
      
      // Generate new random start index when shuffle is toggled
      if (shuffleEnabled) {
        const newRandomIndex = Math.floor(Math.random() * 50);
        console.log('Shuffle toggled, new random index:', newRandomIndex);
        setRandomStartIndex(newRandomIndex);
      }
      
      try {
        // Use setShuffle method for YouTube API
        youtubePlayer.setShuffle(shuffleEnabled);
        console.log('Shuffle setting applied successfully');
      } catch (error) {
        console.error('Error setting shuffle:', error);
        // If setShuffle fails, try reloading the playlist
        setTimeout(() => {
          const playlistId = getPlaylistId(currentPlaylist.url);
          youtubePlayer.loadPlaylist({
            listType: 'playlist',
            list: playlistId,
          });
          // Set shuffle after reload
          setTimeout(() => {
            youtubePlayer.setShuffle(shuffleEnabled);
          }, 1000);
        }, 100);
      }
    }
  };

  // Audio fade functions
  const fadeIn = (targetVolume = 100, duration = 2000, player = null) => {
    const playerToUse = player || youtubePlayer;
    if (!playerToUse) {
      console.log('No player available for fade in');
      return;
    }
    
    console.log(`Starting fade in to ${targetVolume} over ${duration}ms`);
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    
    let currentStep = 0;
    playerToUse.setVolume(0);
    
    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.min(volumeStep * currentStep, targetVolume);
      playerToUse.setVolume(newVolume);
      setCurrentVolume(newVolume);
      console.log(`Fade in step ${currentStep}: volume ${newVolume}`);
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        console.log('Fade in complete');
      }
    }, stepDuration);
  };

  const fadeOut = (duration = 2000, callback = null, player = null) => {
    const playerToUse = player || youtubePlayer;
    if (!playerToUse) {
      console.log('No player available for fade out');
      return;
    }
    
    const startVolume = currentVolume;
    console.log(`Starting fade out from ${startVolume} over ${duration}ms`);
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;
    
    let currentStep = 0;
    
    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(startVolume - (volumeStep * currentStep), 0);
      playerToUse.setVolume(newVolume);
      setCurrentVolume(newVolume);
      console.log(`Fade out step ${currentStep}: volume ${newVolume}`);
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        console.log('Fade out complete');
        if (callback) callback();
      }
    }, stepDuration);
  };

  // Function to handle playlist selection with autoplay and fade
  const handlePlaylistSelect = (playlist) => {
    // Generate new random start index if shuffle is enabled
    if (shuffleEnabled) {
      const newRandomIndex = Math.floor(Math.random() * 50);
      console.log('Shuffle enabled, setting random start index:', newRandomIndex);
      setRandomStartIndex(newRandomIndex);
    } else {
      setRandomStartIndex(0);
    }
    
    // If there's already music playing, fade it out first
    if (youtubePlayer && currentPlaylist) {
      fadeOut(1000, () => {
        setCurrentPlaylist(playlist);
        setSelectedPlaylist(playlist);
        setShowDetailView(true);
        setPlayerVisible(false);
        setTimeout(() => setPlayerVisible(true), 100);
      });
    } else {
      setCurrentPlaylist(playlist);
      setSelectedPlaylist(playlist);
      setShowDetailView(true);
      setPlayerVisible(false);
      setTimeout(() => setPlayerVisible(true), 100);
    }
  };

  // Function to go back to playlist view but keep music playing
  const goBackToPlaylists = () => {
    setShowDetailView(false);
    setSelectedPlaylist(null);
    // Keep currentPlaylist and player state intact
  };

  useEffect(() => {
    fetch('/playlists.json')
      .then(res => res.json())
      .then(async (data) => {
        const rawPlaylists = data.playlists || [];
        setEffects(data.effects || []);
        
        if (rawPlaylists.length > 0) {
          setLoadingTitles(true);
          
          // Process playlists and fetch titles dynamically
          const playlistsWithTitles = await Promise.all(
            rawPlaylists.map(async (playlist) => {
              // If playlist already has a name, keep it, otherwise fetch it
              let name = playlist.name;
              if (!name) {
                const fetchedTitle = await fetchPlaylistTitle(playlist.url);
                name = fetchedTitle || generateNameFromUrl(playlist.url);
              }
              
              return {
                ...playlist,
                name: name,
                // Generate basic tags if none exist
                tags: playlist.tags || ['ambient']
              };
            })
          );
          
          setPlaylists(playlistsWithTitles);
          setLoadingTitles(false);
        }
      })
      .catch(err => {
        console.error('Failed to load playlists:', err);
        setLoadingTitles(false);
      });
  }, []);

  // Update player when shuffle setting changes
  useEffect(() => {
    if (currentPlaylist) {
      updatePlayerSettings();
    }
  }, [shuffleEnabled]);

  return (
    <div className="main-bg">
      <header className="header">
        <div className="logo">🎲</div>
        <h1>D&D Soundboard</h1>
      </header>
      
      {/* Compact Now Playing Bar - shown when music is playing but not in detail view */}
      {currentPlaylist && !showDetailView && (
        <div className="now-playing-bar" style={{
          opacity: currentPlaylist ? 1 : 0,
          transform: currentPlaylist ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out'
        }}>
          <div className="now-playing-info">
            <div className="now-playing-icon">
              {isPlaying ? '🎵' : '⏸️'}
            </div>
            <div className="now-playing-text">
              <div className="now-playing-title">
                {currentPlaylist.name}
              </div>
              <div className="now-playing-status">
                {isPlaying ? '🔊 Now Playing' : '⏸️ Paused'}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowDetailView(true)}
            className="show-player-btn"
          >
            🎛️ Show Player
          </button>
        </div>
      )}
      
      <div className="container">
        <div>
          {!showDetailView && (
            <div style={{
              opacity: !showDetailView ? 1 : 0,
              transform: !showDetailView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out'
            }}>
              <h2 style={{textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', color: '#60a5fa'}}>Choose a YouTube Playlist</h2>
              {loadingTitles && (
                <div style={{padding:'1rem',textAlign:'center',color:'#60a5fa'}}>
                  Loading playlist titles from YouTube...
                </div>
              )}
              
              <div className="search-container">
                <input
                  type="text"
                  className="playlist-search"
                  placeholder="🔍 Search playlists..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  disabled={loadingTitles}
                />
                
                <div style={{display: 'flex', justifyContent: 'center', gap: '1rem'}}>
                  <button 
                    onClick={() => setShuffleEnabled(!shuffleEnabled)}
                    className={`shuffle-btn${shuffleEnabled ? ' active' : ''}`}
                    style={{fontSize: '0.95rem', padding: '0.75rem 1.5rem'}}
                  >
                    🔀 {shuffleEnabled ? 'Shuffle On' : 'Shuffle Off'}
                  </button>
                  <button 
                    onClick={() => setLoopEnabled(!loopEnabled)}
                    className={`loop-btn${loopEnabled ? ' active' : ''}`}
                    style={{fontSize: '0.95rem', padding: '0.75rem 1.5rem'}}
                  >
                    🔄 {loopEnabled ? 'Loop On' : 'Loop Off'}
                  </button>
                </div>
                
                <div className="tag-filter-section">
                  <div className="tag-filter-title">
                    🏷️ Filter by Tags
                  </div>
                {/* Define tag categories and their tags outside the IIFE so both categorized and uncategorized can access */}
                {(() => {
                  const tagCategories = {
                    Mood: ["ambient", "creepy", "epic", "quiet", "tension", "sinister", "evil", "intense", "climax", "magic", "dark", "night"],
                    Location: ["city", "castle", "dungeon", "forest", "beach", "river", "mountain", "chasm", "tower", "campfire", "catacombs", "church", "viking"],
                    Music: ["jazz", "funk", "rock", "electro", "music"],
                    Event: ["battle", "intro", "brawl", "adventure", "travel"],
                    Creature: ["giants", "goblins", "elven", "npc", "morty", "mortysian", "drukar", "pirates", "tian lung", "artificer", "gnome", "wildion", "zuvon", "gerriol", "madam poji", "undead", "motysha", "colosseum", "invicta", "ravenhill", "zhorcaster", "atisukumbu", "eversong", "curriculus", "pilgrims", "bounty", "stille", "skov", "fight", "motherfucker", "tiny"],
                    Other: ["intro", "dream", "crimson", "mines", "mining", "genasi", "bounty", "campfire", "storslået", "episk", "ondt", "op", "levende", "skib", "colluseum"]
                  };
                  // Get all tags in playlists
                  const allTags = [...new Set(playlists.flatMap(p => p.tags || []))];
                  // Helper to get tags for a category that exist in playlists
                  const getTagsForCategory = cat => tagCategories[cat].filter(tag => allTags.includes(tag));
                  // Find tags not in any category
                  const categorizedTags = Object.values(tagCategories).flat();
                  const uncategorized = allTags.filter(tag => !categorizedTags.includes(tag));
                  return (
                    <>
                      {Object.keys(tagCategories).map(cat => {
                        const tags = getTagsForCategory(cat);
                        if (tags.length === 0) return null;
                        return (
                          <div key={cat} className="tag-category">
                            <div className="tag-category-title">{cat}</div>
                            <div className="tag-buttons-container">
                              {tags.map(tag => (
                                <button
                                  key={tag}
                                  className={`tag-filter-btn${tagFilter === tag ? ' active' : ''}`}
                                  onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                                >{tag}</button>
                              ))}
                              {tagFilter && tags.includes(tagFilter) && (
                                <button className="tag-filter-btn clear" onClick={() => setTagFilter("")}>✕ Clear</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {uncategorized.length > 0 && (
                        <div className="tag-category">
                          <div className="tag-category-title">Other</div>
                          <div className="tag-buttons-container">
                            {uncategorized.map(tag => (
                              <button
                                key={tag}
                                className={`tag-filter-btn${tagFilter === tag ? ' active' : ''}`}
                                onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                              >{tag}</button>
                            ))}
                            {tagFilter && uncategorized.includes(tagFilter) && (
                              <button className="tag-filter-btn clear" onClick={() => setTagFilter("")}>✕ Clear</button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
                </div>
              </div>
            <div className="playlist-grid">
                {(() => {
                  const filtered = playlists.filter(p =>
                    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
                    (!tagFilter || (p.tags && p.tags.includes(tagFilter)))
                  );
                  if (filtered.length === 0) {
                    return <div className="no-playlists">No playlists found. Try changing your search or tag filter.</div>;
                  }
                  return filtered.map(playlist => (
                    <div key={playlist.name} className="playlist-card" onClick={() => handlePlaylistSelect(playlist)}>
                      <div className="playlist-icon">🎼</div>
                      <div className="playlist-title">{playlist.name}</div>
                      {playlist.tags && (
                        <div className="playlist-tags">
                          {playlist.tags.map(tag => (
                            <span key={tag} className="playlist-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
              
              {/* Sound Effects Section */}
              {effects.length > 0 && (
                <div style={{marginTop: '3rem'}}>
                  <h2 style={{textAlign: 'center', marginBottom: '2rem', fontSize: '1.8rem', color: '#60a5fa'}}>🎭 Sound Effects</h2>
                  <div className="theme-list">
                    {effects.map((effect, index) => (
                      <button 
                        key={index} 
                        className="effect-btn-card"
                        onClick={() => {
                          // Play sound effect (could be local audio file or YouTube)
                          if (effect.url) {
                            window.open(effect.url, '_blank');
                          } else if (effect.file) {
                            // Play local audio file
                            const audio = new Audio(`/sounds/${effect.file}`);
                            audio.play().catch(console.error);
                          }
                        }}
                      >
                        <span className="effect-icon">{effect.icon || '🎵'}</span>
                        <span>{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {showDetailView && selectedPlaylist && (
            <div>
              <button className="back-btn" onClick={goBackToPlaylists}>
                ← Back to Playlists
              </button>
              <section className="theme-card">
                {/* Now Playing Header */}
                <div className="player-header">
                  <div className="player-title-section">
                    <h2>{selectedPlaylist.name}</h2>
                    <div className="player-status">
                      {isPlaying ? '🎵 Now Playing' : '⏸️ Paused'}
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '0.75rem'}}>
                    <button 
                      onClick={() => setShuffleEnabled(!shuffleEnabled)}
                      className={`shuffle-btn${shuffleEnabled ? ' active' : ''}`}
                    >
                      🔀 {shuffleEnabled ? 'Shuffle On' : 'Shuffle Off'}
                    </button>
                    <button 
                      onClick={() => setLoopEnabled(!loopEnabled)}
                      className={`loop-btn${loopEnabled ? ' active' : ''}`}
                    >
                      🔄 {loopEnabled ? 'Loop On' : 'Loop Off'}
                    </button>
                  </div>
                </div>
                
                {/* Player container - the actual player is positioned here when in detail view */}
                <div 
                  id="player-container"
                  className="youtube-player-wrapper" 
                  style={{
                    marginTop:'1rem',
                    minHeight: '390px'
                  }}
                >
                </div>
                <div style={{marginTop:'1rem'}}>
                  <a href={selectedPlaylist.url} target="_blank" rel="noopener noreferrer" style={{color:'#60a5fa'}}>Open Playlist on YouTube</a>
                </div>
              </section>
            </div>
          )}
          
          {/* Single player that persists across navigation - only position changes */}
          {currentPlaylist && (
            <div 
              style={{
                position: showDetailView ? 'static' : 'absolute',
                left: showDetailView ? 'auto' : '-9999px',
                top: showDetailView ? 'auto' : '-9999px',
                width: showDetailView ? '100%' : '1px',
                height: showDetailView ? 'auto' : '1px',
                overflow: showDetailView ? 'visible' : 'hidden',
                opacity: showDetailView && playerVisible ? 1 : (showDetailView ? 0 : 1),
                transition: showDetailView ? 'opacity 0.5s ease-in-out' : 'none'
              }}
            >
              <YouTube
                key={`player-${getPlaylistId(currentPlaylist.url)}-${randomStartIndex}`}
                opts={{
                  width: showDetailView ? '100%' : '1',
                  height: showDetailView ? '390' : '1',
                  playerVars: {
                    listType: 'playlist',
                    list: getPlaylistId(currentPlaylist.url),
                    autoplay: 1,
                    loop: loopEnabled ? 1 : 0,
                    shuffle: shuffleEnabled ? 1 : 0,
                    index: shuffleEnabled && randomStartIndex > 0 ? randomStartIndex : 0,
                    playlist: getPlaylistId(currentPlaylist.url)
                  }
                }}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />
            </div>
          )}
          
          {/* Removed playbar and local audio logic */}
        </div>
      </div>
    </div>
  );
}
export default App;
