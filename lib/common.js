'use strict';

let status = {
  new      : 'new',
  working  : 'working',
  processed: 'processed',
  error    : 'error',
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

