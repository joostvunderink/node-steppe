'use strict';

var should = require('should');

let mongoose = require('mongoose');
let mockgoose = require('mockgoose');
mockgoose(mongoose);
let db = require('../../../lib/db/mongo');
db.connect({ url: 'mongo://localhost/marble_unittest' });

let Q = require('q');
let _ = require('lodash');
let Parent = require('../../../lib/db/mongo/parent');
let Child = require('../../../lib/db/mongo/child');
let common = require('../../../lib/common');

describe('Mongoose Job', function() {
  beforeEach(function(done) {
    Q.all([
      Parent.remove({}).exec(),
      Child.remove({}).exec()
    ])
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  describe('creation', function() {
    it('should create a job with parent and children', function(done) {
      var jobData = {
        queueName: 'activities',
        parentData: { location: 'home' },
        children: [
          {
            data     : { fruit: 'banana' },
            type     : 'buy_fruit',
          },
          {
            data     : { fruit: 'apple' },
            type     : 'eat_fruit',
          },
          {
            data     : { colour: 'red' },
            type     : 'paint_house',
          },
        ]
      }
      db.createJob(jobData)
      .then(function(job) {
        return [
          Q(Parent.find({}).exec()),
          Q(Child.find({}).sort({sequence: 1}).exec())
        ];
      })
      .spread(function(parents, children) {
        parents.should.be.an.Array.and.have.length(1);
        let parent = parents[0];

        parent.status.should.equal(common.status.new);
        parent.queueName.should.equal(jobData.queueName);
        parent.data.should.eql(jobData.parentData);

        should.equal(parent.startedDate, null);
        should.equal(parent.processedDate, null);
        should.equal(parent.handledDate, null);
        should.equal(parent.errorDate, null);

        parent.errorCount.should.equal(0);
        parent.errorMessage.should.equal('');

        parent.numChildren.should.equal(jobData.children.length);
        parent.numChildrenProcessed.should.equal(0);
        parent.numChildrenErrored.should.equal(0);

        children.should.be.an.Array.and.have.length(3);

        for (let i = 0; i < jobData.children.length; i++) {
          children[i].sequence .should.equal(i + 1);
          children[i].queueName.should.equal(jobData.queueName);
          children[i].type     .should.equal(jobData.children[i].type);
          children[i].data     .should.eql  (jobData.children[i].data);
          children[i].parentId .should.equal(parent._id.toString());
        }
        done();
      })
      .catch(function(err) {
        console.error(err);
        done(err);
      });

    });
  });
});