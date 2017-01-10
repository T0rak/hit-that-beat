import * as express from "express";
import * as http from "http";
import * as SocketIo from "socket.io";
import * as gracefulFS from "graceful-fs";
import * as mm from "musicmetadata";
import * as eventEmitter from "events";
import * as mongoose from "mongoose";
import * as serve_favicon from "serve-favicon";
import * as bodyParser from "body-parser";

let app = express();
let server = http.createServer(app);
let io = require("socket.io")(server);

app.use(serve_favicon(__dirname + "/public/images/icons/logov2.png"));
let config = {
    serverPort: 8080,
    dataFolderPath: __dirname + "/data/",
    musicFolderPath: __dirname + "/public/musics"
};

interface track {
    _id: string,
    title: string,
    titleLC: string,
    artist: string[],
    albumartist: string[],
    album: string,
    year: string,
    track: { no: number, of: number },
    genre: string[],
    disk: { no: number, of: number },
    picture: [{ format: string, data: Buffer }],
    duration: number,
    path: string
};

//Sessions

import * as Session from "express-session";
import * as sessionStorage from "session-file-store";

// initializing express-session middleware
let SessionStore = sessionStorage(Session);
let session = Session({
    store: new SessionStore({
        path: __dirname+'/tmp/sessions',
        cookie: {maxAge: 1000*60*60*24}
    }),
    secret: '_9@cZ3aErJpFKG4q:uPegT7hzS_*evXéLS', resave: true, saveUninitialized: true
});

app.use(session);

import * as ios from "socket.io-express-session";
io.use(ios(session));

app.use(express.static(__dirname + "/public"));
let urlencodedParser = bodyParser.urlencoded({extended: false});
app.set("view engine", "pug");
server.listen(config.serverPort);

app.get("/", (req, res) => {
    if(req.session.uid){
        res.render("index.pug");
    }else{
        res.render("login.pug");
    }
});

//Temporary password management
app.post("/", urlencodedParser, (req, res) => {
    if(req.body.id === "default" && req.body.pwd === "password"){
        req.session.uid = Date.now();
        //console.log("uid:" + req.session.uid);
        res.render("index.pug");
    }else{
        //console.log("Nope ! " + req.body.id + " / " + req.body.pwd);
        res.render("login.pug");
    }
});
let validExtensions = ["ogg", "mp3", "flac", "wav", "mp4", "wma"];

console.log("Server is listening on port : " + config.serverPort);

/*--------------------------------------------------------
                        SOCKET IO
---------------------------------------------------------*/

io.on("connection", (socket) => {
    console.log("A user has connected !");

    socket.on("search", (params) => {
        if(socket.handshake.session.uid){
            Music.find(
                {
                    $or: [
                        { "title": new RegExp("[a-z0-9]*" + params.title + "[a-z0-9]*", "i") },
                        { "artist": new RegExp("[a-z0-9]*" + params.artist + "[a-z0-9]*", "i") },
                        { "albumartist": new RegExp("[a-z0-9]*" + params.albumartist + "[a-z0-9]*", "i") },
                        { "album": new RegExp("[a-z0-9]*" + params.album + "[a-z0-9]*", "i") }
                    ]
                },
                "title artist albumartist album genre path year",
                (err, results) => {
                    if (err) console.error(err);
                    else {
                        //console.log(results);
                        socket.emit("researchResults", results);
                    }
                }
            ).sort(params.sort);
        }else{
            console.log("Illegal access attempt !");
            socket.emit("message", "Connect yourself !");
        }
    });
    socket.on("searchMusicById", (param) => {
        if(socket.handshake.session.uid){
            Music.findOne({ "_id": param }, "title artist path", (err, result) => {
                if (err) console.error(err);
                else {
                    console.log("searchMuicById : " + result);
                    socket.emit("searchMusicByIdResult", result);
                }
            });
        }else{
            console.log("Illegal access attempt !");
            socket.emit("message", "Connect yourself !");
        }
    });
});

/*--------------------------------------------------------
                    FILE MANGAEMENT
---------------------------------------------------------*/

/*Count the files recursively in a folder
    @param: folderPath: string -> Path of the music folder
    [@param: nbFiles: number[]: number[ 
        nbFiles -> number of files,
        nbAudioFiles -> number of audio files
    ]]
    @return: number[
        nbFiles -> number of files,
        nbAudioFiles -> number of audio files
    ]
*/
function countFiles(folderPath: string, nbFiles?: number[]) {
    nbFiles = nbFiles == undefined ? [0, 0] : nbFiles;
    gracefulFS.readdirSync(folderPath).forEach((item) => {
        let itemPath = folderPath + "/" + item;
        let itemStats = gracefulFS.statSync(itemPath);
        if (itemStats.isFile()) {
            let splittedName = item.split(".");
            if (validExtensions.indexOf(splittedName[splittedName.length - 1].toLowerCase()) != -1) {
                nbFiles[1]++;
            }
            nbFiles[0]++;
        } else countFiles(itemPath, nbFiles);
    });
    return nbFiles;
}

