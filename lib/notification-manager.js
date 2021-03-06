// Generated by CoffeeScript 1.6.3
(function() {
  var Client, authentifiedEnvs, client, initialized, map, queue, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Client = require('request-json').JsonClient;

  client = new Client("http://localhost:9101/");

  authentifiedEnvs = ['test', 'production'];

  if (_ref = process.env.NODE_ENV, __indexOf.call(authentifiedEnvs, _ref) >= 0) {
    client.setBasicAuth(process.env.NAME, process.env.TOKEN);
  }

  initialized = false;

  queue = [];

  map = "function (doc) {\n    if (doc.docType.toLowerCase() === \"notification\") {\n        if(doc.type === 'persistent') {\n            emit([doc.app, doc.ref], doc);\n        }\n    }\n}";

  client.put('request/notification/byApps/', {
    map: map
  }, function(err, res, body) {
    var msg;
    if (err != null) {
      msg = "An error occurred while initializing notification module";
      return console.log("" + msg + " -- " + err);
    } else {
      initialized = true;
      return module.exports._emptyQueue();
    }
  });

  module.exports.manage = function(notification, type, callback) {
    var issues, msg;
    notification.type = type;
    notification = module.exports._normalize(notification);
    issues = module.exports._validate(notification);
    if (issues.length > 0) {
      issues = issues.join(" ");
      msg = "Notification malformed (problem with fields " + issues + ")";
      return callback(new Error(msg));
    } else {
      if (notification.type === 'temporary') {
        return module.exports._processCreation(notification, callback);
      } else {
        return module.exports._createOrUpdate(notification, callback);
      }
    }
  };

  module.exports._createOrUpdate = function(notification, callback) {
    var params;
    if (!initialized) {
      return module.exports._queueOperation('createOrUpdate', notification, callback);
    } else {
      params = {
        key: [notification.app, notification.ref]
      };
      return client.post('request/notification/byApps/', params, function(err, res, body) {
        var id;
        if (err) {
          return callback(err);
        } else if (!body || body.length === 0) {
          return module.exports._processCreation(notification, callback);
        } else {
          id = body[0].value._id;
          return module.exports._processUpdate(id, notification, callback);
        }
      });
    }
  };

  module.exports.destroy = function(notification, callback) {
    var params;
    if (!initialized) {
      return module.exports._queueOperation('destroy', notification, callback);
    } else {
      params = {
        key: [notification.app, notification.ref]
      };
      return client.post('request/notification/byApps/', params, function(err, res, body) {
        var id;
        if (err) {
          return callback(err);
        } else if (!body || body.length === 0) {
          return callback();
        } else {
          id = body[0].value._id;
          return module.exports._processDestroy(id, callback);
        }
      });
    }
  };

  module.exports._queueOperation = function(action, notification, callback) {
    return queue.push({
      action: action,
      notification: notification,
      callback: callback
    });
  };

  module.exports._emptyQueue = function() {
    var action, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = queue.length; _i < _len; _i++) {
      action = queue[_i];
      if (action.action === 'destroy') {
        _results.push(module.exports.destroy(action.notification, action.callback));
      } else if (action.action === 'createOrUpdate') {
        _results.push(module.exports._createOrUpdate(action.notification, action.callback));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  module.exports._processCreation = function(notification, callback) {
    return client.post('data/', notification, function(err, res, body) {
      if (((res != null ? res.statusCode : void 0) != null) && res.statusCode === 500) {
        err = body;
      }
      return callback(err);
    });
  };

  module.exports._processUpdate = function(id, notification, callback) {
    return client.put("data/" + id + "/", notification, function(err, res, body) {
      if (((res != null ? res.statusCode : void 0) != null) && res.statusCode === 500) {
        err = body;
      }
      return callback(err);
    });
  };

  module.exports._processDestroy = function(id, callback) {
    return client.del("data/" + id + "/", function(err, res, body) {
      var statusError, _ref1;
      statusError = [404, 500];
      if (((res != null ? res.statusCode : void 0) != null) && (_ref1 = res.statusCode, __indexOf.call(statusError, _ref1) >= 0)) {
        err = body;
      }
      return callback(err);
    });
  };

  module.exports._normalize = function(notification) {
    var _ref1, _ref2;
    notification.docType = "Notification";
    notification.publishDate = Date.now();
    if (notification.resource != null) {
      notification.resource = {
        app: ((_ref1 = notification.resource) != null ? _ref1.app : void 0) || null,
        url: ((_ref2 = notification.resource) != null ? _ref2.url : void 0) || '/'
      };
    } else {
      notification.resource = {
        app: null,
        url: '/'
      };
    }
    return notification;
  };

  module.exports._validate = function(notification) {
    var allowedTypes, issues, _ref1;
    issues = [];
    if ((notification.text == null) || notification.text === "") {
      issues.push('text');
    }
    if (notification.publishDate == null) {
      issues.push('publishDate');
    }
    if (notification.resource == null) {
      issues.push('resource');
    } else if (notification.resource.url == null) {
      issues.push('resource.url');
    }
    allowedTypes = ['temporary', 'persistent'];
    if ((notification.type == null) || (_ref1 = notification.type, __indexOf.call(allowedTypes, _ref1) < 0)) {
      issues.push('type');
    }
    if (notification.type === 'persistent') {
      if (notification.app == null) {
        issues.push('app (persistent)');
      }
      if (notification.ref == null) {
        issues.push('ref (persistent)');
      }
    }
    return issues;
  };

}).call(this);
