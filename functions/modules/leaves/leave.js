var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var moment = require("moment");
var crypto = require("../auth/crypto");
var lodash = require("lodash");
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

function checkOverlappingNP(req, requests) {
    var isOverlapping = false;
    for (reqIndex in requests) {
        if ((moment(req.request.startDate).isSameOrAfter(requests[reqIndex].request.request.startDate) &&
                moment(req.request.startDate).isSameOrBefore(requests[reqIndex].request.request.endDate) ||
                moment(req.request.endDate).isSameOrAfter(requests[reqIndex].request.request.startDate) &&
                moment(req.request.endDate).isSameOrBefore(requests[reqIndex].request.request.endDate)) &&
            req.employee.userkey === requests[reqIndex].request.employee.userkey) {
            isOverlapping = true;
            break;
        }
    }
    return isOverlapping;
}

function requestRegularAddLeave(req, project) {
    var newLeave = admin.database(leavedb).ref().push().key;
    admin.database(leavedb).ref(database.main + database.leaves + newLeave).update(crypto.encrypt({
        request: {
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
            isAcceptedByPL: false,
            isAcknowledgedByHR: false
        },
        projectname: project.name,
        projectkey: project.projectkey
    }))
    admin.database(leavedb).ref(database.main + database.projects + project.projectkey +
        database.project.requests + newLeave).update(crypto.encrypt({
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
    }));
}

function requestBeforeAddLeave(req, project) {
    var newLeave = admin.database(leavedb).ref().push().key;
    admin.database(leavedb).ref(database.main + database.leaves + newLeave).update(crypto.encrypt({
        request: {
            employee: req.employee,
            request: {
                startDate: project.schedule.dates.startDate,
                endDate: req.request.endDate,
                type: req.request.type,
                reason: req.request.reason
            },
            affected: {
                startDate: project.schedule.dates.startDate,
                endDate: req.request.endDate
            },
            leavekey: newLeave,
            isAcknowledgedByPL: false,
            isAcceptedByPL: false,
            isAcknowledgedByHR: false
        },
        projectname: project.name,
        projectkey: project.projectkey
    }))
    admin.database(leavedb).ref(database.main + database.projects + project.projectkey +
        database.project.requests + newLeave).update(crypto.encrypt({
        employee: req.employee,
        request: {
            startDate: project.schedule.dates.startDate,
            endDate: req.request.endDate,
            type: req.request.type,
            reason: req.request.reason
        },
        affected: {
            startDate: project.schedule.dates.startDate,
            endDate: req.request.endDate
        },
        leavekey: newLeave,
        isAcknowledgedByPL: false,
        isAcknowledgedByHR: false,
    }));
}

