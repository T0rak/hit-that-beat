let socket: SocketIOClient.Socket = io.connect();
let audioPlayer = document.getElementById("audioPlayer");

let searchBar = document.getElementById("search");
let searchButton: HTMLElement = document.getElementById("execSearch");
let musicList = document.getElementById("musicList");
let home = document.getElementById("home");

let musicFields = document.getElementById("musicfields");
let previousButton = document.getElementById("prev");
let playButton = document.getElementById("play");
let stopButton = document.getElementById("stop");
let nextButton = document.getElementById("next");

let musicProgressContainer = document.getElementById("musicProgressContainer");
let musicProgressPercent = document.getElementById("musicProgressPercent");
let musicProgressBar = document.getElementById("musicProgressBar");


let moreLessButton: HTMLElement = document.getElementById("more_less");
let volumeButton: HTMLElement = document.getElementById("volumeManager");
let volumeControle: HTMLElement = document.getElementById("volumeControle");
let shuffleButton: HTMLElement = document.getElementById("shuffleButton");
let repeatButton: HTMLElement = document.getElementById("repeatButton");

let loader = document.getElementById("loader");
let currentMusicDiv = document.getElementById("currentMusic");

let currentMusic: HTMLElement;
let audioPlayerEstate = {
    play: false,
}
let unmuttedVolume = parseFloat((volumeControle as HTMLInputElement).value);
let currentPlaylist = [];
let currentPlaylistIndex: number;
let nextPlaylist = [];
let firstLoad = true;

let shuffleModeOn = false;
let nbMusics: number;
let shuffledIndexes: number[];
let lastSearch;
let repeatModeOn = false;

let buttonsExtanded = false;

let fromLocalStorage = false;

function play() {
    audioPlayerEstate.play = true;
    (playButton as HTMLImageElement).src = "images/icons/pause.png";
    (audioPlayer as HTMLMediaElement).play();
}
function pause() {
    audioPlayerEstate.play = false;
    (playButton as HTMLImageElement).src = "images/icons/play.png";
    (audioPlayer as HTMLMediaElement).pause();
}
function next() {
    if (currentPlaylist.length - 1 != currentPlaylistIndex) {
        (audioPlayer as HTMLMediaElement).pause();
        (audioPlayer as HTMLMediaElement).currentTime = 0;
        currentPlaylistIndex++;
        changeMusicFromId();
    } else {
        pause();
    }
}
function previous() {
    if ((audioPlayer as HTMLMediaElement).currentTime <= 5 && currentPlaylistIndex > 0) {
        (audioPlayer as HTMLMediaElement).pause();
        currentPlaylistIndex--;
        changeMusicFromId();
    } else {
        (audioPlayer as HTMLMediaElement).currentTime = 0;
    }
}
function changeMusicFromId() {
    let index = shuffleModeOn ? shuffledIndexes[currentPlaylistIndex] : currentPlaylistIndex;
    socket.emit("searchMusicById", currentPlaylist[index]);
    highlightMusicElement(((musicList as HTMLElement).children[index].firstElementChild.firstElementChild as HTMLElement));
}
function search(params: Object) {
    socket.emit("search", params);
    lastSearch = params;
}

function clearMusicList() {
    musicList.innerHTML = "";
}

function getMusicDatas(selectedMusicElement: HTMLElement) {
    let artist = selectedMusicElement.getElementsByClassName("artist")[0].innerHTML;
    let title = selectedMusicElement.getElementsByClassName("title")[0].innerHTML;
    return ({ "artist": artist, "title": title });
}
function changeCurrentMusicDisplay(datas) {
    let newContent = (datas.artist ? datas.artist + " - " : "") + datas.title;
    currentMusicDiv.innerHTML = newContent;
}

function highlightMusicElement(playingMusicElement: HTMLElement) {
    if (currentMusic) {
        if (currentMusic.classList.contains("playing")) {
            currentMusic.classList.remove("playing");
        }
    }
    currentMusic = (playingMusicElement as HTMLElement).parentElement.parentElement;
    changeCurrentMusicDisplay(getMusicDatas(currentMusic));
    currentMusic.classList.add("playing");
}

