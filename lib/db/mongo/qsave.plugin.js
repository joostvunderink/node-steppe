var Q = require('q');

module.exports = exports = function(schema) {
  schema.methods.qsave = function() {
    var self = this;
    var deferred = Q.defer();

    self.save(function(error) {
      if (error) {
        deferred.reject(error);
      }
      else {
        deferred.resolve(self);
      }
    });

    return deferred.promise;
  };
};