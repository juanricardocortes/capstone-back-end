var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var moment = require("moment");
var crypto = require("../auth/crypto");
var lodash = require("lodash");
var serviceAccount = require("../google/serviceAccountKey.json");
var projdb = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hrmsbot.firebaseio.com"
}, "projects");
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

function getProjectNames(projects) {
    var names = [];
    for (var index = 0; index < projects.length; index++) {
        names.push({
            name: projects[index].name
        });
    }
    return names;
}

function getProjectMembers(project) {
    var userkeys = [];
    for (var index = 0; index < project.length; index++) {
        userkeys.push({
            userkey: project[index].userkey
        });
    }
    return userkeys;
}

function getDateToday() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    today = mm + '/' + dd + '/' + yyyy;
    return today;
}

function getShifts(shifts) {
    var time = [];
    for (var index = 0; index < shifts.length; index++) {
        time.push({
            time: shifts[index].time
        });
    }
    return time;
}

module.exports = {
    endProject: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        var req = request.body;
        if (decoded.isAdmin) {
            admin.database(projdb).ref(database.main + database.projects + req.project.projectkey + database.project.schedule + database.project.dates).update(crypto.encrypt({
                endDate: moment().format('YYYY-MM-DD')
            }));
            try {
                admin.database(projdb).ref(database.main + database.employees + req.project.projectlead.userkey + database.employee.information + database.employee.projects + req.project.projectkey + database.employee.dates).update(crypto.encrypt({
                    endDate: moment().format('YYYY-MM-DD')
                }));
                admin.database(projdb).ref(database.main + database.employees + req.project.projectlead.userkey + database.employee.information + database.employee.assigned).update(crypto.encrypt({
                    isAssigned: false
                }));
                admin.database(projdb).ref(database.main + database.projects + req.project.projectkey).update({
                    projectlead: null
                });
            } catch (err) {}
            try {
                for (var slot in req.project.slots) {
                    admin.database(projdb).ref(database.main + database.projects + req.project.projectkey + database.project.slots + slot).update({
                        currentholder: null
                    })
                }
            } catch (err) {}
            try {
                for (var member in req.project.members) {
                    admin.database(projdb).ref(database.main + database.employees + member + database.employee.information + database.employee.projects + req.project.projectkey + database.employee.dates).update(crypto.encrypt({
                        endDate: moment().format('YYYY-MM-DD')
                    }));
                    admin.database(projdb).ref(database.main + database.employees + member + database.employee.information + database.employee.assigned).update(crypto.encrypt({
                        isAssigned: false
                    }));
                }
                admin.database(database.main + database.projects + req.project.projectkey).update({
                    members: null
                })
            } catch (err) {}
            response.send({
                success: "success",
                message: "Project ended"
            });
        } else {
            response.send({
                success: "error",
                message: "Unauthorized access!"
            });
        }
    },
    addProject: function (request, response) {
        /* 
            {
                token: token,
                project: {
                    name: projectname,
                },
                dates: {
                    startdate: date,
                    enddate: date
                }
            }
        */
        var decoded = jwt.decode(request.body.token);
        var project = request.body.project;
        if (decoded.isAdmin) {
            var ref = admin.database(projdb).ref(database.main + database.projects);
            ref.once('value').then(function (snapshot) {
                var allNames = getProjectNames(iterate([snapshot.val()]));
                if (containsObject(crypto.encrypt({
                        name: project.name
                    }), allNames)) {
                    response.send({
                        success: "error",
                        message: "Project with that name already exists"
                    });
                } else {
                    var key = admin.database(projdb).ref().push().key;;
                    ref.child(key).update(crypto.encrypt({
                        name: project.name,
                        projectkey: key,
                        isArchived: false,
                        schedule: {
                            dates: {
                                startDate: (moment(request.body.dates.startDate.split('T')[0]).add(1, "days")).format('YYYY-MM-DD'),
                                // endDate: (moment(request.body.dates.endDate.split('T')[0]).add(1, "days")).format('YYYY-MM-DD'),
                            }
                        }
                    }));

                    var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                    var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                    var notificationKey = notifRef.push().key;
                    notifRef.child(notificationKey).update(crypto.encrypt({
                        // project: {
                        //     name: project.name,
                        //     projectkey: key
                        // },
                        key: notificationKey,
                        time: time,
                        seen: false,
                        message: "Added: " + project.name,
                        icon: "priority_high"
                    }));

                    response.send({
                        success: "success",
                        message: "Project " + project.name + " added"
                    });
                }
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    archiveProject: function (request, response) {
        /* 
            {
                token: token,
                isArchived: false,
                projects: []
            }
        */
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            var projects = request.body.projects;
            for (var index = 0; index < projects.length; index++) {
                admin.database(projdb).ref(database.main + database.projects + projects[index].projectkey).update(crypto.encrypt({
                    isArchived: (projects[index].isArchived)
                }));
                var key = admin.database(projdb).ref().push().key;
                var message = "Unarchived";
                if (projects[index].isArchived) {
                    message = "Archived"
                }

                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                var notificationKey = notifRef.push().key;
                notifRef.child(notificationKey).update(crypto.encrypt({
                    // project: {
                    //     name: projects[index].name,
                    //     projectkey: projects[index].projectkey
                    // },
                    key: notificationKey,
                    time: time,
                    seen: false,
                    message: message + ": " + projects[index].name,
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
    updateProject: {
        updateProjectLead: function (request, response) {
            /*
                {
                    token: token,
                    projectkey: projectkey,
                    employee: employeeobject,
                    project: projectObject
                }
            */
            var decoded = jwt.decode(request.body.token);
            var req = request.body;
            if (decoded.isAdmin) {
                if (req.project.projectlead) {
                    admin.database(projdb).ref(database.main + database.employees + req.project.projectlead.userkey + database.employee.information + database.employee.assigned).update(crypto.encrypt({
                        isAssigned: false
                    }));
                    admin.database(projdb).ref(database.main + database.employees + req.project.projectlead.userkey + database.employee.information + database.employee.projects + req.project.projectkey + database.employee.dates).update(crypto.encrypt({
                        endDate: moment().format('YYYY-MM-DD')
                    }));
                }

                var name = request.body.employee.files.lastname + ", " + request.body.employee.files.firstname;
                var newEmployee = lodash.omit(request.body.employee, ['files']);
                admin.database(projdb).ref(database.main + database.projects + request.body.projectkey)
                    .update(crypto.encrypt({
                        projectlead: newEmployee
                    }));
                admin.database(projdb).ref(database.main + database.employees + request.body.employee.userkey + database.employee.information + database.employee.projects + request.body.projectkey)
                    .update(crypto.encrypt({
                        isProjectLead: true,
                        projectName: request.body.project.name,
                        projectKey: request.body.projectkey,
                        remarks: "Project leader",
                        dates: {
                            startDate: moment().format('YYYY-MM-DD')
                        },
                        projectLead: request.body.employee.userkey,
                        role: "Project leader",
                        shiftdetails: {
                            time: "08:00 AM - 05:00 PM"
                        }
                    }));
                admin.database(projdb).ref(database.main + database.employees + request.body.employee.userkey + database.employee.information + database.employee.assigned).update(crypto.encrypt({
                    isAssigned: true,
                    projectkey: req.project.projectkey
                }));

                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                var notificationKey = notifRef.push().key;
                notifRef.child(notificationKey).update(crypto.encrypt({
                    // project: {
                    //     name: request.body.project.name,
                    //     projectkey: request.body.projectkey
                    // },
                    key: notificationKey,
                    time: time,
                    seen: false,
                    message: "Project lead for " + request.body.project.name + " " + name,
                    icon: "priority_high"
                }));

                response.send({
                    success: "success",
                    message: "Update project lead successful"
                })
            } else {
                response.send({
                    success: "error",
                    message: "Unauthorized access"
                });
            }

        },
        members: {
            slots: {
                addSlot: function (request, response) {
                    /*
                        {
                            token: token,
                            project: project,
                            employee: employee,
                            shift: shift,
                            role: role
                        }
                    */
                    var decoded = jwt.decode(request.body.token);
                    var req = request.body;
                    var isProjectLead = false;
                    try {
                        if (req.project.projectlead.userkey === req.user.userkey) {
                            isProjectLead = true;
                        }
                    } catch (err) {}
                    // if (req.project.projectlead.userkey === req.employee.userkey || decoded.isAdmin) {
                    if (decoded.isAdmin || isProjectLead) {
                        var shiftdetails = req.shift;
                        var ref = admin.database(projdb).ref(database.main + database.projects + req.project.projectkey);
                        var pushKey = ref.push().key;
                        ref.child(database.project.slots + pushKey).update(crypto.encrypt({
                            shiftdetails: shiftdetails,
                            role: req.role,
                            slotkey: pushKey
                        }));

                        var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                        var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                        var notificationKey = notifRef.push().key;
                        notifRef.child(notificationKey).update(crypto.encrypt({
                            // project: {
                            //     name: req.project.name,
                            //     projectkey: req.project.projectkey
                            // },
                            key: notificationKey,
                            time: time,
                            seen: false,
                            message: req.employee.files.lastname + ", " + req.employee.files.firstname + " added a " + req.role + " role in " + req.project.name,
                            icon: "priority_high"
                        }));

                        response.send({
                            success: "success",
                            message: "Slot added successful"
                        });
                    } else {
                        response.send({
                            success: "error",
                            message: "Unauthorized access"
                        });
                    }
                },
                deleteSlot: function (request, response) {
                    /*
                        {
                            token: token,
                            projectkey: projectkey,
                            slotkey: slotkey
                        }
                    */
                    var decoded = jwt.decode(request.body.token);
                    admin.database(projdb).ref(database.main + database.employees + decoded.userkey + database.employee.information + database.employee.projects + request.body.projectkey)
                        .once('value').then(function (snapshot) {
                            if (snapshot.val().isProjectLead) {
                                var ref = admin.database(projdb).ref(database.main + database.projects + request.body.projectkey + database.project.slots + request.body.slotkey);
                                ref.update(null);
                                response.send({
                                    message: "Slot deleted"
                                });
                            } else {
                                response.send({
                                    message: "Unauthorized access"
                                });
                            }
                        }).catch(function (err) {
                            response.send({
                                errorMessage: err,
                                message: "Project not found"
                            })
                        })
                }
            },
            flagMember: function (request, response) {
                var req = request.body;
                if(req.user.userkey === req.project.projectlead.userkey) {
                    admin.database(projdb).ref(database.main + database.employees + req.commend.userkey + database.employee.information + database.employee.projects + req.project.projectkey).update(crypto.encrypt({
                        remarks: req.remarks
                    }))
                    response.send({
                        success: "success",
                        message: req.commend.files.lastname + ", " + req.commend.files.firstname + " commended."
                    })
                } else {
                    response.send({
                        success: "error",
                        message: "Unauthorized access!"
                    })
                }
            },
            removeMember: function (request, response) {
                var decoded = jwt.decode(request.body.token);
                var req = request.body;
                if (decoded.isAdmin) {
                    admin.database(projdb).ref(database.main + database.projects + req.projectkey + database.project.slots + req.slotkey).update({
                        currentholder: null
                    })
                    admin.database(projdb).ref(database.main + database.projects + req.projectkey + database.project.members + req.employee.userkey).remove();
                    admin.database(projdb).ref(database.main + database.employees + req.employee.userkey + database.employee.information + database.employee.assigned).update(crypto.encrypt({
                        isAssigned: false
                    }))
                    admin.database(projdb).ref(database.main + database.employees + req.employee.userkey + database.employee.information + database.employee.projects + req.projectkey + database.employee.dates).update(crypto.encrypt({
                        endDate: moment().format('YYYY-MM-DD')
                    }))

                    var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                    var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                    var notificationKey = notifRef.push().key;
                    notifRef.child(notificationKey).update(crypto.encrypt({
                        // project: {
                        //     name: req.projectname,
                        //     projectkey: req.projectkey
                        // },
                        key: notificationKey,
                        time: time,
                        seen: false,
                        message: "Removed " + req.employee.files.lastname + ",  " + req.employee.files.firstname + " in " + req.projectname,
                        icon: "priority_high"
                    }));
                    response.send({
                        message: req.employee.files.lastname + " removed",
                        success: "success"
                    })
                }
            },
            addMembers: function (request, response) {
                /*
                    {
                        token: token,
                        slotkey: slotkey,
                        dates: {
                            startDate: startDate,,
                            endDate: endDate
                        }
                        employee: employee,
                        user:user
                    }
                 */
                var decoded = jwt.decode(request.body.token);
                var req = request.body;
                var isProjectLead = false;
                try {
                    if (req.project.projectlead.userkey === req.user.userkey) {
                        isProjectLead = true;
                    } else {
                        isProjectLead = false;
                    }
                } catch (err) {
                    isProjectLead = false;
                }
                if (decoded.isAdmin || isProjectLead) {
                    var empref = admin.database(projdb).ref(database.main + database.employees + req.employee.userkey);
                    var ref = admin.database(projdb).ref(database.main + database.projects + req.project.projectkey);

                    if (!containsObject(crypto.encrypt({
                            userkey: req.employee.userkey
                        }), getProjectMembers(iterate([req.project.members])))) {

                        var overlapError = false;
                        var overlapErrorMessage = "";
                        var isProjectLead = false;

                        try {
                            empProjects = req.employee.files.projects
                            for (var key in empProjects) {
                                var project = empProjects[key];
                                if (project.projectKey === req.project.projectkey) {
                                    if (project.isProjectLead) {
                                        isProjectLead = true;
                                    } else {
                                        isProjectLead = false;
                                    }
                                }
                                // if (project.dates) {
                                //     if ((moment(project.dates.startDate).isSameOrBefore(req.project.schedule.dates.endDate) &&
                                //             moment(project.dates.startDate).isSameOrAfter(req.project.schedule.dates.startDate)) ||
                                //         (moment(project.dates.endDate).isSameOrBefore(req.project.schedule.dates.endDate) &&
                                //             moment(project.dates.endDate).isSameOrAfter(req.project.schedule.dates.startDate))) {
                                //         var overlapError = true;
                                //         if (overlapErrorMessage === "") {
                                //             overlapErrorMessage = "Overlaps with schedule on: [" + project.projectName + "]";
                                //         } else {
                                //             overlapErrorMessage += ", [" + project.projectName + "]";
                                //         }
                                //     }
                                // }
                            }
                        } catch (err) {}

                        if (overlapError) {
                            response.send({
                                success: "error",
                                message: overlapErrorMessage
                            });
                        } else {
                            empref.child(database.employee.information + database.employee.assigned).update(crypto.encrypt({
                                isAssigned: true,
                                projectkey: req.project.projectkey
                            }));
                            empref.child(database.employee.information + database.employee.projects + req.project.projectkey).update(crypto.encrypt({
                                role: req.slot.role,
                                slotKey: req.slot.slotkey,
                                projectKey: req.project.projectkey,
                                projectName: req.project.name,
                                projectLead: req.project.projectlead.userkey,
                                shiftdetails: req.slot.shiftdetails,
                                remarks: "none",
                                dates: {
                                    startDate: moment().format('YYYY-MM-DD')
                                },
                                isProjectLead: isProjectLead
                            })).then(function () {
                                req.employee.files = lodash.omit(req.employee.files, ['leaves', 'projects', 'assigned']);
                                var name = req.employee.files.lastname + ", " + req.employee.files.firstname;
                                ref.child(database.project.slots + req.slot.slotkey).update(crypto.encrypt({
                                    currentholder: req.employee
                                }));
                                ref.child(database.project.members + req.employee.userkey).update(crypto.encrypt(req.employee));

                                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                                var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                                var notificationKey = notifRef.push().key;
                                notifRef.child(notificationKey).update(crypto.encrypt({
                                    // project: {
                                    //     name: req.project.name,
                                    //     projectkey: req.project.projectkey
                                    // },
                                    key: notificationKey,
                                    time: time,
                                    seen: false,
                                    message: "Added " + name + " in " + req.project.name,
                                    icon: "priority_high"
                                }));

                                response.send({
                                    success: "success",
                                    message: name + " added"
                                });
                            });
                        }

                    } else {
                        response.send({
                            success: "error",
                            message: req.employee.files.lastname + " already a member"
                        });
                    }

                } else {
                    response.send({
                        success: "error",
                        message: "Unauthorized access"
                    });
                }
            },
            updateMembers: function (request, response) {
                /*
                    {
                        token: token,
                        slotkey: slotkey,
                        projectkey: projectkey,
                        slots: {
                            role: role,
                            shift: shift
                        }
                    }
                */
                //project lead
                var decoded = jwt.decode(request.body.token);
                var req = request.body;
                admin.database(projdb).ref(database.main + database.employees + decoded.userkey + database.employee.information + database.employee.projects + req.projectkey)
                    .once('value').then(function (snapshot) {
                        if (snapshot.val().isProjectLead) {
                            var ref = admin.database(projdb).ref(database.main + database.projects);
                            ref.child(req.projectkey + database.project.slots + req.slotkey).update({
                                role: req.slots.role,
                                shift: req.slots.shift
                            });
                        } else {
                            response.send({
                                message: "Unauthorized access"
                            });
                        }
                    }).catch(function (err) {
                        response.send({
                            message: "Project not found"
                        });
                    });
            }
        },
        schedule: {
            dates: {
                updateEndDate: function (request, response) {
                    /*
                        {
                            token: token,
                            projectkey: projectkey,
                            endDate: endDate
                        }
                    */
                    var decoded = jwt.decode(request.body.token);
                    if (decoded.isAdmin) {
                        var req = request.body;
                        var ref = admin.database(projdb).ref(database.main + database.projects + req.projectkey);
                        ref.child(database.project.schedule + database.project.dates).update({
                            endDate: req.endDate
                        });
                        response.send({
                            message: "update end date successful"
                        });
                    } else {
                        response.send({
                            message: "Unauthorized access"
                        })
                    }
                },
                updateStartDate: function (request, response) {
                    /*
                        {
                            token: token,
                            projectkey: projectkey,
                            startDate: stardate
                        }
                    */
                    var decoded = jwt.decode(request.body.token);
                    if (decoded.isAdmin) {
                        var req = request.body;
                        var ref = admin.database(projdb).ref(database.main + database.projects + req.projectkey);
                        ref.child(database.project.schedule + database.project.dates).update({
                            startDate: req.startDate
                        });
                        response.send({
                            message: "update start date successful"
                        });
                    } else {
                        response.send({
                            message: "Unauthorized access"
                        })
                    }
                }
            },
            shift: {
                getShifts: function (request, response) {
                    /*
                        {
                            token: token,
                            projectkey: projectkey
                        }                
                    */
                    var req = request.body;
                    var decoded = jwt.decode(req.token);
                    if (decoded.isAdmin) {
                        admin.database(projdb).ref(database.main + database.projects + req.projectkey + database.project.schedule + database.project.shifts)
                            .once('value').then(function (snapshot) {
                                response.send({
                                    shifts: iterate([snapshot.val()])
                                });
                            });
                    } else {
                        response.send({
                            message: "Unauthorized access"
                        });
                    }
                },
                addShift: function (request, response) {
                    /*
                        {
                            token: token,
                            project: project,
                            employee: employee,
                            time: time
                        }
                    */
                    var req = request.body;
                    var decoded = jwt.decode(req.token);
                    admin.database(projdb).ref(database.main + database.projects + req.project.projectkey + database.project.schedule + database.project.shifts)
                        .once('value').then(function (snapshot) {
                            var allShifts = getShifts(iterate([snapshot.val()]));
                            if (containsObject(crypto.encrypt({
                                    time: req.time
                                }), allShifts)) {
                                response.send({
                                    success: "error",
                                    message: "Shift with that time already exists"
                                });
                            } else {
                                var isProjectLead = false;
                                try {
                                    if (req.project.projectlead.userkey === req.user.userkey) {
                                        isProjectLead = true;
                                    }
                                } catch (err) {}
                                // if (req.project.projectlead.userkey === req.employee.userkey || decoded.isAdmin) {
                                if (decoded.isAdmin || isProjectLead) {
                                    var ref = admin.database(projdb).ref(database.main + database.projects);
                                    var pushKey = ref.push().key;
                                    ref.child(req.project.projectkey + database.project.schedule + database.project.shifts + pushKey)
                                        .update(crypto.encrypt({
                                            time: req.time,
                                            shiftkey: pushKey
                                        }));

                                    var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                                    var notifRef = admin.database(projdb).ref(database.main + database.notifications.projects);
                                    var notificationKey = notifRef.push().key;
                                    notifRef.child(notificationKey).update(crypto.encrypt({
                                        // project: {
                                        //     name: req.project.name,
                                        //     projectkey: req.project.projectkey
                                        // },
                                        key: notificationKey,
                                        time: time,
                                        seen: false,
                                        message: "Added shift " + req.time + " in " + req.project.name,
                                        icon: "priority_high"
                                    }));

                                    response.send({
                                        success: "success",
                                        message: "Shift added successful"
                                    });
                                } else {
                                    response.send({
                                        success: "error",
                                        message: "Unauthorized access"
                                    });
                                }

                            }
                        });

                },
                updateShift: function (request, response) {}
            }
        }
    },
    getProjects: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            admin.database(projdb).ref(database.main + database.projects).once("value").then(function (project) {
                response.send(crypto.decrypt({projects: iterate([project.val()])}));
            });
        }
    },
    getProjectNotifications: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            admin.database(projdb).ref(database.main + database.notifications.projects).once("value").then(function (project) {
                response.send(crypto.decrypt({projects: iterate([project.val()])}));
            });
        }
    }
}