function generateShuffledList(nbElements: number): number[] {
    var availableIndexes = [];
    var shuffledList = [];
    for (var i = 0; i < nbElements; i++) {
        availableIndexes[i] = i;
    }
    for (var i = nbElements - 1; i >= 0; i--) {
        shuffledList[shuffledList.length] = availableIndexes.splice(Math.ceil(Math.random() * i), 1)[0];
    }

    saveShuffledIndexes(shuffledList);
    return shuffledList;
}

function secondsToHMinSec(time: number): string {
    if (isNaN(time)) {
        time = 0;
    }
    let minutes = 0;
    let seconds = 0;
    let hours = 0;
    if (time / 60 >= 1) {
        minutes = Math.floor(time / 60);
        seconds = Math.floor(time - minutes * 60);
        if (minutes / 60 >= 1) {
            hours = Math.floor(minutes / 60);
            minutes = Math.floor(minutes - hours * 60);
        }
    } else {
        seconds = Math.floor(time);
    }
    return (hours > 0 ? hours + ":" : "") + (minutes.toString().length == 1 ? "0" : "") + minutes + ":" + (seconds.toString().length == 1 ? "0" : "") + seconds;
}

function saveShuffledIndexes(shuffledList: number[]) {
    localStorage.setItem("shuffledIndexes", JSON.stringify(shuffledList));
}

function removeShuffledIndexes() {
    localStorage.removeItem("shuffledIndexes");
}

function savePlaylistSearch(searchParams: Object) {
    localStorage.setItem("searchParams", JSON.stringify(searchParams));
}

