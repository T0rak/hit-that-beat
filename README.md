# An online Music player
## Setup
1) Install [Nodejs](https://nodejs.org/en/download/)
2) Install [MongoDB](https://www.mongodb.com/download-center)
3) Create the musics database
    1) In the root directory, create the next folders "/data/db"
    1) In a terminal, select the "bin" directory where mongoDB is installed
    2) Type the command `mongod`
    3) In a new terminal in the same directory as before, type `mongo`
    4) Type the command `use musics`
4) In a new terminal, select the project folder and type `npm install -g typescript`
5) type `npm install`
6) When the loading is finished, type `tsc -w`

## Put your musics to the right place
You have to put your musics in "online_music_player/public/musics"

## Run project
Type `npm run app`

## Connect to the application
1) Open your favourite browser and in the adress bar type localhost:8080
2) In the Identifier field type default
3) In the Password field type password
4) Press on the Submit button
5) You are connected !

This application isn't completely finished