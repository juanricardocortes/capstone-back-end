var jwt = require("jsonwebtoken");
var lodash = require("lodash");
var constants = require("../../strings/constants");
process.env.SECRET_KEY = constants.secretKey;

module.exports = {
    middleware: function (request, response, next) {
        var token = request.body.token || request.headers["token"];
        if (token) {
            var jsonSignature = lodash.omit(JSON.parse(request.body.signature), ['pin', 'isAdmin', 'isArchived', 'files', 'password']);
            var stringSignature = JSON.stringify(jsonSignature);
            jwt.verify(token, (stringSignature + process.env.SECRET_KEY), function (err, decode) {
                if (err) {
                    response.json({
                        message: "Invalid token",
                        success: false
                    });
                } else {
                    next();
                }
            });
        } else {
            response.json({
                message: "No token found",
                success: false
            });
        }
    },
    validateToken: function (request, response) {
        var token = request.body.token;
        if (token) {
            var jsonSignature = lodash.omit(JSON.parse(request.body.signature), ['pin', 'isAdmin', 'isArchived', 'files', 'password']);
            var stringSignature = JSON.stringify(jsonSignature);
            jwt.verify(token, (stringSignature + process.env.SECRET_KEY), function (err, decode) {
                if (err) {
                    response.json({
                        valid: false
                    });
                } else {
                    response.json({
                        valid: true
                    });
                }
            });
        } else {
            response.json({
                valid: false
            });
        }
    }
}