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

function isMember(userkey, object) {
    var isTrue = false;
    for (key in object) {
        if (key === userkey) {
            isTrue = true;
            break;
        }
    }
    return isTrue;
}

function checkOverlapping(req, requests) {
    var isOverlapping = false;
    for (reqIndex in requests) {
        if ((moment(req.request.startDate).isSameOrAfter(requests[reqIndex].request.startDate) &&
                moment(req.request.startDate).isSameOrBefore(requests[reqIndex].request.endDate) ||
                moment(req.request.endDate).isSameOrAfter(requests[reqIndex].request.startDate) &&
                moment(req.request.endDate).isSameOrBefore(requests[reqIndex].request.endDate)) &&
            req.employee.userkey === requests[reqIndex].employee.userkey) {
            isOverlapping = true;
            break;
        }
    }
    return isOverlapping;
}

function requestAddLeave(req, project) {
    var newLeave = admin.database(leavedb).ref().push().key;
    admin.database(leavedb).ref(database.main + database.projects + project.projectkey +
        database.project.requests + newLeave).update({
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
        leavekey: newLeave,
        isAcknowledgedByPL: false,
        isAcknowledgedByHR: false,
    });
}

module.exports = {
    requestLeave: function (request, response) {
        /*
            employee: $rootScope.userlogged,
            projects: $rootScope.allProjects,
            leaves: $rootScope.allLeaves,
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
        var hasNoProjects = false;
        req.employee.files.projects = null;
        for (var index = 0; index < project.length; index++) {
            try {
                if (project[index].projectlead.userkey === req.employee.userkey) {
                    isOverlapping = checkOverlapping(req, project[index].requests);
                    if (isOverlapping) {
                        console.log("ADMIN OVERLAP");
                        break;
                    } else {
                        if (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate)) {
                            requestAddLeave(req, project[index]);
                            break;
                        }
                    }
                } else if (isMember(req.employee.userkey, project[index].members)) {
                    isOverlapping = checkOverlapping(req, project[index].requests);
                    if (isOverlapping) {
                        console.log("MEMBER OVERLAP");
                        break;
                    } else {
                        if (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate)) {
                            requestAddLeave(req, project[index]);
                            break;
                        }
                    }
                } else {
                    if (index === (project.length - 1)) {
                        hasNoProjects = true;
                        break;
                    }
                }
            } catch (err) {
                console.log("No project leaders for this project yet");
            }
        }
        if ((!checkOverlapping(req, req.leaves)) && hasNoProjects) {
            var forwardedleaveref = admin.database(leavedb).ref(database.main + database.leaves);
            var key = forwardedleaveref.push().key;
            forwardedleaveref.child(key).update({
                projectname: "Not assigned in any projects",
                projectkey: "No project key",
                request: {
                    request: req.request,
                    employee: req.employee
                }
            });
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
    forwardLeave: function (request, response) {
        /*
            name: name,
            projectkey: projectkey,
            request: request,
            isAccepted: isAccepted
        */

        var req = request.body;
        if (req.isAccepted) {
            var forwardedleaveref = admin.database(leavedb).ref(database.main + database.leaves);
            forwardedleaveref.child(req.request.leavekey).update({
                projectname: req.name,
                projectkey: req.projectkey,
                request: req.request
            });
            
            var requestedleaveref = admin.database(leavedb).ref(database.main + database.projects + req.projectkey + database.project.requests + req.request.leavekey);
            requestedleaveref.update({
                isAcknowledgedByPL: true,
                isAcceptedByPL: true,
                status: "Forwarded to HR"
            });
            response.send({
                success: "success",
                message: req.request.request.type + " for " + req.name + " forwarded to HR"
            });
        } else {
            var requestedleaveref = admin.database(leavedb).ref(database.main + database.projects + req.projectkey + database.project.requests + req.request.leavekey);
            requestedleaveref.update({
                isAcknowledgedByPL: true,
                isAcceptedByPL: false,
                status: "Declined by project lead"
            });
            response.send({
                success: "error",
                message: req.request.request.type + " for " + req.name + " declined by project lead"
            });
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