import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import './App.css';

function App() {
  const [playlists, setPlaylists] = useState([]);
  const [effects, setEffects] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  return (
    <div className="main-bg">
      <header className="header">
        <div className="logo">🎲</div>
        <h1>D&D Soundboard</h1>
      </header>
      <div className="container">
        <div>
          {!selectedPlaylist && (
            <>
              <h2>Choose a YouTube Playlist</h2>
              <input
                type="text"
                className="playlist-search"
                placeholder="Search playlists..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{marginBottom:'1rem',width:'100%',maxWidth:'400px',padding:'0.5rem',fontSize:'1rem'}}
              />
              <div className="tag-filter-list">
                {[...new Set(playlists.flatMap(p => p.tags || []))].map(tag => (
                  <button
                    key={tag}
                    className={`tag-filter-btn${tagFilter === tag ? ' active' : ''}`}
                    onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                  >{tag}</button>
                ))}
                {tagFilter && (
                  <button className="tag-filter-btn clear" onClick={() => setTagFilter("")}>Clear</button>
                )}
              </div>
              <div className="playlist-grid">
                {(() => {
                  const filtered = playlists.filter(p =>
                    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())) &&
                    (!tagFilter || (p.tags && p.tags.includes(tagFilter)))
                  );
                  if (filtered.length === 0) {
                    return <div className="no-playlists">No playlists found. Try changing your search or tag filter.</div>;
                  }
                  return filtered.map(playlist => (
                    <div key={playlist.name} className="playlist-card" onClick={() => setSelectedPlaylist(playlist)}>
                      <div className="playlist-icon">🎼</div>
                      <div className="playlist-title">{playlist.name}</div>
                      <div className="playlist-desc">{playlist.description}</div>
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
              {/* Effects section can be updated or removed if not needed */}
            </>
          )}
          {selectedPlaylist && (
            <div>
              <button className="back-btn" onClick={() => setSelectedPlaylist(null)}>
                ← Back to Playlists
              </button>
              <section className="theme-card">
                <h2>{selectedPlaylist.name}</h2>
                <div className="youtube-player-wrapper" style={{marginTop:'1rem'}}>
                  <YouTube
                    videoId={getFirstVideoId(selectedPlaylist.url)}
                    opts={{
                      width: '100%',
                      height: '390',
                      playerVars: {
                        listType: 'playlist',
                        list: getPlaylistId(selectedPlaylist.url),
                        autoplay: 0
                      }
                    }}
                  />
                </div>
                <div style={{marginTop:'1rem'}}>
                  <a href={selectedPlaylist.url} target="_blank" rel="noopener noreferrer" style={{color:'#60a5fa'}}>Open Playlist on YouTube</a>
                </div>
              </section>
            </div>
          )}
          {/* Removed playbar and local audio logic */}
        </div>
      </div>
    </div>
  );
}
export default App;
