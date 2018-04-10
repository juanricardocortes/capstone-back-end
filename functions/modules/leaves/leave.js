var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var moment = require("moment");
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
    requestLeave: function (request, response) {
        /*
            employee: $rootScope.userlogged,
            projects: $rootScope.allProjects,
            request: {
                startDate: $scope.addRequest_startDate,
                endDate: $scope.addRequest_endDate,
                type: $scope.addRequest_type,
                reason: $scope.addRequest_reason,
            }
        */

        var req = request.body;
        var project = req.projects;
        var isOverlapping = false;
        req.employee.files = null;
        for (var index = 0; index < project.length; index++) {
            for (var member in project[index].members) {
                if (member === req.employee.userkey) {
                    for (reqIndex in project[index].requests) {
                        if ((moment(req.request.startDate).isSameOrAfter(project[index].requests[reqIndex].request.startDate) &&
                                moment(req.request.startDate).isSameOrBefore(project[index].requests[reqIndex].request.endDate) ||
                                moment(req.request.endDate).isSameOrAfter(project[index].requests[reqIndex].request.startDate) &&
                                moment(req.request.endDate).isSameOrBefore(project[index].requests[reqIndex].request.endDate)) &&
                            req.employee.userkey === project[index].requests[reqIndex].employee.userkey) {
                            isOverlapping = true;
                        }
                    }
                    if (isOverlapping) {
                        break;
                    } else {
                        if (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.endDate)) {
                            var newLeave = admin.database(leavedb).ref().push().key;
                            admin.database(leavedb).ref(database.main + database.projects + project[index].projectkey + database.project.requests + newLeave).update({
                                employee: req.employee,
                                request: {
                                    startDate: req.request.startDate,
                                    endDate: req.request.endDate,
                                    type: req.request.type,
                                    reason: req.request.reason
                                },
                                affected: {
                                    startDate: req.request.startDate,
                                    endDate: project[index].schedule.dates.endDate
                                },
                                leavekey: newLeave
                            });
                        } else if (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate)) {
                                var newLeave = admin.database(leavedb).ref().push().key;
                                admin.database(leavedb).ref(database.main + database.projects + project[index].projectkey + database.project.requests + newLeave).update({
                                    employee: req.employee,
                                    request: {
                                        startDate: req.request.startDate,
                                        endDate: req.request.endDate,
                                        type: req.request.type,
                                        reason: req.request.reason
                                    },
                                    affected: {
                                        startDate: req.request.startDate,
                                        endDate: req.request.endDate
                                    },
                                    leavekey: newLeave
                                });
                        } else if (moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate)) {
                            var newLeave = admin.database(leavedb).ref().push().key;
                            admin.database(leavedb).ref(database.main + database.projects + project[index].projectkey + database.project.requests + newLeave).update({
                                employee: req.employee,
                                request: {
                                    startDate: req.request.startDate,
                                    endDate: req.request.endDate,
                                    type: req.request.type,
                                    reason: req.request.reason
                                },
                                affected: {
                                    startDate: req.request.startDate,
                                    endDate: project[index].schedule.dates.endDate
                                },
                                leavekey: newLeave
                            });
                        } else {
                            var newLeave = admin.database(leavedb).ref().push().key;
                            admin.database(leavedb).ref(database.main + database.projects + project[index].projectkey + database.project.requests + newLeave).update({
                                employee: req.employee,
                                request: {
                                    startDate: req.request.startDate,
                                    endDate: req.request.endDate,
                                    type: req.request.type,
                                    reason: req.request.reason
                                },
                                affected: {
                                    startDate: "none",
                                    endDate: "none"
                                },
                                leavekey: newLeave
                            });
                        }
                    }
                }
            }
            if (isOverlapping) {
                break;
            }
        }
        if (isOverlapping) {
            response.send({
                success: "error",
                message: "Cannot file overlapping leave requests"
            });
        } else {
            response.send({
                success: "success",
                message: "Request sent"
            })
        }
    },
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
            }).catch(function (err) {
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