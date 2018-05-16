var functions = require('firebase-functions');
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var cors = require("cors");
var port = process.env.PORT || 9001;
var address = process.env.address || "127.0.0.1";
var secureRoutes = express.Router();
app.use(
    bodyParser.urlencoded({
        extended: true
    })
);
app.use(bodyParser.json());
app.use(cors());
app.use("/secure-api", secureRoutes);

var routes = require("./strings/routes");
var auth = require("./modules/auth/auth");
var middleware = require("./modules/middleware/middleware");
var employee = require("./modules/employee/employee");
var applicant = require("./modules/applicant/applicant");
var projects = require("./modules/projects/project");
var leaves = require("./modules/leaves/leave");
var secure = require("./modules/crypto/crypto");
var exam = require("./modules/exam/exam");

app.route(routes.auth.authOne).post(cors(), auth.authOne);
app.route(routes.auth.authTwo).post(cors(), auth.authTwo);
app.route(routes.auth.forgotPassword).post(cors(), auth.forgotPassword);
app.route(routes.auth.cancelAuth).post(cors(), auth.cancelAuth);

app.route("/api" + routes.crypto.encrypt).post(cors(), secure.encrypt);
app.route("/api" + routes.crypto.decrypt).post(cors(), secure.decrypt);

app.route(routes.exam.logApplicant).post(cors(), exam.logApplicant);
app.route(routes.exam.addQuestion).post(cors(), exam.addQuestion);
app.route(routes.exam.getQuestions).post(cors(), exam.getQuestions);
app.route(routes.exam.submitExam).post(cors(), exam.submitExam);

app.route(routes.middleware.validateToken).post(cors(), middleware.validateToken);
secureRoutes.use(middleware.middleware);

secureRoutes.route(routes.auth.changePassword).post(cors(), auth.changePassword);
secureRoutes.route(routes.auth.initFirebase).post(cors(), auth.initFirebase);

secureRoutes.route(routes.employee.addEmployee).post(cors(), employee.addEmployee);
secureRoutes.route(routes.employee.archiveEmployee).post(cors(), employee.archiveEmployee);
secureRoutes.route(routes.employee.updateEmployee).post(cors(), employee.updateEmployee);
secureRoutes.route(routes.employee.getEmployees).post(cors(), employee.getEmployees);
secureRoutes.route(routes.employee.getEmployee).post(cors(), employee.getEmployee);
secureRoutes.route(routes.employee.uploadEmployeeImage).post(cors(), employee.uploadEmployeeImage);
secureRoutes.route(routes.employee.getEmployeeNotifications).post(cors(), employee.getEmployeeNotifications);

secureRoutes.route(routes.applicant.addApplicant).post(cors(), applicant.addApplicant);
secureRoutes.route(routes.applicant.archiveApplicant).post(cors(), applicant.archiveApplicant);
secureRoutes.route(routes.applicant.updateApplicant).post(cors(), applicant.updateApplicant);
secureRoutes.route(routes.applicant.getApplicants).post(cors(), applicant.getApplicants);
secureRoutes.route(routes.applicant.uploadApplicantImage).post(cors(), applicant.uploadApplicantImage);
secureRoutes.route(routes.applicant.updateRequirements).post(cors(), applicant.updateRequirements);
secureRoutes.route(routes.applicant.getApplicantNotifications).post(cors(), applicant.getApplicantNotifications);

secureRoutes.route(routes.projects.addProject).post(cors(), projects.addProject);
secureRoutes.route(routes.projects.endProject).post(cors(), projects.endProject);
secureRoutes.route(routes.projects.archiveProject).post(cors(), projects.archiveProject);
secureRoutes.route(routes.projects.getProjects).post(cors(), projects.getProjects);
secureRoutes.route(routes.projects.getProjectNotifications).post(cors(), projects.getProjectNotifications);

secureRoutes.route(routes.projects.updateProject.updateProjectLead).post(cors(), projects.updateProject.updateProjectLead);

secureRoutes.route(routes.projects.updateProject.members.slots.addSlot).post(cors(), projects.updateProject.members.slots.addSlot);
secureRoutes.route(routes.projects.updateProject.members.slots.deleteSlot).post(cors(), projects.updateProject.members.slots.deleteSlot);

secureRoutes.route(routes.projects.updateProject.members.addMembers).post(cors(), projects.updateProject.members.addMembers);
secureRoutes.route(routes.projects.updateProject.members.removeMember).post(cors(), projects.updateProject.members.removeMember);
secureRoutes.route(routes.projects.updateProject.members.updateMembers).post(cors(), projects.updateProject.members.updateMembers);
secureRoutes.route(routes.projects.updateProject.members.flagMember).post(cors(), projects.updateProject.members.flagMember);

secureRoutes.route(routes.projects.updateProject.schedule.dates.updateEndDate).post(cors(), projects.updateProject.schedule.dates.updateEndDate);
secureRoutes.route(routes.projects.updateProject.schedule.dates.updateStartDate).post(cors(), projects.updateProject.schedule.dates.updateStartDate);

secureRoutes.route(routes.projects.updateProject.schedule.shift.addShift).post(cors(), projects.updateProject.schedule.shift.addShift);
secureRoutes.route(routes.projects.updateProject.schedule.shift.updateShift).post(cors(), projects.updateProject.schedule.shift.updateShift);
secureRoutes.route(routes.projects.updateProject.schedule.shift.getShifts).post(cors(), projects.updateProject.schedule.shift.getShifts);

secureRoutes.route(routes.leaves.forwardLeave).post(cors(), leaves.forwardLeave);
secureRoutes.route(routes.leaves.requestLeave).post(cors(), leaves.requestLeave);
secureRoutes.route(routes.leaves.acknowledgeLeave).post(cors(), leaves.acknowledgeLeave);
secureRoutes.route(routes.leaves.getLeaves).post(cors(), leaves.getLeaves);
secureRoutes.route(routes.leaves.getLeaveNotifications).post(cors(), leaves.getLeaveNotifications);

secureRoutes.route(routes.crypto.encrypt).post(cors(), secure.encrypt);
secureRoutes.route(routes.crypto.decrypt).post(cors(), secure.decrypt);
secureRoutes.route(routes.crypto.getKey).post(cors(), secure.getKey);

// app.listen(port, address);
// console.log("API Connected on " + address + ":" + port);

// var rl = require("readline").createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
// rl.on("SIGINT", function () {
//     process.emit("SIGINT");
// });
// process.on("SIGINT", function () {
//     //graceful shutdown
//     console.log('Server closed')
//     process.exit();
// });

module.exports.venus = functions.https.onRequest(app);