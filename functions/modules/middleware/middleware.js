var jwt = require("jsonwebtoken");
var constants = require("../../strings/constants");
process.env.SECRET_KEY = constants.secretKey;

module.exports = {
    middleware: function (request, response, next) {
        var token = request.body.token || request.headers["token"];
        if (token) {
            jwt.verify(token, process.env.SECRET_KEY, function (err, decode) {
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
            jwt.verify(token, process.env.SECRET_KEY, function (err, decode) {
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