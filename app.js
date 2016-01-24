/*
 Module Dependancies
*/
var express = require('express'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
	http = require('http'),
	mongoose = require('mongoose');
    hash = require('./pass').hash;

var app = express();

/*
 Database and Models
*/

var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {
});

mongoose.connect("mongodb://localhost/test/users"); //FIX ME

var UserSchema = new mongoose.Schema({
	username: String,
	password: String
    //salt: String,
    //hash: String
});

var User = mongoose.model('users', UserSchema); //Reads into 'users' collection
/*
 Middlewares and Configurations
*/
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'ssshhhhh',
  resave: false,
  saveUninitialized: true,
}));
app.use(express.static('public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(function (req, res, next) {
	var err = req.session.error,
		msg = req.session.success;
	delete req.session.error;
	delete req.session.success;
	res.locals.message = '';
	if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
	if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
	next();
});
/*
 Helper Functions
*/
function authenticate(name, pass, fn) {
    if (!module.parent) console.log('authenticating %s:%s', name, pass);

    User.findOne({
        username: name,
        password: pass,
    },

    function (err, user) { //How does it know what variables are meant?
        if (user) {
            if (err) return fn(new Error('cannot find user'));
            //hash(pass, user.salt, function (err, hash) {
                //if (err) return fn(err);
                if (pass == user.password) return fn(null, user);
                fn(new Error('invalid password'));
            //});
            
        } else {
            return fn(new Error('cannot find user'));
        }
    });

}

function requiredAuthentication(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

function userExist(req, res, next) {
    User.count({
        username: req.body.username
    }, function (err, count) {
        if (count === 0) {
            next();
        } else {
            req.session.error = "User Exist"
            res.redirect("/signup");
        }
    });
}
/*
 Routes
*/
app.get("/", function (req, res) {

    if (req.session.user) {
        res.send("Welcome " + req.session.user.username + "<br>" + "<a href='/logout'>logout</a>");
    } else {
        res.send("<a href='/login'> Login</a>" + "<br>" + "<a href='/signup'> Sign Up</a>");
        console.log(req.session.user);
    }
});

app.get("/signup", function (req, res) {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("signup");
    }
});

app.post("/signup", userExist, function (req, res) {
    var pw = req.body.password;
    var un = req.body.username;

    //hash(pw, function (err, salt, hash) {
        //if (err) throw err;
        var user = new User({
            username: un,
            //salt: salt,
            //hash: hash,
            password: pw,
        }).save(function (err, newUser) {
            if (err) throw err;
            authenticate(newUser.username, newUser.password, function(err, user){
                if(user){
                    req.session.regenerate(function(){
                        req.session.user = user;
                        req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                        res.redirect('/');
                    });
                }
            });
        });
    });
//});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post("/login", function (req, res) {
    authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {

            req.session.regenerate(function () {

                req.session.user = user;
                req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('/');
            });
        } else {
            req.session.error = 'Authentication failed, please check your ' + ' username and password.';
            res.redirect('/login');
        }
    });
});

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

app.get('/profile', requiredAuthentication, function (req, res) {
    res.send('Profile page of '+ req.session.user.username +'<br>'+' click to <a href="/logout">logout</a>');
});


http.createServer(app).listen(3000);
