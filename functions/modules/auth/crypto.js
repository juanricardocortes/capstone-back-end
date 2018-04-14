var constants = require("../../strings/constants");
var crypto = require("crypto-json");
var cipher = 'camellia-128-cbc'
var encoding = 'hex'
process.env.SECRET_KEY = constants.secretKey;

module.exports = {
    encrypt: function (object) {
        return crypto.encrypt(object, process.env.SECRET_KEY, {
            algorithm: cipher,
            encoding: encoding,
            keys: []
        })
    },
    decrypt: function (object) {
        return crypto.decrypt(object, process.env.SECRET_KEY, {
            algorithm: cipher,
            encoding: encoding,
            keys: []
        })
    },
    decryptVar: function (value) {
        var object = {
            key: value
        }
        return crypto.decrypt(object, process.env.SECRET_KEY, {
            algorithm: cipher,
            encoding: encoding,
            keys: []
        }).key
    },
    encryptVar: function (value) {
        var object = {
            key: value
        }
        return crypto.encrypt(object, process.env.SECRET_KEY, {
            algorithm: cipher,
            encoding: encoding,
            keys: []
        }).key
    }
}