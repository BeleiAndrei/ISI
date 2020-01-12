const express = require('express');
const mustacheExpress = require('mustache-express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const session = require('express-session');
const Promise = require('bluebird');
const moment = require('moment');
var cookieParser = require('cookie-parser');

let db = new sqlite3.Database('river.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the river database.');
});

//body-parser
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// cookie-parser
app.use(cookieParser());

//Set rendering engines
app.engine('html', mustacheExpress());
app.set('view engine', 'html');

//Setting view pages
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: 'i like potatoes dunno',
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        secure: false
    },
}));

let nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'potato.cat001@gmail.com',
        pass: 'ilikepotatoes'
    }
});

app.get('/', (req, res) => {
    res.render('index', req.session.user);
});

app.get('/stations', (req, res) => {
    let sql = `SELECT * FROM Stations`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }

        res.send(JSON.stringify(rows));
    });
});

app.post('/register', (req, res) => {
    let userData = req.body;

    bcrypt.hash(userData.pass, saltRounds, function (err, hash) {
        db.serialize(function () {
            let stmt = db.prepare("INSERT INTO Users(Name, Email, Password, Phone, isAdmin) VALUES (?,?,?,?,?)");

            stmt.run([
                userData.name,
                userData.email,
                hash,
                userData.phone,
                0
            ]);

            stmt.finalize();

            res.send(JSON.stringify({
                name: userData.name
            }));
        });

    });

});

app.post('/login', (req, res) => {
    let userData = req.body;

    let sql = `SELECT * FROM Users where Email="` + userData.email + `"`;

    db.get(sql, [], (err, row) => {
        if (err) {
            throw err;
        }

        if (!row || row === undefined) {
            res.status(400).json({
                error: "Not found."
            });
            return;
        }

        bcrypt.compare(userData.password, row.Password).then(function (isValid) {
            if (isValid) {
                req.session.user = {
                    id: row.ID,
                    name: row.Name,
                    isAdmin: row.IsAdmin
                };

                res.status(200).json({
                    name: userData.name,
                    isAdmin: row.isAdmin
                });
            } else {
                res.status(400).json({
                    error: "Invalid password."
                });
            }
        });
    });
});

app.post('/logout', function (req, res) {

    let sess = req.session.user;
    if (sess) {
        req.session.user = null;
        res.json({
            'success': 200,
            'message': "Successfully logged out"
        });
    } else {
        res.status(200).send({});
    }
});

app.post('/solve', (req, res) => {
    let data = [1, req.body.id];
    let sql = `UPDATE Incidents
            SET Solved = ?
            WHERE ID = ?`;

    db.run(sql, data, function (err) {
        if (err) {
            res.status(500).send(err.message);
            return;
        }

        res.status(200).json({
            solved: true
        });
    });
});

app.get('/incidents', (req, res) => {
    let sql = "SELECT Incidents.ID, Incidents.Description, Incidents.Longitude, Incidents.Latitude, " +
        "Incidents.PM10, Incidents.SO2, Incidents.O3, Incidents.NO2, " + 
        "Incidents.ReportedByUserID, Incidents.Timestamp, Users.Name FROM Incidents LEFT JOIN Users " +
        "ON Incidents.ReportedByUserID=Users.ID WHERE Incidents.Solved=0";

    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }

        res.send(JSON.stringify(rows));
    });
});

app.get('/hotspots', (req, res) => {
    let sql = "SELECT Hotspots.ID, Hotspots.LocationName, Hotspots.Longitude, Hotspots.Latitude " +
        "From Hotspots";

    db.all(sql, [], (err, rows) => {
        if (err) {
            throw err;
        }

        res.send(JSON.stringify(rows));
    });
});

app.post('/incidents', (req, res) => {

    let description = req.body.description;
    let longitude = req.body.longitude;
    let latitude = req.body.latitude;
    let pm10 = req.body.pm10;
    let so2 = req.body.so2;
    let o3 = req.body.o3;
    let no2 = req.body.no2;
    let userID = req.session.user.id || 4;
    let date = moment().format('LLLL');

    registerIncident(description, longitude, latitude, pm10, so2, o3, no2, userID, date);


    getAllUsers().then((data) => {
        data.map((user) => {
            console.log(user.Email);

            let mailText = "The user " + user.Name + " marked a new polluted zone.\n\n" +
                "It has the following description: \n\n" + description +
                "\nPM10: " + pm10 + "\nSO2: " + so2 + "\nO3: " + o3 + "\nNO2: " + no2 + "\n\nHave a nice day! \n";

            let mailOptions = {
                from: 'potato.cat001@gmail.com',
                to: user.Email,
                subject: 'New incident reported',
                text: mailText
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent!');
                }
            });
        });
    });

    res.status(200).send("OK");
});

function getAllUsers() {

    return new Promise(function (resolve, reject) {
        let sql = `SELECT * FROM Users`;

        db.all(sql, [], (err, rows) => {
            if (err) {
                throw err;
            }

            resolve(rows);
        });
    });

}

function registerIncident(description, longitude, latitude, pm10, so2, o3, no2, userID, date) {
    let stmt = db.prepare("INSERT INTO Incidents(Description, Longitude, Latitude, PM10, SO2, O3, NO2, ReportedByUserID, Timestamp) VALUES (?,?,?,?,?,?,?,?,?)");

    console.log("registering incident");

    stmt.run([
        description,
        longitude,
        latitude,
        pm10,
        so2,
        o3,
        no2,
        userID,
        date
    ]);

    return stmt.finalize();
}


app.listen(3001, () => console.log('Example app listening on port 3001!'));

process.on('exit', function () {
    db.close();
});