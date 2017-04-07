var http = require('http');

var server = http.createServer(function(req, res) {
    res.writeHead(200, {"Content-Type": "text/plain"})
    res.write('[ Affichage du contenu non-autorisé ]')
    res.end();
});

var mysql = require('mysql')
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'tchat'
})

var users = [];
db.connect();
db.query('SELECT * FROM users ORDER BY id', function(err, data) {
	users = data;
})
console.log(users);

var io = require('socket.io').listen(server);

var messages = [];
db.query('SELECT * FROM messages', function(err, data) {
	messages = data;
})

var users_list = [];
var my_name = '';

io.sockets.on('connection', function(socket) {

    socket.on('disconnect', function() {
        if(my_name != '') {
            users_list = users_list.filter(my_name => my_name > -1)
        }
    })

	socket.on('VerifyLogin', function(login){
        var is_ok_login = false;
		users.forEach(function(user){
			if(user.name === login.pseudo && user.password === login.password) {
                var is_ok_connect = true;
                users_list.forEach(function(el) {
                    if(el === login.pseudo) {
                        socket.emit('LoginIsValid', false);
                        socket.emit('ShowAlert', {
                            message: 'Cet utilisateur semble déjà connecté.',
                            type: 'error'
                        });
                        is_ok_connect = false;
                        is_ok_login = true;
                    }
                })
                if(is_ok_connect) {
                    socket.emit('LoginIsValid', true);
				    socket.emit('InitMessages', messages)
				    users_list.push(user.name);
				    io.sockets.emit('NewUser', users_list);
                    is_ok_login = true;
                    my_name = login.pseudo;
                    let moment = require('moment');
                    moment.locale('fr');
                    let time = moment(new Date).calendar();
                    io.sockets.emit('ShowMessages', {
                        text: login.pseudo + ' vient de se connecter au tchat.',
                        author: '',
                        date: time
                    });
                }
			}
		})
		if(!is_ok_login) {
            socket.emit('LoginIsValid', false);
		    socket.emit('ShowAlert', {
                message: 'Pseudo ou mot de passe invalide.',
                type: 'error'
            });
        }
	})

	socket.on('NewMessage', function(data){
		let moment = require('moment');
		moment.locale('fr');
		let time = moment(new Date).calendar();
		let NewMessage = {
			text: data.message,
			author: data.name,
			date: time
		}
		let sql = db.format('INSERT INTO messages (text, author, date) VALUES (?, ?, ?)', [data.message, data.name, time]);
		db.query(sql, function(err, data) { })
		io.sockets.emit('ShowMessages', NewMessage);
	})

});

// db.end();

server.listen(8080);
console.log('>> Serveur lancé sur le port 8080...');