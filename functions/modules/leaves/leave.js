var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var serviceAccount = require("../google/serviceAccountKey.json");
var leavedb = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hrmsbot.firebaseio.com"
}, "leaves");
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
    addLeave: function (request, response) {
        /*
            {
                dates: {
                    startDate: startDate,
                    endDate: endDate
                },
                reason: reason,
                type: type,
                userkey: userkey
            }
        */
        var req = request.body;
        admin.database(leavedb).ref(database.main + database.employees + req.userkey).once('value').then(function (employeeData) {
            var ref = admin.database(leavedb).ref(database.main + database.employees + req.userkey + database.employee.information + database.employee.projects);
            ref.once('value').then(function (projects) {
                var proj = iterate([projects.val()]);
                for (var index = 0; index < proj.length; index++) {
                    var projectleadKey = proj[index].projectLead;
                    var leaveRef = admin.database(leavedb).ref(database.main + database.leaves + projectleadKey);
                    var leaveKey = leaveRef.push().key;
                    leaveRef.child(leaveKey).update({
                        dates: {
                            startDate: req.dates.startDate,
                            endDate: req.dates.endDate
                        },
                        reason: req.reason,
                        type: req.type,
                        employee: employeeData.val()            
                    });
                }
                response.send({
                    message: "Request sent",
                    proj: proj
                });
            }).catch(function(err){
                response.send({
                    message: err.message
                });
            });
        });
    },
    manageLeaves: {
        acceptLeaves: function (request, response) {

        },
        declineLeaves: function (request, response) {

        }
    }
}