function savePlayingMusic() {
    localStorage.setItem("currentIndex", currentPlaylistIndex.toString());
}
function saveVolume() {
    localStorage.setItem("currentIndex", (volumeControle as HTMLInputElement).value);
}
function saveCurrentTime() {
    localStorage.setItem("currentTime", (audioPlayer as HTMLMediaElement).currentTime.toString());
}
(() => {
    (audioPlayer as HTMLMediaElement).volume = parseFloat((volumeControle as HTMLInputElement).value);

    searchBar.addEventListener("keypress", (e) => {
        if (e.keyCode == 13) {
            searchButton.click();
        }
    });
    searchBar.addEventListener("click", () => {
        (searchBar as HTMLInputElement).placeholder = "";
    });

    searchButton.addEventListener("click", () => {
        (loader as HTMLElement).style.display = "block";
        let params = (searchBar as HTMLInputElement).value;
        search({
            title: params,
            artist: params,
            albumartist: params,
            album: params,
            genre: params,
            sort: { artist: 1, album: 1, titleLC: 1 }
        });
    });

    home.addEventListener("click", () => {
        (loader as HTMLElement).style.display = "block";
        search({ title: "", sort: { artist: 1, album: 1, titleLC: 1 } });
    });

    musicFields.addEventListener("click", (e) => {
        let className = (e.target as HTMLElement).className;
        if (className) {
            (loader as HTMLElement).style.display = "inline-block";
            search({
                title: lastSearch.title,
                artist: lastSearch.artist,
                albumartist: lastSearch.albumartist,
                album: lastSearch.album,
                genre: lastSearch.genre,
                sort: { [className === "title" ? "titleLC" : className]: 1 }
            });
        }
    });

    //Make the music in play/pause estate
    playButton.addEventListener("click", () => {
        audioPlayerEstate.play ? pause() : play();
    });

    //Reset the current music
    stopButton.addEventListener("click", () => {
        (audioPlayer as HTMLMediaElement).currentTime = 0;
        pause();
    });

    nextButton.addEventListener("click", () => {
        (audioPlayer as HTMLMediaElement).currentTime = 0;
        next();
    });

    previousButton.addEventListener("click", () => {
        previous();
        audioPlayerEstate.play ? play() : pause();
    });
    volumeButton.addEventListener("click", () => {
        volumeButton.className = "disabled";
        if ((volumeButton as HTMLImageElement).currentSrc.indexOf("volume.png") != -1) {
            (volumeButton as HTMLImageElement).src = "images/icons/volumeOff.png";
            unmuttedVolume = parseFloat((volumeControle as HTMLInputElement).value);
            (audioPlayer as HTMLMediaElement).volume = 0;
        } else {
            volumeButton.className = "enabled";
            (volumeButton as HTMLImageElement).src = "images/icons/volume.png";
            (audioPlayer as HTMLMediaElement).volume = unmuttedVolume;
        }
    });
    volumeButton.addEventListener("mouseover", () => {
        volumeControle.style.display = "inline-block";
    });
    volumeButton.addEventListener("mouseleave", () => {
        volumeControle.style.display = "none";
    });
    volumeControle.addEventListener("mouseover", () => {
        volumeControle.style.display = "inline-block";
    });
    volumeControle.addEventListener("mouseleave", () => {
        volumeControle.style.display = "none";
    });

    musicList.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).classList.toString().split(" ").indexOf("playMusic") != -1) {
            stopButton.click();
            (audioPlayer as HTMLMediaElement).src = (e.target as HTMLElement).id;
            play();
            let musicElements = musicList.children;
            for (let i = 0; i < musicElements.length; i++) {
                if (musicElements[i].contains(e.target as Node)) {
                    //Put the currentMusic as first of the random playlist
                    if (shuffleModeOn) {
                        shuffledIndexes = generateShuffledList(nbMusics);
                        shuffledIndexes.splice(shuffledIndexes.indexOf(i), 1);
                        shuffledIndexes.unshift(i);
                        currentPlaylistIndex = 0;
                    } else {
                        currentPlaylistIndex = i;
                    }
                    break;
                }
            }
            highlightMusicElement((e.target as HTMLElement));
        }
    });

    //Change progression on the progress bar when the music passes
    (audioPlayer as HTMLMediaElement).addEventListener("timeupdate", (e) => {
        let totalDuration = (e.target as HTMLMediaElement).duration;
        let fraction = (e.target as HTMLMediaElement).currentTime / totalDuration;
        let progress = fraction * 100;
        musicProgressBar.style.width = progress + "%";
        let time = progress * totalDuration / 100;
        musicProgressPercent.textContent = secondsToHMinSec(time) + " / " + secondsToHMinSec(totalDuration);
        if ((e.target as HTMLMediaElement).currentTime == totalDuration) {
            if (repeatModeOn) {
                (audioPlayer as HTMLMediaElement).currentTime = 0;
                play();
            } else {
                next();
            }
        }
    });

    musicProgressContainer.addEventListener("click", (e) => {
        let offsetX = (musicProgressContainer as HTMLElement).offsetLeft;
        let clientX = e.clientX;
        let totWidth = (musicProgressContainer as HTMLElement).offsetWidth;
        let progress = (clientX - offsetX) / totWidth * 100;
        (audioPlayer as HTMLMediaElement).currentTime = (audioPlayer as HTMLMediaElement).duration * progress / 100;
    });

    //Change the volume
    (volumeControle as HTMLInputElement).addEventListener("input", (e) => {
        (audioPlayer as HTMLMediaElement).volume = parseFloat((e.target as HTMLInputElement).value);
    });

    shuffleButton.addEventListener("click", () => {
        if (shuffleButton.className == "disabled") {
            shuffleButton.className = "enabled";
            shuffledIndexes = generateShuffledList(nbMusics);
            shuffledIndexes.splice(shuffledIndexes.indexOf(currentPlaylistIndex), 1);
            shuffledIndexes.unshift(currentPlaylistIndex);
            currentPlaylistIndex = 0;
            shuffleModeOn = true;
        } else {
            currentPlaylistIndex = shuffledIndexes[currentPlaylistIndex];
            shuffleButton.className = "disabled";
            shuffleModeOn = false;
            removeShuffledIndexes();
        }
    });

    repeatButton.addEventListener("click", () => {
        if (repeatButton.className == "disabled") {
            repeatButton.className = "enabled";
            repeatModeOn = true;
        } else {
            repeatButton.className = "disabled";
            repeatModeOn = false;

        }
    });

    moreLessButton.addEventListener("click", () => {
        if (buttonsExtanded) {
            buttonsExtanded = false;
            moreLessButton.className = "";
            shuffleButton.parentElement.parentElement.className = "";
        } else {
            moreLessButton.className = "extanded";
            shuffleButton.parentElement.parentElement.className = "extanded";
            buttonsExtanded = true;
        }
    });

    window.addEventListener("keypress", (e) => {
        if ((e.target as HTMLElement).tagName != "INPUT") {
            switch (e.keyCode) {
                case 37:
                    previousButton.click();
                    break;
                case 39:
                    nextButton.click();
                    break;
            }
        }
    });
    window.addEventListener("keydown", (e) => {
        if (e.keyCode === 32 && (e.target as HTMLElement).tagName != "INPUT") {
            e.preventDefault();
            if (audioPlayerEstate)
                audioPlayerEstate.play ? pause() : play();
        }
    });

    window.onbeforeunload = (e) => {
        savePlayingMusic();
        saveCurrentTime();
        savePlaylistSearch(lastSearch);
    }

    window.addEventListener("scroll", (e) => {
        scroll(0, scrollY);
    });

    socket.on("researchResults", (results) => {
        clearMusicList();
        (loader as HTMLElement).style.display = "none";
        currentPlaylist = [];
        currentPlaylistIndex = 0;
        nbMusics = results.length;
        results.forEach((result) => {

            currentPlaylist[currentPlaylist.length] = result._id;

            let newMusicDivTitle = document.createElement("div");
            newMusicDivTitle.innerHTML = result.title;
            newMusicDivTitle.className = "title musicFields";

            let newMusicDivArtist = document.createElement("div");
            newMusicDivArtist.innerHTML = result.artist;
            newMusicDivArtist.className = "artist musicFields";

            let newMusicDivAlbum = document.createElement("div");
            newMusicDivAlbum.innerHTML = result.album;
            newMusicDivAlbum.className = "album musicFields";

            let newMusicDivGenre = document.createElement("div");
            newMusicDivGenre.innerHTML = result.genre;
            newMusicDivGenre.className = "genre musicFields";

            let newMusicDivYear = document.createElement("div");
            newMusicDivYear.innerHTML = result.year;
            newMusicDivYear.className = "year musicFields";

            let playImg = document.createElement("img");
            playImg.className = "playMusic";
            playImg.src = "images/icons/miniPlay.png";
            playImg.id = result.path;

            let newMusicDiv = document.createElement("div");
            newMusicDiv.className = "musicDiv";
            newMusicDiv.appendChild(playImg);
            newMusicDiv.appendChild(newMusicDivTitle);
            newMusicDiv.appendChild(newMusicDivArtist);
            newMusicDiv.appendChild(newMusicDivAlbum);
            newMusicDiv.appendChild(newMusicDivGenre);
            newMusicDiv.appendChild(newMusicDivYear);

            let newMusicLi = document.createElement("li");
            newMusicLi.appendChild(newMusicDiv);
            musicList.appendChild(newMusicLi);
        });
        if (firstLoad && musicList.firstElementChild) {
            if (fromLocalStorage) {
                if (localStorage.getItem("currentIndex")) {
                    currentPlaylistIndex = parseInt(localStorage.getItem("currentIndex"));
                    if (localStorage.getItem("currentTime")) {
                        (audioPlayer as HTMLMediaElement).currentTime = parseFloat(localStorage.getItem("currentTime"));
                    }
                }
                fromLocalStorage = false;
            } else if (shuffleModeOn) {
                shuffledIndexes = generateShuffledList(nbMusics);
            }
            changeMusicFromId();
        }
    });
    socket.on("searchMusicByIdResult", (result) => {
        (audioPlayer as HTMLMediaElement).src = result.path;
        changeCurrentMusicDisplay({ artist: result.artist[0], title: result.title });
        if (audioPlayerEstate.play == true) {
            play();
        }
    });
    if (localStorage.getItem("searchParams")) {
        fromLocalStorage = true;
        lastSearch = JSON.parse(localStorage.getItem("searchParams"))
        search(lastSearch);
        if (localStorage.getItem("shuffledIndexes")) {
            shuffledIndexes = JSON.parse(localStorage.getItem("shuffledIndexes"));
            shuffleModeOn = true;
            shuffleButton.className = "enabled";
            if (localStorage.getItem("volume")) {
                let volume = localStorage.getItem("volume");
                (volumeControle as HTMLInputElement).value = volume;
                (audioPlayer as HTMLMediaElement).volume = parseFloat(volume);
            }
        }
    } else {
        search({ title: "", sort: { artist: 1, album: 1, titleLC: 1 } });
    }

    let userA = navigator.userAgent.toLowerCase();
    /*if (userA.indexOf("android") > -1) {
        let closeAlertButton = document.getElementById("closeAndrAlrt");
        closeAlertButton.addEventListener("click", () => {
            alertAndroidDiv.style.display = "none";
        });

        let alertAndroidDiv = document.getElementById("alertAndroid");
        alertAndroidDiv.style.display = "inline-block";
    }*/
})();
