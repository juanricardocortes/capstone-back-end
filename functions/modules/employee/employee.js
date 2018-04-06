var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
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
                        var dateHired = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                        var key;
                        if (employee[index].userkey) {
                            key = employee[index].userkey;
                        } else {
                            key = admin.database(empdb).ref().push().key;
                        }
                        ref.child(key).update({
                            email: employee[index].email,
                            password: employee[index].lastname,
                            userkey: key,
                            isAdmin: false,
                            isArchived: false,
                            files: {
                                datehired: dateHired,
                                address: employee[index].address,
                                contact: employee[index].contact,
                                firstname: employee[index].firstname,
                                lastname: employee[index].lastname,
                                image: employee[index].image
                            }
                        });
                        admin.database(empdb).ref(database.main + database.applicants + employee[index].applicantkey).update({
                            hired: true,
                            dateHired: dateHired
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
                var key = admin.database(empdb).ref().push().key;
                var message;
                var time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                admin.database(empdb).ref(database.main + database.notifications.employees + key).update({
                    employees: employees[index],
                    key: employees[index].userkey,
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
    unarchiveEmployee: function (request, response) {
        var decoded = jwt.decode(request.body.token);
        if (decoded.isAdmin) {
            if (request.body.isArchived) {
                admin.database(empdb).ref(database.main + database.employees + request.body.userkey).update({
                    isArchived: false
                });
                response.send({
                    message: "Unarchive successful"
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