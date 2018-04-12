module.exports = {
    auth: {
        authOne: "/api/authOne",
        authTwo: "/api/authTwo",
        forgotPassword: "/api/forgotPassword",
        cancelAuth: "/api/cancelAuth",
        changePassword: "/changePassword"
    },
    employee: {
        addEmployee: "/addEmployee",
        updateEmployee: "/updateEmployee",
        archiveEmployee: "/archiveEmployee",
        getEmployees: "/getEmployees",
        uploadEmployeeImage: "/uploadEmployeeImage",
        getEmployee: "/getEmployee"
    },
    applicant: {
        addApplicant: "/addApplicant",
        updateApplicant: "/updateApplicant",
        archiveApplicant: "/archiveApplicant",
        getApplicants: "/getApplicants",
        uploadApplicantImage: "/uploadApplicantImage",
        updateRequirements: "/updateRequirements",
        applicantSendEmail: "/applicantSendEmail"
    },
    projects: {
        addProject: "/addProject",
        updateProject: {
            updateProjectLead: "/updateProjectLead",
            members: {
                slots: {
                    addSlot: "/addSlot",
                    deleteSlot: "/deleteSlot"
                },
                addMembers: "/addMembers",
                updateMembers: "/updateMembers"
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
        addLeave: "/addLeave",
        manageLeaves: {
            acceptLeaves: "/acceptLeaves",
            declineLeaves: "/declineLeaves"
        }
    },
    middleware: {
        validateToken: "/api/validateToken"
    }
}