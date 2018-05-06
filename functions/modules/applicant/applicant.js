var jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var moment = require("moment");
var crypto = require("../auth/crypto");
var serviceAccount = require("../google/serviceAccountKey.json");
var appdb = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hrmsbot.firebaseio.com"
}, "applicants");
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

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (JSON.stringify(list[i]) === JSON.stringify(obj)) {
            return true;
        }
    }
    return false;
}

function getEmail(applicants) {
    var emails = [];
    for (var index = 0; index < applicants.length; index++) {
        emails.push({
            email: applicants[index].email
        });
    }
    return emails;
}

function sendEmailToApplicant(email, text) {
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
            to: email,
            subject: 'WELTANCHAUNG: REFERENCE NUMBER',
            text: text,
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
        });
    });
}

module.exports = {
    addApplicant: function (request, response) {
        /*
            {
                token: token,
                allApplicants: []
            }
        */
        var decoded = jwt.decode(request.body.token);
        var applicant = request.body.allApplicants;
        if (decoded.isAdmin) {
            var ref = admin.database(appdb).ref(database.main + database.applicants);
            ref.once('value').then(function (snapshot) {
                var duplicateEmails = [];
                var allEmails = getEmail(iterate([snapshot.val()]));
                for (var index = 0; index < applicant.length; index++) {
                    if (containsObject(crypto.encrypt({
                            email: applicant[index].email
                        }), allEmails)) {
                        duplicateEmails.push(applicant[index]);
                    } else {
                        var referenceNumber = Math.floor(100000 + Math.random() * 900000);
                        sendEmailToApplicant(applicant[index].email, referenceNumber.toString());
                        var key = applicant[index].userkey;
                        ref.child(key).update(crypto.encrypt({
                            email: applicant[index].email,
                            lastname: applicant[index].lastname,
                            firstname: applicant[index].firstname,
                            position: applicant[index].position,
                            userkey: key,
                            referenceNumber: referenceNumber,
                            isArchived: false,
                            completion: 0,
                            hired: false,
                            dateapplied: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
                            birthdate: applicant[index].birthdate,
                            contactNumber: applicant[index].contact,
                            address: applicant[index].address,
                            exam: "-",
                            tookExam: false,
                            requirements: {
                                one: {
                                    key: "one",
                                    name: "NSO Birth Certificate",
                                    status: "incomplete"
                                },
                                two: {
                                    key: "two",
                                    name: "NBI Clearance",
                                    status: "incomplete"
                                },
                                three: {
                                    key: "three",
                                    name: "Medical",
                                    status: "incomplete"
                                },
                                four: {
                                    key: "four",
                                    name: "SSS",
                                    status: "incomplete"
                                },
                                five: {
                                    key: "five",
                                    name: "HDMF",
                                    status: "incomplete"
                                },
                                six: {
                                    key: "six",
                                    name: "Philhealth",
                                    status: "incomplete"
                                },
                                seven: {
                                    key: "seven",
                                    name: "Interview",
                                    status: "incomplete"
                                },
                                eight: {
                                    key: "eight",
                                    name: "TIN",
                                    status: "incomplete"
                                }
                            }
                        }));

                        var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                        var notifRef = admin.database(appdb).ref(database.main + database.notifications.applicants);
                        var notificationKey = notifRef.push().key;
                        notifRef.child(notificationKey).update(crypto.encrypt({
                            // applicant: applicant[index],
                            key: notificationKey,
                            time: time,
                            seen: false,
                            message: "Added: " + applicant[index].email,
                            icon: "priority_high"
                        }));

                    }
                }
                response.send({
                    message: (applicant.length - duplicateEmails.length) + " applicant/s added",
                    duplicateEmails: duplicateEmails,
                });
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    archiveApplicant: function (request, response) {
        /*
            {
                token: token,
                applicant: applicant
            }
        */
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            var applicants = request.body.applicant;
            for (var index = 0; index < applicants.length; index++) {
                admin.database(appdb).ref(database.main + database.applicants + applicants[index].userkey).update(crypto.encrypt({
                    isArchived: (applicants[index].isArchived)
                }));
                var message = "";
                if(applicants[index].isArchived){
                    message = "Archived"
                } else {
                    message = "Unarchived"
                }
                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                var notifRef = admin.database(appdb).ref(database.main + database.notifications.applicants);
                var notificationKey = notifRef.push().key;
                notifRef.child(notificationKey).update(crypto.encrypt({
                    // applicant: applicants[index],
                    key: notificationKey,
                    time: time,
                    seen: false,
                    message: message + ": " + applicants[index].email,
                    icon: "priority_high"
                }));

            }
            response.send({
                message: "Success"
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    updateApplicant: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        var user = request.body.user;
        if (decoded.isAdmin) {
            admin.database(appdb).ref(database.main + database.applicants + user.userkey).update(user);

            var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
            var notifRef = admin.database(appdb).ref(database.main + database.notifications.applicants);
            var notificationKey = notifRef.push().key;
            notifRef.child(notificationKey).update({
                // applicant: request.body.user,
                key: notificationKey,
                time: time,
                seen: false,
                message: "Updated: " + request.body.user.email,
                icon: "priority_high"
            });

            response.send({
                message: "Update successful"
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    getApplicants: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            admin.database(appdb).ref(database.main + database.applicants).once("value").then(function (applicants) {
                response.send(iterate([applicants.val()]));
            })
        }
    },
    uploadApplicantImage: function (request, response) {
        try {
            admin.database(appdb).ref(database.main + database.applicants + request.body.userkey).update(crypto.encrypt({
                image: request.body.downloadURL
            }));

            response.send({
                success: true,
                message: "Image for " + request.body.email + " successfully uploaded"
            });
        } catch (err) {
            console.log(err.message);
            response.send({
                message: err.message
            });
        }
    },
    updateRequirements: function (request, response) {
        /*
            {
                token: token,
                applicant: applicant
                applicantKey: applicantKey,
                requirementKey: requirementKey,
                status: status,
                completion: completion,
                totalRequirements: reqlength;
            }       
        */
        var req = request.body;
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            var newCompletion = Math.ceil(req.completion + ((1 / (req.totalRequirements)) * 100));
            if(newCompletion > 100) {
                newCompletion = 100;
            }
            admin.database(appdb).ref(database.main + database.applicants + req.applicantKey + database.applicant.requirements + req.requirementKey).update(crypto.encrypt({
                    status: req.status
                }));
            admin.database(appdb).ref(database.main + database.applicants + req.applicantKey).update(crypto.encrypt({
                completion: newCompletion
            }));

            var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
            var notifRef = admin.database(appdb).ref(database.main + database.notifications.applicants);
            var notificationKey = notifRef.push().key;
            notifRef.child(notificationKey).update(crypto.encrypt({
                // applicant: req.applicant,
                key: notificationKey,
                time: time,
                seen: false,
                message: "Completed " + req.requirementName + ": " + req.applicant.email,
                icon: "priority_high"
            }));

            response.send({
                message: request.body.requirementName + " completed"
            });
        } else {
            response.send({
                message: "Unauthorized access"
            })
        }
    }
}