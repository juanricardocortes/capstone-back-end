var constants = require("../../strings/constants");
var crypto = require("crypto-json");
var cipher = 'camellia-128-cbc'
var encoding = 'hex'
process.env.SECRET_KEY = constants.secretKey;

module.exports = {
    encrypt: function (request, response) {
        var encrypted =  crypto.encrypt(request.body.object, process.env.SECRET_KEY, {
            algorithm: cipher,
            encoding: encoding,
            keys: []
        });
        response.send({
            object: encrypted
        }) 
    },
    decrypt: function (request, response) {
        var decrypted = crypto.decrypt(request.body.object, process.env.SECRET_KEY, {
            algorithm: cipher,
            encoding: encoding,
            keys: []
        });
        response.send({
            object: decrypted
        }) 
    },
    getKey: function (request, response) {
        response.send({
            key: "394rwe78fudhwqpwriufdhr8ehyqr9pe8fud",
            algorithm: 'camellia-128-cbc',
            encoding: 'hex'
        })
    }
}