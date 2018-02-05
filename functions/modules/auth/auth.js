var jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var serviceAccount = require("../google/serviceAccountKey.json");
var authdb = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hrmsbot.firebaseio.com"
}, "auth");
process.env.SECRET_KEY = constants.secretKey;

function iterate(array) {
    var res = [];
    for (var i = 0; i < array.length; ++i) {
        var json = array[i];
        for (var prop in json) {
            res.push(json[prop]);
        }
    }
    return res;
}

module.exports = {
    authOne: function (request, response) {
        var ref = admin.database(authdb).ref(database.main + database.employees);
        var pin = Math.floor(100000 + Math.random() * 900000);
        var text = "Your confirmation number is: " + pin;
        ref.once('value').then(function (snapshot) {
            var credentials = iterate([snapshot.val()]);
            var user = {};
            var valid = false;

            for (var index = 0; index < credentials.length; index++) {
                user = credentials[index];
                if (request.body.user.email === user.email && request.body.user.password === user.password) {
                    valid = true
                    break;
                }
            }
            if (valid) {
                nodemailer.createTestAccount((err, account) => {
                    var transporter = nodemailer.createTransport({
                        service: 'Gmail',
                        auth: {
                            user: constants.username,
                            pass: constants.password
                        }
                    });
                    var mailOptions = {
                        from: '"QWERTY" <noreply@gmail.com>',
                        to: user.email,
                        subject: 'Confirm your login',
                        text: text,
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                    });

                    admin.database(authdb).ref(database.main + database.employees + user.userkey).update({
                        pin: pin
                    });
                    response.send({
                        valid: true,
                        user: {
                            userkey: user.userkey,
                            isAdmin: user.isAdmin
                        },
                        message: "A confirmation number was sent to your email."
                    });
                });
            } else {
                response.send({
                    valid: false,
                    message: "Login error: Invalid credentials."
                })
            }
        });
    },
    authTwo: function (request, response) {
        var pin = request.body.pin;
        var user = request.body.user;
        admin.database(authdb).ref(database.main + database.employees + user.userkey).once('value').then(function (snapshot) {
            var userPin = "" + snapshot.val().pin;
            if (pin === userPin) {
                admin.database(authdb).ref(database.main + database.employees + user.userkey).update({
                    pin: null
                });
                var token = jwt.sign(user, process.env.SECRET_KEY, {
                    expiresIn: 4000
                });
                response.send({
                    token: token,
                    valid: true
                });
            } else {
                admin.database(authdb).ref(database.main + database.employees + user.userkey).update({
                    pin: null
                })
                response.send({
                    valid: false
                });
            }
        });
    },
    cancelAuth: function(request, response) {
        var user = request.body.user;
        admin.database(authdb).ref(database.main + database.employees + user.userkey).update({
            pin: null
        });
        response.send({
            message: "Pin deleted"
        });
    },
    forgotPassword: function (request, response) {
        var ref = admin.database(authdb).ref(database.main + database.employees);
        var password = "something";
        ref.once('value').then(function (snapshot) {
            var credentials = iterate([snapshot.val()]);
            for (var index = 0; index < credentials.length; index++) {
                if (request.body.email === credentials[index].email) {
                    password = credentials[index].password;
                }
            }
            nodemailer.createTestAccount((err, account) => {
                var transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: constants.username,
                        pass: constants.password
                    }
                });
                var mailOptions = {
                    from: '"QWERTY" <noreply@gmail.com>',
                    to: request.body.email,
                    subject: 'Forgot password',
                    text: "Your password is " + password
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                });

                response.send({
                    message: "Your password was sent to your email, please change your password as soon as possible"
                });
            });
        });
    },
    changePassword: function (request, response) {
        admin.database(authdb).ref(database.main + database.employees + request.body.userkey).update({
            password: request.body.newPassword
        });
        response.send({
            message: "Success"
        });
    }
}