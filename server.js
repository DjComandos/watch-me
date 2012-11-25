// https://github.com/LearnBoost/socket.io
// http://twitter.github.com/bootstrap/base-css.html#buttons

var path = require('path'),
    express = require('express'),
    port = process.env.PORT || 8080,
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    gameState = {}, /* contains TicTacToe object for each created game */
    users = {},     /* contains all users connected to the server */
    watchers = {}, /* contains array of watchers' sockets for each flow */
    games = {};     /* contains all created games */

app.use(express.static(path.join(__dirname, 'static')));
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
    var userName,
        currentGame,
        isMaster = false;
    
    function changeUsersCount(){
        socket.broadcast.json.emit('usersListChanged', {'users': users, 'games': games});
    }
    
    socket.json.emit({'event': 'connected', 'time': (new Date).toLocaleTimeString()});
    

    socket.on('login', function (data) {
        if(!!data && !!data.name && !users[data.name.toLowerCase()]) {
            userName = data.name;
            users[userName.toLowerCase()] = userName;
            socket.json.emit('userloggedin', {'name': userName, 'users': users, 'games': games});
            changeUsersCount();
        } else if (users[data.name.toLowerCase()]) {
            socket.json.emit('onLogInError', {'msg': 'user with name ' + data.name + ' has already connected'});
        } else {
            socket.json.emit('onLogInError', {'msg': 'server error: wrong data format'});
        }
    });
    

    socket.on('createVideoRoom', function (data){
        currentGame = ([userName, '_', data.gameName]).join('');
        isMaster = true;
        games[currentGame] = { id: currentGame, 
                                name: data.gameName,
                                user: userName, 
                                isAvailable: true
                            };
        
        watchers[currentGame] = {ownersSocket: socket, watchersSockets: []};

        //console.log('streamsServerVideo' + currentGame + ' subscribed');

        socket.on('streamsServerVideo' + currentGame, function (clientRequest, sendToClientCallback) {
            //console.log('streamsServerVideo' + currentGame + ' pachet received');
            if(watchers[currentGame].watchersSockets.length > 0) {
                io.sockets.volatile.emit('streamsServerVideo' + currentGame, clientRequest.base64Frame );
            }
        });

        socket.json.emit('gameHosted', {'game': games[currentGame]});
        socket.broadcast.json.emit('gamesListChanged', {'games': games});
    });
    

    socket.on('connectToGame', function (data){
        currentGame = data.gameName;
        if(!!games[currentGame]) {
            var isFirstWatcher = watchers[currentGame].watchersSockets.length == 0;
            watchers[currentGame].watchersSockets.push(socket);

            var gameData = { name: currentGame, 
                        user: games[currentGame].user
                    };

            socket.json.emit('gameStarted', gameData);
            if(isFirstWatcher) {
                gameData.isMaster = true;
                watchers[currentGame].ownersSocket.json.emit('gameStarted', gameData);
            }

        } else {
            console.log('Game with name "' + currentGame + '" not found');
        }

    });
    

    socket.on('disconnect', function() {
        isMaster = false;
        if(!!userName) {
            delete users[userName.toLowerCase()];
        }
        if(!!currentGame) {
            delete games[currentGame]; 
            delete gameState[currentGame];
        }
        changeUsersCount();
    });
});

server.listen(port);