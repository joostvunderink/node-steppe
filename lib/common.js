'use strict';

let status = {
  // new: the job has been created and is awaiting processing.
  new    : 'new',
  // working: the processing of this job has started.
  working: 'working',
  // ok: all steps have been processed without errors.
  ok   : 'ok',
  // error: at least one step has an error.
  error  : 'error',
};

let collectionPrefix = 'marble';

function setCollectionPrefix(prefix) {
  collectionPrefix = prefix;
}

function getCollectionName(name) {
  return collectionPrefix + '_' + name;
}

module.exports = {
  status: status,
  getCollectionName  : getCollectionName,
  setCollectionPrefix: setCollectionPrefix,
};

