'use strict';

let should = require('should');

let mongoose = require('mongoose');
let mockgoose = require('mockgoose');
mockgoose(mongoose);
let db = require('../../../lib/db/mongo');
db.connect({ url: 'mongo://localhost/marble_unittest' });

let Q = require('q');
let Parent = require('../../../lib/db/mongo/parent');
let common = require('../../../lib/common');

describe('Mongoose Parent item', function() {
  beforeEach(function(done) {
    Q(Parent.remove({}).exec())
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should create a parent item', function(done) {
    let parentData = {
      queueName  : 'test1',
      data       : { fruit: 'banana' },
      numChildren: 3
    };
    db.createParent(parentData)
    .then(function(createdParent) {
      return Q(Parent.find({}).exec());
    })
    .then(function(parents) {
      parents.should.be.an.Array.and.have.length(1);
      let parent = parents[0];

      parent.status.should.equal(common.status.new);
      parent.queueName.should.equal(parentData.queueName);
      parent.data.should.eql(parentData.data);

      should.equal(parent.startedDate, null);
      should.equal(parent.processedDate, null);
      should.equal(parent.handledDate, null);
      should.equal(parent.errorDate, null);

      parent.errorCount.should.equal(0);
      parent.errorMessage.should.equal('');

      parent.numChildren.should.equal(parentData.numChildren);
      parent.numChildrenProcessed.should.equal(0);
      parent.numChildrenErrored.should.equal(0);
      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

});
