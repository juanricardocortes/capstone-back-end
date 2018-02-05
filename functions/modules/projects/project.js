var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
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
    addProject: function (request, response) {
        /* 
            {
                token: token,
                project: {
                    name: projectname,
                    slots: slots
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
                if (containsObject({
                        name: project.name
                    }, allNames)) {
                    response.send({
                        message: "Project with that name already exists"
                    });
                } else {
                    var key = ref.push().key;
                    ref.child(key).update({
                        name: project.name,
                        projectkey: key,
                        schedule: {
                            dates: request.body.dates
                        }
                    });
                    response.send({
                        message: "Add project successful"
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
                projectkey: projectkey
            }
        */
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            if (!request.body.isArchived) {
                admin.database(projdb).ref(database.main + database.projects + request.body.projectkey)
                    .update({
                        isArchived: true
                    });
                response.send({
                    message: "Project archived!"
                })
            } else {
                response.send({
                    message: "Project already archived"
                });
            }
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    unarchiveProject: function (request, response) {
        /* 
            {
                token: token,
                isArchived: true,
                projectkey: projectkey
            }
        */
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            if (request.body.isArchived) {
                admin.database(projdb).ref(database.main + database.projects + request.body.projectkey)
                    .update({
                        isArchived: false
                    });
                response.send({
                    message: "Project unarchived!"
                })
            } else {
                response.send({
                    message: "Project already unarchived"
                });
            }
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
                    employee: employeeobject
                }
            */
            var decoded = jwt.decode(request.body.token);
            if (decoded.isAdmin) {
                var empref = admin.database(projdb).ref(database.main + database.employees + request.body.userkey);
                empref.once('value').then(function (empdata) {
                    var employee = empdata.val();
                    var updateProjectLead = {
                        projectlead: employee
                    }
                    admin.database(projdb).ref(database.main + database.projects + request.body.projectkey)
                        .update(updateProjectLead);
                    admin.database(projdb).ref(database.main + database.employees + employee.userkey + database.employee.information + database.employee.projects + request.body.projectkey)
                        .update({
                            isProjectLead: true
                        });
                    response.send({
                        message: "Update project lead successful"
                    })
                });
            } else {
                response.send({
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
                            projectkey: projectkey,
                            shiftkey: shiftkey,
                            role: role
                        }
                    */
                    var decoded = jwt.decode(request.body.token);
                    var req = request.body;
                    admin.database(projdb).ref(database.main + database.employees + decoded.userkey + database.employee.information + database.employee.projects + request.body.projectkey)
                        .once('value').then(function (snapshot) {
                            if (snapshot.val().isProjectLead) {
                                var ref = admin.database(projdb).ref(database.main + database.projects + req.projectkey);
                                ref.child(database.project.schedule + database.project.shifts + req.shiftkey).once('value').then(function (snapshot) {
                                    var shiftdetails = snapshot.val();
                                    var pushKey = ref.push().key;
                                    ref.child(database.project.slots + pushKey).update({
                                        shiftdetails: shiftdetails,
                                        role: req.role,
                                        slotkey: pushKey
                                    });
                                    response.send({
                                        message: "Slot added successful"
                                    });
                                });
                            } else {
                                response.send({
                                    message: "Unauthorized access"
                                });
                            }
                        }).catch(function (err) {
                            response.send({
                                err: err.message,
                                message: "Project not found"
                            });
                        });
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
            addMembers: function (request, response) {
                /*
                    {
                        token: token,
                        slotkey: slotkey,
                        projectkey: projectkey,
                        userkey: userkey,
                        dates: {
                            startDate: startDate,,
                            endDate: endDate
                        }
                    }
                 */
                var decoded = jwt.decode(request.body.token);
                var req = request.body;
                if (decoded.isAdmin) {
                    var empref = admin.database(projdb).ref(database.main + database.employees + req.userkey);
                    empref.once('value').then(function (empdata) {
                        var employee = empdata.val();
                        var ref = admin.database(projdb).ref(database.main + database.projects + req.projectkey);
                        ref.once('value').then(function (projectdetails) {
                            ref.child(database.project.slots + req.slotkey).once('value').then(function (slotdetails) {
                                empref.child(database.employee.information + database.employee.projects + req.projectkey).update({
                                    role: slotdetails.val().role,
                                    slotKey: slotdetails.val().slotkey,
                                    projectKey: req.projectkey,
                                    projectLead: projectdetails.val().projectlead.userkey,   
                                    shiftdetails: slotdetails.val().shiftdetails,
                                    dates: req.dates
                                }).then(function () {
                                    empref.once('value').then(function (empdata) {
                                        ref.child(database.project.slots + req.slotkey).update({
                                            currentholder: empdata.val()
                                        });
                                        ref.child(database.project.members + req.userkey).update(empdata.val());
                                        ref.child(database.project.schedule + database.project.shifts + slotdetails.val().shiftdetails.shiftkey + database.project.employees + req.userkey)
                                            .update(empdata.val());
                                        response.send({
                                            message: "Member added"
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else {
                    response.send({
                        message: "Unauthorized access"
                    })
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
                            endDate: req.startDate
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
                            projectkey: projectkey,
                            time: time,
                        }
                    */
                    var req = request.body;
                    var decoded = jwt.decode(req.token);
                    admin.database(projdb).ref(database.main + database.projects + req.projectkey + database.project.schedule + database.project.shifts)
                        .once('value').then(function (snapshot) {
                            var allShifts = getShifts(iterate([snapshot.val()]));
                            if (containsObject({
                                    time: req.time
                                }, allShifts)) {
                                response.send({
                                    message: "Shift with that time already exists"
                                });
                            } else {
                                admin.database(projdb).ref(database.main + database.employees + decoded.userkey + database.employee.information + database.employee.projects + req.projectkey)
                                    .once('value').then(function (snapshot) {
                                        if (snapshot.val().isProjectLead) {
                                            var ref = admin.database(projdb).ref(database.main + database.projects);
                                            var pushKey = ref.push().key;
                                            ref.child(req.projectkey + database.project.schedule + database.project.shifts + pushKey)
                                                .update({
                                                    time: req.time,
                                                    shiftkey: pushKey
                                                });
                                            response.send({
                                                message: "Shift added successful"
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
                        });

                },
                updateShift: function (request, response) {

                }
            }
        }
    }
}