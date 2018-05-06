var jwt = require("jsonwebtoken");
var database = require("../../strings/database");
var constants = require("../../strings/constants");
var admin = require("firebase-admin");
var serviceAccount = require("../google/serviceAccountKey.json");
var exdb = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://hrmsbot.firebaseio.com"
}, "exam");
process.env.SECRET_KEY = constants.secretKey;

var crypto = require("../auth/crypto");

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

module.exports = {
    logApplicant: function (request, response) {
        var req = request.body;
        if(req.email.includes("<") || req.email.includes(">") || req.refnum.includes("<") || req.refnum.includes(">")) {
            response.send({
                success: "error",
                message: "Dangerous substring found!"
            })
        } else {
            admin.database(exdb).ref(database.main + database.applicants).once("value").then(function (snapshot) {
                var applicants = iterate([snapshot.val()]);
                var isValid = false;
                for (var index = 0; index < applicants.length; index++) {
                    if ((!crypto.decryptVar(applicants[index].tookExam)) && (applicants[index].email === crypto.encryptVar(req.email)) && (applicants[index].referenceNumber === crypto.encryptVar(parseInt(req.refnum)))) {
                        isValid = true;
                        break;
                    }
                }   
    
                if (isValid) {
                    response.send({
                        applicant: crypto.decrypt(applicants[index]),
                        message: "Taking you to exam page",
                        success: "success",
                        isValid: true
                    })
                } else {
                    response.send({
                        message: "Not taking you to exam page",
                        success: "error",
                        isValid: false
                    })
                }
            });
        }
    },
    addQuestion: function (request, response) {
        var req = request.body;

        var ref = admin.database(exdb).ref(database.main + database.exam);
        var examkey = ref.push().key;
        if (req.hasChoices) {
            ref.child(examkey).update(crypto.encrypt({
                question: req.question,
                answer: req.answer,
                examkey: examkey,
                hasChoices: req.hasChoices,
                choices: req.choices
            }));
        } else {
            ref.child(examkey).update(crypto.encrypt({
                question: req.question,
                answer: req.answer,
                hasChoices: req.hasChoices,
                examkey: examkey
            }));
        }


        response.send({
            message: "Question added",
            success: "success"
        })
    },
    submitExam: function (request, response) {
        var req = request.body;
        admin.database(exdb).ref(database.main + database.applicants + req.applicant.userkey).update(crypto.encrypt({
            tookExam: true,
            exam: req.score
        }))
        response.send({
            message: "Exam recorded",
            success: "success"
        })
    },
    getQuestions: function (request, response) {
        var questions;
        admin.database(exdb).ref(database.main + database.exam).once("value").then(function(snapshot){
            questions = iterate([crypto.decrypt(snapshot.val())]);
            response.send({
                questions: questions
            })
        });
    }
}