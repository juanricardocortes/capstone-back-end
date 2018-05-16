module.exports = {
    auth: {
        authOne: "/api/authOne",
        authTwo: "/api/authTwo",
        forgotPassword: "/api/forgotPassword",
        cancelAuth: "/api/cancelAuth",
        changePassword: "/changePassword",
        initFirebase: "/initFirebase"
    },
    employee: {
        addEmployee: "/addEmployee",
        updateEmployee: "/updateEmployee",
        archiveEmployee: "/archiveEmployee",
        getEmployees: "/getEmployees",
        getEmployeeNotifications: "/getEmployeeNotifications",
        uploadEmployeeImage: "/uploadEmployeeImage",
        getEmployee: "/getEmployee"
    },
    applicant: {
        addApplicant: "/addApplicant",
        updateApplicant: "/updateApplicant",
        archiveApplicant: "/archiveApplicant",
        getApplicants: "/getApplicants",
        getApplicantNotifications: "/getApplicantNotifications",
        uploadApplicantImage: "/uploadApplicantImage",
        updateRequirements: "/updateRequirements",
        applicantSendEmail: "/applicantSendEmail"
    },
    projects: {
        addProject: "/addProject",
        endProject: "/endProject",
        getProjects: "/getProjects",
        getProjectNotifications: "/getProjectNotifications",
        updateProject: {
            updateProjectLead: "/updateProjectLead",
            members: {
                slots: {
                    addSlot: "/addSlot",
                    deleteSlot: "/deleteSlot"
                },
                addMembers: "/addMembers",
                removeMember: "/removeMember",
                updateMembers: "/updateMembers",
                flagMember: "/flagMember"
            },
            schedule: {
                shift: {
                    addShift: "/addShift",
                    updateShift: "/updateShift",
                    getShifts: "/getShifts"
                },
                dates: {
                    updateEndDate: "/updateEndDate",
                    updateStartDate: "/updateStartDate"
                }
            }
        },
        archiveProject: "/archiveProject",
        unarchiveProject: "/unarchiveProject"
    },
    leaves: {
        requestLeave: "/requestLeave",
        forwardLeave: "/forwardLeave",
        acknowledgeLeave: "/acknowledgeLeave",
        getLeaves: "/getLeaves",
        getLeaveNotifications: "/getLeaveNotifications"
    },
    middleware: {
        validateToken: "/api/validateToken"
    },
    crypto: {
        encrypt: "/encrypt",
        decrypt: "/decrypt",
        getKey: "/getKey"
    },
    exam: {
        logApplicant: "/api/logApplicant",
        addQuestion: "/api/addQuestion",
        getQuestions: "/api/getQuestions",
        submitExam: "/api/submitExam"
    }
}