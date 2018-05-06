var jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var lodash = require("lodash");
var crypto = require("./crypto");
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
        var req = request.body;
        if (req.user.email.includes("<") || req.user.email.includes(">") || req.user.password.includes("<") || req.user.password.includes(">")){
            response.send({
                success: "error",
                message: "Dangerous substring found!"
            })
        } else {
            var ref = admin.database(authdb).ref(database.main + database.employees);
            var pin = Math.floor(100000 + Math.random() * 900000);
            var text = "Your confirmation number is: " + pin;
            ref.once('value').then(function (snapshot) {
                var credentials = iterate([snapshot.val()]);
                var user = {};
                var valid = false;
                var encrypteduser = crypto.encrypt(request.body.user);
                for (var index = 0; index < credentials.length; index++) {
                    user = credentials[index];
    
                    if (encrypteduser.email === user.email && encrypteduser.password === user.password) {
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
                            to: crypto.decryptVar(user.email),
                            subject: 'Confirm your login',
                            text: text,
                        };
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                        });
    
                        admin.database(authdb).ref(database.main + database.employees + crypto.decryptVar(user.userkey)).update(crypto.encrypt({
                            pin: pin
                        }));
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
        }
    },
    authTwo: function (request, response) {
        var req = request.body;
        if (req.pin.includes("<") || req.pin.email.includes(">")){
            response.send({
                success: "error",
                message: "Dangerous substring found!"
            })
        } else {
            var pin = parseInt(request.body.pin);
            var user = request.body.user;
            admin.database(authdb).ref(database.main + database.employees + crypto.decryptVar(user.userkey)).once('value').then(function (snapshot) {
                var userPin = crypto.decryptVar(snapshot.val().pin);
                if (pin === userPin) {
                    admin.database(authdb).ref(database.main + database.employees + crypto.decryptVar(user.userkey)).update({
                        pin: null
                    }).then(function () {
                        var jsonSignature = lodash.omit(crypto.decrypt(snapshot.val()), ['pin', 'isAdmin', 'isArchived', 'files', 'password']);
                        var stringSignature = JSON.stringify({
                            email: jsonSignature.email,
                            userkey: jsonSignature.userkey
                        });
                        // console.log("MY SIGNATURE: " + stringSignature + process.env.SECRET_KEY);
                        var token = jwt.sign(user, (stringSignature + process.env.SECRET_KEY), {
                            expiresIn: '1d'
                        });
                        response.send({
                            user: crypto.decrypt(snapshot.val()),
                            token: token,
                            valid: true
                        });
                    })
                } else {
                    admin.database(authdb).ref(database.main + database.employees + crypto.decryptVar(user.userkey)).update({
                        pin: null
                    })
                    response.send({
                        valid: false
                    });
                }
            });
        }
    },
    cancelAuth: function (request, response) {
        var user = request.body.user;
        admin.database(authdb).ref(database.main + database.employees + user.userkey).update({
            pin: null
        });
        response.send({
            message: "Pin deleted"
        });
    },
    forgotPassword: function (request, response) {
        var req = request.body;
        if(req.email.includes("<") || req.email.includes(">")) {
            response.send({
                success: "error",
                message: "Dangerous substring found!"
            })
        } else {
            var ref = admin.database(authdb).ref(database.main + database.employees);
            var password = "something";
            ref.once('value').then(function (snapshot) {
                var credentials = iterate([snapshot.val()]);
                for (var index = 0; index < credentials.length; index++) {
                    if (crypto.encryptVar(request.body.email) === credentials[index].email) {
                        password = crypto.decryptVar(credentials[index].password);
                    }
                }
                if (password === "something") {
                    response.send({
                        success: "error",
                        message: "No user found with that email"
                    })
                } else {
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
                            success: "success",
                            message: "Your password was sent to your email",
                            text: "Please change your password as soon as possible"
                        });
                    });
                }
            });
        }
    },
    changePassword: function (request, response) {
        var req = request.body;
        admin.database(authdb).ref(database.main + database.employees + req.user.userkey).update(crypto.encrypt({
            password: req.newPassword
        }));
        
        admin.auth(authdb).updateUser(req.firebaseUser.uid, {
                password: req.newPassword
            })
            .then(function (userRecord) {
                // See the UserRecord reference doc for the contents of userRecord.
                // console.log("Successfully updated user", userRecord.toJSON());
            })
            .catch(function (error) {
                // console.log("Error updating user:", error);
            });
        response.send({
            message: "Password changed",
            success: "success"
        });
    },
    initFirebase: function (request, response) {
        response.send({
            config: {
                apiKey: "AIzaSyBUclDY2R3cmoL_Z8cHgOhf_U-W5i1-Dno",
                authDomain: "hrmsbot.firebaseapp.com",
                databaseURL: "https://hrmsbot.firebaseio.com",
                projectId: "hrmsbot",
                storageBucket: "hrmsbot.appspot.com",
                messagingSenderId: "202786007602"
              }
        })
    }
}