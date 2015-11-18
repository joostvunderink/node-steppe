'use strict';

let mongoose = require('mongoose');
let Queue = require('./queue');
let Parent = require('./parent');
let Child = require('./child');
let Q = require('q');
let common = require('../../common');

module.exports = {
  connect       : connect,
  createQueue   : createQueue,
  createJob     : createJob,
  createParent  : createParent,
  createChildren: createChildren,
};

function connect(args) {
  console.log('connecting to mongo');
  mongoose.connect(args.url);
  console.log('connected to mongo');
}

function createQueue(args) {
  return Q( Queue.update(
    { queueName: args.queueName },
    { $set: { queueName: args.queueName } },
    { upsert: true}
  ).exec());
}

function createJob(args) {
  let queueName = args.queueName;
  let parentData = args.parentData;
  let children = args.children;

  let createdParentId;

  return createParent({
    queueName  : queueName,
    data       : parentData,
    numChildren: children.length
  })
  .then(function(parent) {
    createdParentId = parent._id;
    return createChildren({
      queueName: queueName,
      parentId : createdParentId,
      children : children
    });
  })
  .then(function(children) {
    return {
      parentId: createdParentId,
      childIds: []
    };
  });
}

// Object:
// queueName
// data
// numChildren
function createParent(args) {
  var parent = new Parent({
    queueName  : args.queueName,
    status     : common.status.new,
    createdDate: new Date(),
    data       : args.data,
    numChildren: args.numChildren,
  });
  console.info(parent);
  return parent.qsave();
}

// Object
// queueName
// parentId
// children (array)
function createChildren(args) {
  var promises = args.children.map(function(childData, index) {
    var queueItemData = {
      queueName : args.queueName,
      parentId  : args.parentId,
      sequence  : index + 1,
      data      : childData.data,
      type      : childData.type,
    }
    return createChild(queueItemData);
  });
  return Q.all(promises);
}

// Array with objects:
// queueName
// parentId
// type
// data
function createChild(args) {
  var child = new Child({
    type       : args.type,
    queueName  : args.queueName,
    status     : common.status.new,
    createdDate: new Date(),
    data       : args.data,
    sequence   : args.sequence,
    parentId   : args.parentId
  });

  return child.qsave();
}
