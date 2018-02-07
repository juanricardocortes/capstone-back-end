var jwt = require("jsonwebtoken");
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
        var applicant = request.body.applicants;
        if (decoded.isAdmin) {
            var ref = admin.database(appdb).ref(database.main + database.applicants);
            ref.once('value').then(function (snapshot) {
                var duplicateEmails = [];
                var allEmails = getEmail(iterate([snapshot.val()]));
                for (var index = 0; index < applicant.length; index++) {
                    if (containsObject({
                            email: applicant[index].email
                        }, allEmails)) {
                        duplicateEmails.push(applicant[index]);
                    } else {
                        var referenceNumber = Math.floor(100000 + Math.random() * 900000);
                        var key = applicant[index].userkey;
                        ref.child(key).update({
                            email: applicant[index].email,
                            lastname: applicant[index].lastname,
                            firstname: applicant[index].firstname,
                            userkey: key,
                            referenceNumber: referenceNumber,
                            isArchived: false,
                            requirements: {
                                reqOne: false,
                                reqTwo: false,
                                reqThree: false
                            }
                        });
                    }
                }
                response.send({
                    message: (applicant.length - duplicateEmails.length) + " applicant/s added",
                    duplicateEmails: duplicateEmails
                });
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    archiveApplicant: function (request, response) {
        var decoded = request.body.token;
        if (decoded.isAdmin) {
            if (!request.body.isArchived) {
                admin.database(appdb).ref(database.main + database.applicants + request.body.userkey).update({
                    isArchived: true
                });
                response.send({
                    message: "Archived successful"
                });
            } else {
                response.send({
                    message: "Already archived"
                });
            }
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    unarchiveApplicant: function (request, response) {
        var decoded = request.body.token;
        if (decoded.isAdmin) {
            if (request.body.isArchived) {
                admin.database(appdb).ref(database.main + database.applicants + request.body.userkey).update({
                    isArchived: false
                });
                response.send({
                    message: "Unarchived successful"
                });
            } else {
                response.send({
                    message: "Already unarchived"
                });
            }
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    updateApplicant: function (request, response) {
        var decoded = request.body.token;
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
    }
}