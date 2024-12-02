const ClientError = require("../Exceptions/ClientError");
     
class InputError extends ClientError {
    constructor(message) {
        super(message);
        this.name = 'InputError';
    }
}
 
module.exports = InputError;