/*Write the music metadatad of a folder in a json file
    @param: musicFolderPath: string -> Path of the music folder
    [@param: callback: Function -> function to execute at the end of the files reading]
    @return: void
*/
function generateMusicFolderJson(musicFolderPath: string, tracks?: track[], callback?: Function): void {
    tracks = tracks == undefined ? [] : tracks;
    gracefulFS.readdir(musicFolderPath, (err, items) => {
        if (err) {
            console.error(err);
        } else {
            items.forEach((item, index) => {

                let itemPath = musicFolderPath + "/" + item;
                if (gracefulFS.statSync(itemPath).isDirectory()) {
                    generateMusicFolderJson(itemPath, tracks, callback);
                } else {
                    let splittedName = item.split(".");
                    if (validExtensions.indexOf(splittedName[splittedName.length - 1].toLowerCase()) != -1) {
                        let fileRS = gracefulFS.createReadStream(itemPath);
                        mm(fileRS, /*{duration: true},*/(err, metadata) => {
                            if (err) {
                                console.log(readFiles + ": " + itemPath);
                                emitter.emit("closeFile");

                                if (readFiles === nbFiles[1]) {
                                    gracefulFS.appendFile(config.dataFolderPath + "musicsData.json", JSON.stringify(tracks, null, 4), (err) => {
                                        if (err) {
                                            console.error(err);
                                        }
                                        callback();
                                    });
                                }
                            } else {
                                metadata.picture = null;
                                //add the path to the audio file
                                let splittedItemPath = itemPath.split("public/");
                                metadata.path = splittedItemPath[splittedItemPath.length - 1];

                                //title management if doesn't exist
                                metadata.title = metadata.title.trim();
                                if (!metadata.title) {
                                    let splittedItemName = item.split(".");
                                    splittedItemName.pop();
                                    item = splittedItemName.join().trim();
                                    let titleWithoutArtist = item.split("-");
                                    //author management if it doesn't exist
                                    if (titleWithoutArtist.length > 1) {
                                        metadata.title = titleWithoutArtist[1].trim();
                                    } else {
                                        metadata.title = item.trim();
                                    }
                                }
                                let newTrack: track = metadata;
                                tracks[tracks.length] = newTrack;
                                //console.log(readFiles + ": " + itemPath);
                                emitter.emit("closeFile");

                                if (readFiles === nbFiles[1]) {
                                    gracefulFS.appendFile(config.dataFolderPath + "newMusics.json", JSON.stringify(tracks, null, 4), (err) => {
                                        if (err) {
                                            console.error(err);
                                        }
                                        callback();
                                    });
                                }
                            }
                            fileRS.close();
                        });
                    }
                }
            });
        }
    });
}

/*--------------------------------------------------------
                    DATABASE MANAGEMENT
---------------------------------------------------------*/

let database = {
    uri: "mongodb://localhost:27017/musics"
};

mongoose.connect(database.uri, (err) => {
    if (err) {
        console.error(err);
    }
});

let db = mongoose.connection;

db.on("error", (err) => {
    console.error(err);
});

db.once("open", () => {
    console.log("Connected to database : " + database.uri);
});

let musicSchema = new mongoose.Schema({
    title: String,
    titleLC: String,
    artist: [String],
    albumartist: [String],
    album: String,
    year: String,
    track: { no: Number, of: Number },
    genre: [String],
    disk: { no: Number, of: Number },
    picture: [{ format: String, data: Buffer }],
    duration: Number,
    path: String
});
let Music = mongoose.model("music", musicSchema);

function insertMusicsData() {
    gracefulFS.readFile(config.musicFolderPath, (err, data) => {
        gracefulFS.readFile(config.dataFolderPath + "musicsData.json", (err, data) => {
            if (err) {
                console.error(err);
            } else {
                let truc = JSON.parse(data.toString());
                truc.forEach((music: track) => {

                    //Il faudra voir pour le gérer sur la base de donnée après chaque insertion
                    music.titleLC = music.title.toLowerCase();

                    let newMusic = new Music(music);
                    newMusic.save((err) => {
                        err ? console.error(err) : console.log("Saved :" + music.title);
                    });
                });
            }
        });
    });
}

/*Remove music in the database
    @param: properties: Object -> properties of the musics that will be deleted
    @return: void
*/
function removeDatas(properties: Object) {
    Music.find(properties).remove((err) => {
        if (err) console.error(err);
    });
}

//generate the music list from the json file
let musics = [];
let dataFileStats = gracefulFS.statSync(config.dataFolderPath + "musicsData.json");
if (dataFileStats) {
    if (dataFileStats.size > 0) {
        let data = gracefulFS.readFileSync(config.dataFolderPath + "musicsData.json", "utf-8");
        musics = JSON.parse(data);
    }
}

let readFiles = 0
let emitter = new eventEmitter.EventEmitter();
emitter.on("closeFile", () => {
    readFiles++;
});

//Delete newMusics.json if it exists
gracefulFS.stat(config.dataFolderPath + "newMusics.json", (err) => {
    if (!err) {
        gracefulFS.unlink(config.dataFolderPath + "newMusics.json", (err) => {
            err ? console.error(err) : "";
        });
    }
    gracefulFS.writeFile(config.dataFolderPath + "newMusics.json", "", (err) => {
        err ? console.error(err) : "";
    });
});


//Create a json file containing musics metadatas
let musicsDataFileName = config.dataFolderPath + "newMusics.json";
let nbFiles = countFiles(config.musicFolderPath);

console.log("nombre de fichiers : " + nbFiles[0]);
console.log("nombre de fichiers musicaux: " + nbFiles[1]);

generateMusicFolderJson(config.musicFolderPath, undefined, () => {
    console.log("Scan terminé !");
    gracefulFS.renameSync(musicsDataFileName, config.dataFolderPath + "musicsData.json");
    removeDatas({});
    insertMusicsData();
});