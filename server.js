// https://github.com/LearnBoost/socket.io
// http://twitter.github.com/bootstrap/base-css.html#buttons

var path = require('path'),
    express = require('express'),
    port = process.env.PORT || 8080,
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = {};     /* contains all users connected to the server */

app.use(express.static(path.join(__dirname, 'static')));
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
    var userName;
    
    function changeUsersCount(){
        socket.broadcast.json.emit('usersListChanged', {'users': users});
    }
    
    socket.json.emit({'event': 'connected', 'time': (new Date).toLocaleTimeString()});
    

    socket.on('login', function (data) {
        if(!!data && !!data.name && !users[data.name.toLowerCase()]) {
            userName = data.name;
            users[userName.toLowerCase()] = userName;
            socket.json.emit('userloggedin', {'name': userName, 'users': users});
            changeUsersCount();
        } else if (users[data.name.toLowerCase()]) {
            socket.json.emit('onLogInError', {'msg': 'user with name ' + data.name + ' has already connected'});
        } else {
            socket.json.emit('onLogInError', {'msg': 'server error: wrong data format'});
        }
    });
    

    socket.on('disconnect', function() {
        isMaster = false;
        if(!!userName) {
            delete users[userName.toLowerCase()];
        }
        changeUsersCount();
    });
});

server.listen(port);