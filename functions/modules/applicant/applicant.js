var jwt = require("jsonwebtoken");
var nodemailer = require('nodemailer');
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
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

module.exports = {
    addApplicant: function (request, response) {
        /*
            {
                token: token,
                applicants: []
            }
        */
        var decoded = jwt.decode(request.body.token);
        var applicant = request.body.allApplicants;
        var referenceNumbers = [];
        if (decoded.isAdmin) {
            var ref = admin.database(appdb).ref(database.main + database.applicants);
            ref.once('value').then(function (snapshot) {
                var duplicateEmails = [];
                var allEmails = getEmail(iterate([snapshot.val()]));
                for (var index = 0; index < applicant.length; index++) {
                    var time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                    if (containsObject({
                            email: applicant[index].email
                        }, allEmails)) {
                        duplicateEmails.push(applicant[index]);
                    } else {
                        var referenceNumber = Math.floor(100000 + Math.random() * 900000);
                        referenceNumbers.push(referenceNumber);

                        var key = applicant[index].userkey;
                        ref.child(key).update({
                            email: applicant[index].email,
                            lastname: applicant[index].lastname,
                            firstname: applicant[index].firstname,
                            userkey: key,
                            referenceNumber: referenceNumber,
                            isArchived: false,
                            completion: "0%",
                            hired: false,
                            requirements: {
                                reqOne: {
                                    key: "reqOne",
                                    name: "Birth Certificate",
                                    status: "incomplete"
                                },
                                reqTwo: {
                                    key: "reqTwo",
                                    name: "Valid ID",
                                    status: "incomplete"
                                }
                            }
                        });
                        admin.database(appdb).ref(database.main + database.notifications.applicants + key).update({
                            applicant: applicant[index],
                            key: key,
                            time: time,
                            seen: false,
                            message: "Added: " + applicant[index].email,
                            icon: "priority_high"
                        });
                    }
                }
                response.send({
                    message: (applicant.length - duplicateEmails.length) + " applicant/s added",
                    duplicateEmails: duplicateEmails,
                    referenceNumbers: referenceNumbers
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
                admin.database(appdb).ref(database.main + database.applicants + applicants[index].userkey).update({
                    isArchived: (applicants[index].isArchived)
                });
                var key = admin.database(appdb).ref().push().key;
                var message;
                // if (!applicants[index].isArchived) {
                //     message = "Unarchived: " + applicants[index].email
                // } else {
                //     message = "Archived: " + applicants[index].email;
                // }
                var time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                admin.database(appdb).ref(database.main + database.notifications.applicants + key).update({
                    applicant: applicants[index],
                    key: applicants[index].userkey,
                    time: time,
                    seen: false,
                    message: "Success",
                    icon: "priority_high"
                });
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
    uploadImage: function (request, response) {
        try {
            admin.database(appdb).ref(database.main + database.applicants + request.body.userkey).update({
                image: request.body.downloadURL
            });
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
                applicantKey: applicantKey,
                requirementKey: requirementKey,
                status: status
            }
        */
        var req = request.body;
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            admin.database(appdb).ref(database.main + database.applicants + req.applicantKey + database.applicant.requirements + req.requirementKey)
                .update({
                    status: req.status
                });
            response.send({
                message: "Requirement updated"
            });
        } else {
            response.send({
                message: "Unauthorized access"
            })
        }
    },
    applicantSendEmail: function (request, response) {
        /*
            {
                token: token,
                applicants: applicants,
                referenceNumbers: referenceNumbers
            }
        */
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            var applicants = request.body.applicants;
            var referenceNumbers = request.body.referenceNumbers;
            for (var index = 0; index < applicants.length; index++) {
                var text = referenceNumbers[index];
                var email = applicants[index];
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
                        subject: 'WELTANCHAUNG: Reference Number',
                        text: text
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            return console.log(error);
                        }
                    });
                });
            }
            response.send({
                message: "Reference number emailed to applicant"
            });
        } else {
            response({
                message: "Unauthorized access"
            });
        }
    }
}