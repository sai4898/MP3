
import React, { useState, useEffect } from 'react';

const Music = () => {
    const [playlist, setPlaylist] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [audio, setAudio] = useState(new Audio());
    const [currentTime, setCurrentTime] = useState(0);
    const [audioPlayer, setAudioPlayer] = useState(null);

    useEffect(() => {
       
        const loadStoredData = async () => {
            const db = await openDatabase();
            const storedPlaylist = await readDataFromDB(db, 'playlist') || [];
            console.log('Stored Playlist:', storedPlaylist);
            const storedCurrentTrack = await readDataFromDB(db, 'currentTrack') || 0;
            const storedCurrentTime = await readDataFromDB(db, 'currentTime') || 0;

            setPlaylist(storedPlaylist);
            setCurrentTrack(storedCurrentTrack);
            setCurrentTime(storedCurrentTime);
            if (storedPlaylist.length > 0 && storedPlaylist[storedCurrentTrack]) {
                const audio = new Audio();
                audio.src = storedPlaylist[storedCurrentTrack].url;
                audio.currentTime = storedCurrentTime;
                setAudio(audio);
            }
           

            db.close();
        };

        loadStoredData();
    }, []);


    
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64String = btoa(new Uint8Array(e.target.result).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                const newPlaylist = [...playlist, { id: Date.now(), name: file.name, url: `data:audio/mp3;base64,${base64String}` }];

                setPlaylist(newPlaylist);
                await writeToDB('playlist', newPlaylist);
            };

            reader.readAsArrayBuffer(file);
        }
        handleNext();
    };

    

    const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        writeToDB('currentTime', audio.currentTime);
    };

    const handlePlay = (index) => {
                setCurrentTrack(index);
                if (audioPlayer) {
                    audioPlayer.pause();
                    audioPlayer.load();
                    audioPlayer.play();
                }
            };

    const deleteTrack = async (id) => {
        const updatedPlaylist = playlist.filter(track => track.id !== id);
        setPlaylist(updatedPlaylist);
        await writeToDB('playlist', updatedPlaylist);
    };


    const handleNext = () => {
             if (currentTrack < playlist.length - 1) {
                    handlePlay(currentTrack + 1);
                }
            };
        
             const handleAudioEnded = () => {
                 handleNext();
             };

            
  
return (
    <div className="music-container">
        <input type="file" accept=".mp3" onChange={handleFileUpload} />
        <div className="playlist-container">
            <h2>{playlist.length > 0 ? 'PlayList' : 'Empty'}</h2>
            <ul className="playlist">
                {playlist.map((track, index) => (
                    <li key={track.id} className="playlist-item">
                        <div onClick={() => handlePlay(index)}>{`Track ${index + 1}: ${track.name || 'Unknown'}`}</div>
                        <button type="button" style={{marginLeft:'11px'}} onClick={() => deleteTrack(track.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
        <div className="now-playing-container">
            {playlist.length > 0 && (
                <>
                    <h3>Now Playing</h3>
                    <p>
                        Track {currentTrack + 1} : {playlist[currentTrack]?.name || 'Unknown'}
                    </p>
                    <audio
                        controls
                        autoPlay
                        onEnded={handleAudioEnded}
                        onTimeUpdate={handleTimeUpdate}
                        ref={(audio) => setAudioPlayer(audio)}
                    >
                        <source src={playlist[currentTrack]?.url || ''} type="audio/mp3" />
                    </audio>
                </>
            )}
        </div>
    </div>
);

            }     


// IndexedDB functions
const DB_NAME = 'audioPlayerDB';
const STORE_NAME = 'audioPlayerStore';

const clearDatabase = async () => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        transaction.oncomplete = () => {
            resolve();
            db.close();
        };

        transaction.onerror = (event) => {
            reject(event.target.error);
            db.close();
        };
    });
};

const openDatabase = async () => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

const writeToDB = async (key, value) => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key, value });

        transaction.oncomplete = () => {
            resolve();
            db.close();
        };

        transaction.onerror = (event) => {
            reject(event.target.error);
            db.close();
        };
    });
};

const readDataFromDB = async (db, key) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result ? result.value : null);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

export default Music;
