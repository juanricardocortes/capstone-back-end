var constants = require("../../strings/constants");
var crypto = require("crypto-json");
var cipher = 'camellia-128-cbc'
var encoding = 'hex'
process.env.SECRET_KEY = constants.secretKey;

module.exports = {
    encrypt: function (request, response) {
        response.send({
            object: crypto.encrypt(request.body.object, process.env.SECRET_KEY, {
                algorithm: cipher,
                encoding: encoding,
                keys: []
            })
        }) 
    },
    decrypt: function (request, response) {
        response.send({
            object: crypto.decrypt(request.body.object, process.env.SECRET_KEY, {
                algorithm: cipher,
                encoding: encoding,
                keys: []
            })
        }) 
    }
}