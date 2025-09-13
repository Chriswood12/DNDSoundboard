import React, { useState, useEffect } from 'react';
import './App.css';
function App() {
  const [themes, setThemes] = useState([]);
  const [effects, setEffects] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(null);
  const [trackAudio, setTrackAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [looping, setLooping] = useState(false);
  const [playingTheme, setPlayingTheme] = useState(null);
  const [effectAudios, setEffectAudios] = useState([]);
  const [effectVolumes, setEffectVolumes] = useState({});
  const [effectLoops, setEffectLoops] = useState({});
  const [effectTimes, setEffectTimes] = useState({});

  useEffect(() => {
    fetch('/sounds/manifest.json')
      .then(res => res.json())
      .then(data => {
        setThemes(data.themes || []);
        setEffects(data.effects || []);
      });
  }, []);

  // Play selected track
  // Fade utility
  const fadeOut = (audio, duration = 1000) => {
    return new Promise(resolve => {
      if (!audio) return resolve();
      const step = audio.volume / (duration / 50);
      const fade = setInterval(() => {
        audio.volume = Math.max(0, audio.volume - step);
        if (audio.volume <= 0.01) {
          clearInterval(fade);
          audio.pause();
          audio.volume = 1;
          resolve();
        }
      }, 50);
    });
  };
  const fadeIn = (audio, duration = 1000) => {
    audio.volume = 0;
    audio.play();
    const step = 1 / (duration / 50);
    const fade = setInterval(() => {
      audio.volume = Math.min(1, audio.volume + step);
      if (audio.volume >= 0.99) {
        clearInterval(fade);
        audio.volume = 1;
      }
    }, 50);
  };

  const playTrack = async (idx, themeOverride) => {
    const theme = themeOverride || selectedTheme;
    if (!theme) return;
    if (trackAudio) await fadeOut(trackAudio, 1000);
    const track = theme.files[idx];
    const audio = new Audio(`/sounds/${theme.folder}/${track}`);
    audio.loop = looping;
    setTrackAudio(audio);
    setCurrentTrackIdx(idx);
    setIsPlaying(true);
    setPlayingTheme(theme.folder);
    audio.ontimeupdate = () => setProgress(audio.currentTime / audio.duration);
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      // Auto-play next
      if (idx < theme.files.length - 1) {
        playTrack(idx + 1, theme);
      }
    };
    fadeIn(audio, 1000);
  };
  const pauseTrack = () => {
    if (trackAudio) trackAudio.pause();
    setIsPlaying(false);
  };
  const resumeTrack = () => {
    if (trackAudio) trackAudio.play();
    setIsPlaying(true);
  };
  const stopTrack = async () => {
    if (trackAudio) await fadeOut(trackAudio, 1000);
    setIsPlaying(false);
    setCurrentTrackIdx(null);
    setProgress(0);
  };
  const nextTrack = () => {
    // Always use playingTheme to find the correct theme and file list
    let theme = themes.find(t => t.folder === playingTheme);
    let files = theme ? theme.files : [];
    if (theme && currentTrackIdx < files.length - 1) {
      // Do NOT setSelectedTheme here; just play the next track
      playTrack(currentTrackIdx + 1, theme);
    }
  };
  const prevTrack = () => {
    let theme = themes.find(t => t.folder === playingTheme);
    let files = theme ? theme.files : [];
    if (theme && currentTrackIdx > 0) {
      playTrack(currentTrackIdx - 1, theme);
    }
  };
  const toggleLoop = () => setLooping(l => !l);

  // Sound effect play
  const playEffect = (effect) => {
    const audio = new Audio(effect.url);
    audio.loop = effectLoops[effect.name] ?? true;
    audio.volume = effectVolumes[effect.name] ?? 0.01; // default to 1%
    audio.play();
    audio.ontimeupdate = () => {
      setEffectTimes(times => ({...times, [effect.name]: audio.duration - audio.currentTime}));
    };
    setEffectAudios(auds => [...auds, {name: effect.name, audio}]);
  };
  const stopAllEffects = () => {
    effectAudios.forEach(({audio}) => { audio.pause(); audio.currentTime = 0; });
    setEffectAudios([]);
  };
  const setEffectVolume = (name, volume) => {
    setEffectVolumes(vols => ({...vols, [name]: volume}));
    effectAudios.forEach(({name: n, audio}) => {
      if (n === name) audio.volume = volume;
    });
  };
  const setEffectLoop = (name, loop) => {
    setEffectLoops(loops => ({...loops, [name]: loop}));
    effectAudios.forEach(({name: n, audio}) => {
      if (n === name) audio.loop = loop;
    });
  };

  return (
    <div className="main-bg">
      <header className="header">
        <div className="logo">🎲</div>
        <h1>D&D Soundboard</h1>
      </header>
      <div className="container">
        <div>
          {!selectedTheme && (
            <>
              <h2>Choose a Soundtrack Folder</h2>
                <div className="theme-list-cards">
                  {themes.map(theme => (
                    <div key={theme.name} className="theme-card-select" onClick={() => {
                      setSelectedTheme(theme);
                      // Do NOT reset currentTrackIdx or isPlaying here
                      // This preserves the now playing state when leaving folders
                    }}>
                      <div className="theme-card-icon">🎼</div>
                      <div className="theme-card-title">{theme.name}</div>
                      <div className="theme-card-count">{theme.files.length} tracks</div>
                    </div>
                  ))}
                </div>
              <section className="theme-card">
                <h2>Sound Effects</h2>
                <button className="effect-btn-card" style={{background:'#23233a',color:'#60a5fa',marginBottom:'0.5rem'}} onClick={stopAllEffects}>Stop All Effects</button>
                <div className="sound-list">
                  {effects && effects.length > 0 ? (
                    effects.map(effect => (
                      <div key={effect.name} style={{display:'flex',alignItems:'center',marginBottom:'0.5rem'}}>
                        <button className="effect-btn-card" onClick={() => playEffect({ name: effect.name, url: `/sounds/${effect.file}` })}>
                          <span className="effect-icon">💨</span> {effect.name}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={effectVolumes[effect.name] ?? 0.01}
                          onChange={e => setEffectVolume(effect.name, parseFloat(e.target.value))}
                          style={{marginLeft:'1rem',width:'80px'}}
                          title={`Volume for ${effect.name}`}
                        />
                        <button style={{marginLeft:'0.5rem'}} onClick={() => setEffectLoop(effect.name, !(effectLoops[effect.name] ?? true))}>
                          {effectLoops[effect.name] ?? true ? '🔁' : '➡️'}
                        </button>
                        <span style={{marginLeft:'0.5rem',fontSize:'0.9em',color:'#60a5fa'}}>
                          {effectTimes[effect.name] !== undefined && !isNaN(effectTimes[effect.name]) ? `${Math.floor(effectTimes[effect.name] / 60)}:${String(Math.ceil(effectTimes[effect.name] % 60)).padStart(2, '0')} min left` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="no-files">No files found</span>
                  )}
                </div>
              </section>
            </>
          )}
          {selectedTheme && (
            <div>
              <button className="back-btn" onClick={() => {
                setSelectedTheme(null);
                // Do NOT reset currentTrackIdx or isPlaying here
                // This preserves the now playing state when leaving folders
              }}>← Back to Folders</button>
              <section className="theme-card">
                <h2>{selectedTheme.name}</h2>
                <ul className="sound-list-modern">
                  {selectedTheme.files.map((file, idx) => (
                    <li key={file} className={`sound-list-row${currentTrackIdx === idx && isPlaying && playingTheme === selectedTheme.folder ? ' playing' : ''}`}
                        onClick={() => playTrack(idx)}
                        style={{cursor: currentTrackIdx === idx && isPlaying && playingTheme === selectedTheme.folder ? 'default' : 'pointer'}}>
                      <div className="sound-row-main">
                        <span className="sound-row-icon">{currentTrackIdx === idx && isPlaying && playingTheme === selectedTheme.folder ? '🔊' : '🎵'}</span>
                        <span className="sound-row-title">{file.replace(/\.mp3$/, '').replace(/_/g, ' ')}</span>
                      </div>
                      <div className="sound-row-action">
                        {currentTrackIdx === idx && isPlaying && playingTheme === selectedTheme.folder ? (
                          <span className="sound-row-playing">Playing</span>
                        ) : (
                          <button className="play-btn" onClick={e => {e.stopPropagation(); playTrack(idx);}}>
                            ▶
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          {currentTrackIdx !== null && (
            <div className="playbar">
              <button onClick={prevTrack} disabled={currentTrackIdx === 0}>⏮</button>
              {isPlaying ? (
                <button onClick={pauseTrack}>⏸</button>
              ) : (
                <button onClick={resumeTrack}>▶</button>
              )}
              <button onClick={stopTrack}>⏹</button>
              <button onClick={nextTrack} disabled={selectedTheme && currentTrackIdx === selectedTheme.files.length - 1}>⏭</button>
              <button onClick={toggleLoop}>{looping ? '🔁' : '🔂'}</button>
              <span className="playbar-title">
                {currentTrackIdx !== null && trackAudio ?
                  (() => {
                    // Always use playingTheme to find the correct theme for the currently playing track
                    let theme = themes.find(t => t.folder === playingTheme);
                    if (theme && theme.files[currentTrackIdx]) {
                      return theme.files[currentTrackIdx].replace(/\.mp3$/, '').replace(/_/g, ' ');
                    }
                    return 'Now Playing';
                  })()
                  : ''}
              </span>
              <div className="playbar-progress">
                <div className="playbar-progress-bar" style={{width: `${progress * 100}%`}}></div>
                {trackAudio && (
                  <input
                    type="range"
                    min={0}
                    max={trackAudio.duration || 1}
                    step={0.01}
                    value={trackAudio.currentTime}
                    onChange={e => {
                      const time = parseFloat(e.target.value);
                      trackAudio.currentTime = time;
                      setProgress(time / (trackAudio.duration || 1));
                    }}
                    style={{width: '100%', marginTop: '6px'}}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
