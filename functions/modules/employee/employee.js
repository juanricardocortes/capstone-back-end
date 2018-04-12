var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var moment = require("moment");
var timezone = require("moment-timezone");
var serviceAccount = require("../google/serviceAccountKey.json");
var empdb = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hrmsbot.firebaseio.com"
}, "employees");
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

function getEmail(employees) {
    var emails = [];
    for (var index = 0; index < employees.length; index++) {
        emails.push({
            email: employees[index].email
        });
    }
    return emails;
}

function zeroFill(number, width) {
    width -= number.toString().length;
    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }
    return number + ""; // always return a string
}

module.exports = {
    addEmployee: function (request, response) {
        /*
            {
                token: token
                allEmployees: [
                    {
                        email: email,
                        password: password
                    }
                ]
                hireFrom: applicants
            }
        */

        var decoded = jwt.decode(request.body.token);
        var employee = request.body.allEmployees;
        if (decoded.isAdmin) {

            var ref = admin.database(empdb).ref(database.main + database.employees);
            ref.once('value').then(function (snapshot) {
                var duplicateEmails = [];
                var allEmails = getEmail(iterate([snapshot.val()]));
                for (var index = 0; index < employee.length; index++) {
                    if (containsObject({
                            email: employee[index].email
                        }, allEmails)) {
                        duplicateEmails.push(employee[index]);
                    } else {
                        var datenow = moment(moment(), 'YYYY/MM/DD');
                        var lastemployee = allEmails.length + 1 + index;
                        // var dateHired = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                        var dateHired = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");;
                        var employeeid = zeroFill(datenow.format('M'), 2) + zeroFill(datenow.format('D'), 2) + zeroFill(lastemployee, 4);
                        var key;
                        if (employee[index].userkey != null || employee[index].userkey != undefined) {
                            key = employee[index].userkey;
                        } else {
                            key = admin.database(empdb).ref().push().key;
                        }
                        ref.child(key).update({
                            email: employee[index].email,
                            password: "123123",
                            userkey: key,
                            isAdmin: false,
                            isArchived: false,
                            files: {
                                employeeid: employeeid,
                                datehired: dateHired,
                                address: employee[index].address,
                                contact: employee[index].contact,
                                firstname: employee[index].firstname,
                                lastname: employee[index].lastname,
                                image: employee[index].image,
                                birthdate: employee[index].birthdate
                            }
                        });
                        if (request.body.hireFrom === "applicants") {
                            admin.database(empdb).ref(database.main + database.applicants + employee[index].applicantkey).update({
                                hired: true,
                                dateHired: dateHired
                            });
                        }

                        var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                        var notifRef = admin.database(empdb).ref(database.main + database.notifications.employees);
                        var notificationKey = notifRef.push().key;
                        notifRef.child(notificationKey).update({
                            employee: employee[index],
                            key: notificationKey,
                            time: time,
                            seen: false,
                            message: "Added: " + employee[index].email,
                            icon: "priority_high"
                        });
                    }
                }
                response.send({
                    message: (employee.length - duplicateEmails.length) + " employee/s added",
                    duplicateEmails: duplicateEmails
                });
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    archiveEmployee: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            var employees = request.body.employees;
            for (var index = 0; index < employees.length; index++) {
                admin.database(empdb).ref(database.main + database.employees + employees[index].userkey).update({
                    isArchived: (employees[index].isArchived)
                });

                var message = "Unarchived";
                if (employees[index].isArchived) {
                    message = "Archived";
                }

                var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                var notifRef = admin.database(empdb).ref(database.main + database.notifications.employees);
                var notificationKey = notifRef.push().key;
                notifRef.child(notificationKey).update({
                    employee: employees[index],
                    key: notificationKey,
                    time: time,
                    seen: false,
                    message: message + ": " + employees[index].email,
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
    updateEmployee: function (request, response) {
        var user = request.body.user;
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            admin.database(empdb).ref(database.main + database.employees + user.userkey).update(user);
            response.send({
                message: "Update successful"
            });
        } else {
            response.send({
                message: "Unauthorized access"
            });
        }
    },
    getEmployees: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            admin.database(empdb).ref(database.main + database.employees).once("value").then(function (employees) {
                response.send(iterate([employees.val()]));
            });
        }
    },
    getEmployee: function (request, response) {
        admin.database(empdb).ref(database.main + database.employees + request.body.userkey).once("value").then(function (employee) {
            response.send(employee.val());
        });
    },
    uploadEmployeeImage: function (request, response) {
        try {
            admin.database(empdb).ref(database.main + database.employees + request.body.userkey + database.employee.information).update({
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