function requestAfterAddLeave(req, project) {
    var newLeave = admin.database(leavedb).ref().push().key;
    admin.database(leavedb).ref(database.main + database.leaves + newLeave).update(crypto.encrypt({
        request: {
            employee: req.employee,
            request: {
                startDate: req.request.startDate,
                endDate: project.schedule.dates.endDate,
                type: req.request.type,
                reason: req.request.reason
            },
            affected: {
                startDate: req.request.startDate,
                endDate: project.schedule.dates.endDate
            },
            leavekey: newLeave,
            isAcknowledgedByPL: false,
            isAcceptedByPL: false,
            isAcknowledgedByHR: false
        },
        projectname: project.name,
        projectkey: project.projectkey
    }))
    admin.database(leavedb).ref(database.main + database.projects + project.projectkey +
        database.project.requests + newLeave).update(crypto.encrypt({
        employee: req.employee,
        request: {
            startDate: req.request.startDate,
            endDate: project.schedule.dates.endDate,
            type: req.request.type,
            reason: req.request.reason
        },
        affected: {
            startDate: req.request.startDate,
            endDate: project.schedule.dates.endDate
        },
        leavekey: newLeave,
        isAcknowledgedByPL: false,
        isAcknowledgedByHR: false,
    }));
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
        var numberofdays = moment(req.request.endDate).diff(moment(req.request.startDate), 'days') + 1;
        var project = req.projects;
        var isOverlapping = false;
        var hasNoProjects = false;
        req.request.startDate = (moment(req.request.startDate.split('T')[0]).add(1, "days")).format('YYYY-MM-DD');
        req.request.endDate = (moment(req.request.endDate.split('T')[0]).add(1, "days")).format('YYYY-MM-DD')
        console.log(moment(req.request.startDate).format('YYYY-MM-DD') + " - " + moment(req.request.endDate).format('YYYY-MM-DD'));
        var leaveindex = req.request.type.replace(/\s+/g, '').toLowerCase();
        if (numberofdays > req.employee.files.leaves[leaveindex].remaining) {
            response.send({
                success: "error",
                message: "You do not have enough days for that kind of leave"
            })
        } 
        else {
            req.employee.files = lodash.omit(req.employee.files, ['projects', 'leaves']);
            for (var index = 0; index < project.length; index++) {
                try {
                    if (project[index].projectlead.userkey === req.employee.userkey &&
                        (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate))) {
                        isOverlapping = checkOverlapping(req, project[index].requests);
                        if (isOverlapping) {
                            console.log("ADMIN OVERLAP");
                            break;
                        } else {
                            requestRegularAddLeave(req, project[index]);
                        }
                    } else if (project[index].projectlead.userkey === req.employee.userkey &&
                        (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isAfter(project[index].schedule.dates.endDate))) {
                        if (isOverlapping) {
                            console.log("ADMIN OVERLAP");
                            break;
                        } else {
                            requestAfterAddLeave(req, project[index]);
                        }
                    } else if (project[index].projectlead.userkey === req.employee.userkey &&
                        (moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.startDate).isBefore(project[index].schedule.dates.endDate))) {
                        if (isOverlapping) {
                            console.log("ADMIN OVERLAP");
                            break;
                        } else {
                            requestBeforeAddLeave(req, project[index]);
                        }
                    } else if (isMember(req.employee.userkey, project[index].members) && (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate))) {
                        isOverlapping = checkOverlapping(req, project[index].requests);
                        if (isOverlapping) {
                            console.log("MEMBER OVERLAP");
                            break;
                        } else {
                            requestRegularAddLeave(req, project[index]);
                            break;
                        }
                    } else if (isMember(req.employee.userkey, project[index].members) &&
                        (moment(req.request.startDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.startDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.endDate).isAfter(project[index].schedule.dates.endDate))) {
                        if (isOverlapping) {
                            console.log("MEMBER OVERLAP");
                            break;
                        } else {
                            requestAfterAddLeave(req, project[index]);
                        }
                    } else if (isMember(req.employee.userkey, project[index].members) &&
                        (moment(req.request.endDate).isSameOrAfter(project[index].schedule.dates.startDate) &&
                            moment(req.request.endDate).isSameOrBefore(project[index].schedule.dates.endDate) &&
                            moment(req.request.startDate).isBefore(project[index].schedule.dates.endDate))) {
                        if (isOverlapping) {
                            console.log("MEMBER OVERLAP");
                            break;
                        } else {
                            requestBeforeAddLeave(req, project[index]);
                        }
                    } else {
                        if (index === (project.length - 1)) {
                            console.log("HAS NO PROJECTS");
                            hasNoProjects = true;
                            break;
                        }
                    }
                } catch (err) {
                    console.log(err);
                    console.log(err.message);
                    hasNoProjects = false;
                    console.log("No project leaders for this project yet");
                }
            }
            if (hasNoProjects) {
                isOverlapping = checkOverlappingNP(req, req.leaves);
                if (!isOverlapping) {
                    var forwardedleaveref = admin.database(leavedb).ref(database.main + database.leaves);
                    var key = forwardedleaveref.push().key;
                    forwardedleaveref.child(key).update(crypto.encrypt({
                        projectname: "Not assigned in any projects",
                        projectkey: "No project key",
                        request: {
                            leavekey: key,
                            employee: req.employee,
                            request: req.request,
                            isAcknowledgedByPL: true,
                            isAcceptedByPL: true,
                            isAcknowledgedByHR: false
                        },
                        status: "Forwaded to HR"
                    }));
                }
            }
            if (isOverlapping) {
                response.send({
                    success: "error",
                    message: "Cannot file overlapping leave requests"
                });
            } else {
                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                var notifRef = admin.database(leavedb).ref(database.main + database.notifications.leaves);
                var notificationKey = notifRef.push().key;
                notifRef.child(notificationKey).update(crypto.encrypt({
                    employee: req.employee,
                    key: notificationKey,
                    time: time,
                    seen: false,
                    message: req.employee.email + " requested a leave to a project leader",
                    icon: "priority_high"
                }));

                response.send({
                    success: "success",
                    message: "Request sent"
                })
            }
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
        req.request.isAcknowledgedByPL = req.isAccepted;
        req.request.isAcceptedByPL = req.isAccepted;
        req.request.ackByPL = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
        if (req.isAccepted) {
            var forwardedleaveref = admin.database(leavedb).ref(database.main + database.leaves);
            forwardedleaveref.child(req.request.leavekey).update(crypto.encrypt({
                projectname: req.name,
                projectkey: req.projectkey,
                request: req.request
            }));

            var requestedleaveref = admin.database(leavedb).ref(database.main + database.projects + req.projectkey + database.project.requests + req.request.leavekey);
            requestedleaveref.update(crypto.encrypt({
                isAcknowledgedByPL: true,
                isAcceptedByPL: true,
                status: "Forwarded to HR",
                ackByPL: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
            }));

            var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
            var notifRef = admin.database(leavedb).ref(database.main + database.notifications.leaves);
            var notificationKey = notifRef.push().key;
            notifRef.child(notificationKey).update(crypto.encrypt({
                employee: req.request.employee,
                key: notificationKey,
                time: time,
                seen: false,
                message: req.request.employee.email + " leave request forwarded to HR",
                icon: "priority_high"
            }));

            response.send({
                success: "success",
                message: req.request.request.type + " for " + req.name + " forwarded to HR"
            });
        } else {
            var requestedleaveref = admin.database(leavedb).ref(database.main + database.projects + req.projectkey + database.project.requests + req.request.leavekey);
            requestedleaveref.update(crypto.encrypt({
                isAcknowledgedByPL: true,
                isAcceptedByPL: false,
                status: "Declined by project lead",
                ackByPL: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
            }));

            var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
            var notifRef = admin.database(leavedb).ref(database.main + database.notifications.leaves);
            var notificationKey = notifRef.push().key;
            notifRef.child(notificationKey).update(crypto.encrypt({
                employee: req.request.employee,
                key: notificationKey,
                time: time,
                seen: false,
                message: req.request.employee.email + " leave request declined by project lead",
                icon: "priority_high"
            }));

            response.send({
                success: "error",
                message: req.request.request.type + " for " + req.name + " declined by project lead"
            });
        }
    },
    acknowledgeLeave: function (request, response) {
        /*
            {
                leave: leave,
                isAccepted: isAccepted
            }
        */
        var req = request.body;
        if (req.isAccepted) {
            admin.database(leavedb).ref(database.main + database.employees + req.leave.request.employee.userkey).once("value").then(function (snapshot) {
                var employee = crypto.decrypt(snapshot.val());
                var leaveindex = req.leave.request.request.type.replace(/\s+/g, '').toLowerCase();
                var remaining = employee.files.leaves[leaveindex].remaining
                var duration = moment(req.leave.request.request.endDate).diff(moment(req.leave.request.request.startDate), 'days') + 1;
                admin.database(leavedb).ref(database.main + database.leaves + req.leave.request.leavekey + database.leave.request)
                    .update(crypto.encrypt({
                        isAcknowledgedByHR: true,
                        isAcceptedByHR: true,
                        status: "Approved by HR",
                        ackByHR: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
                    }));
                if (req.leave.projectkey != "No project key") {
                    admin.database(leavedb).ref(database.main + database.projects + req.leave.projectkey + database.project.requests + req.leave.request.leavekey)
                        .update(crypto.encrypt({
                            isAcknowledgedByHR: true,
                            isAcceptedByHR: true,
                            status: "Approved by HR",
                            ackByHR: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
                        }));
                }
                console.log("REMAINING: " + remaining);
                console.log("REQUESTED: " + duration);
                admin.database(leavedb).ref(database.main + database.employees + req.leave.request.employee.userkey + database.employee.information + database.employee.leaves)
                    .child((req.leave.request.request.type.replace(/\s+/g, '').toLowerCase())).update(crypto.encrypt({
                        remaining: (remaining - duration)
                    }))

                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                var notifRef = admin.database(leavedb).ref(database.main + database.notifications.leaves);
                var notificationKey = notifRef.push().key;
                notifRef.child(notificationKey).update(crypto.encrypt({
                    employee: req.leave.request.employee,
                    key: notificationKey,
                    time: time,
                    seen: false,
                    message: req.leave.request.employee.email + " leave request approved by HR",
                    icon: "priority_high"
                }));

                response.send({
                    success: "success",
                    message: "Leave approved"
                });
            });
        } else {
            admin.database(leavedb).ref(database.main + database.leaves + req.leave.request.leavekey + database.leave.request)
                .update(crypto.encrypt({
                    isAcknowledgedByHR: true,
                    isAcceptedByHR: false,
                    status: "Declined by HR",
                    ackByHR: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
                }));
            if (req.leave.projectkey != "No project key") {
                admin.database(leavedb).ref(database.main + database.projects + req.leave.projectkey + database.project.requests + req.leave.request.leavekey)
                    .update(crypto.encrypt({
                        isAcknowledgedByHR: true,
                        isAcceptedByHR: false,
                        status: "Declined by HR",
                        ackByHR: moment().format("dddd, MMMM Do YYYY, h:mm:ss a")
                    }));
            }


            var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
            var notifRef = admin.database(leavedb).ref(database.main + database.notifications.leaves);
            var notificationKey = notifRef.push().key;
            notifRef.child(notificationKey).update(crypto.encrypt({
                employee: req.leave.request.employee,
                key: notificationKey,
                time: time,
                seen: false,
                message: req.leave.request.employee.email + " leave request declined by HR",
                icon: "priority_high"
            }));

            response.send({
                success: "error",
                message: "Leave declined"
            });
        }
    }
}