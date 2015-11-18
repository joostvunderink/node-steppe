'use strict';

let db;

let collectionPrefix = 'marble';

function connect(args) {
  let dbType = args.type;
  db = require('./' + dbType);

  db.connect({
    url: args.url
  });
}

function createQueue(args) {
  return db.createQueue(args);
}

function createJob(args) {
  return db.createJob(args);
  let queueName = args.queueName;
  let parentData = args.parent;
  let children = args.children;

  let createdParentId;

  return db.createParent({
    queueName  : queueName,
    data       : parentData,
    numChildren: children.length
  })
  .then(function(parentId) {
    createdParentId = parentId;
    return db.createChildren({
      queueName: queueName,
      parentId : createdParentId,
      children : children
    });
  })
  .then(function(children) {
    return {
      parentId: createdParent.id,
      childIds: []
    };
  })
  .catch(function(err) {
    console.error(err);
    return deferred.reject(err);
  })

}

function setCollectionPrefix(prefix) {
  collectionPrefix = prefix;
}

function getCollectionName(name) {
  return collectionPrefix + '_' + name;
}

module.exports = {
  connect            : connect,
  createQueue        : createQueue,
  createJob          : createJob,
  getCollectionName  : getCollectionName,
  setCollectionPrefix: setCollectionPrefix,
};

