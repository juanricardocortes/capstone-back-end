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
    }
}