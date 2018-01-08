var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var count = 1;
var rooms = [];

function registerUser(socket, nickname){
	var pre_nick = socket.nickname;
    if( pre_nick != undefined ) {
    	delete rooms[socket.room].socket_ids[pre_nick];
    }
    socket.nickname = nickname;
    rooms[socket.room].socket_ids[nickname] = socket.id
    io.in(socket.room).emit('userlist',{users:Object.keys(rooms[socket.room].socket_ids)});
}

function deleteUser(socket){
	if(socket.room != undefined) {
		socket.broadcast.in(socket.room).emit('close room', {nickname:socket.nickname});
	    delete rooms[socket.room].socket_ids[socket.nickname];
	    io.in(socket.room).emit('userlist',{users:Object.keys(rooms[socket.room].socket_ids)});
	    socket.leave(socket.room);
	}
}

io.on('connection', function(socket){
	socket.nickname = 'GUEST-'+count;
	count++;
	
	socket.on('join room', function(data){
		var room = 'room' + data.roomId;
		socket.room = room;
		socket.join(socket.room);	
		
        if (rooms[socket.room] == undefined) {
            rooms[socket.room] = new Object();
            rooms[socket.room].socket_ids = new Object();
        }

        socket.emit('new',{nickname:socket.nickname});
		registerUser(socket, socket.nickname);	
	
	    socket.broadcast.in(socket.room).emit('open room', {nickname:socket.nickname});    
	});

    socket.on('changename',function(data){
        registerUser(socket,data.nickname);
    });

    socket.on('leave room', function(data){
    	deleteUser(socket);
    })

	socket.on('disconnect', function(data){ 
		deleteUser(socket);
	});

	socket.on('send message', function(data){
		if(data.to == 'ALL') {
			data.msg = socket.nickname + ' : ' + data.msg;
			io.in(socket.room).emit('receive message', data);
		} else {
			socket_id = rooms[socket.room].socket_ids[data.to];
			if(socket_id != undefined){
				data.msg = socket.nickname + ' -> ' + data.to + ' : ' + data.msg;
				io.sockets.to(socket.id).to(socket_id).emit('receive message', data);
			}	
		}
		
	});
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});