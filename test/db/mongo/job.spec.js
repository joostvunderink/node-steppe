'use strict';

let should = require('should');

let mongoose = require('mongoose');
let mockgoose = require('mockgoose');
mockgoose(mongoose);
let db = require('../../../lib/db/mongo');
db.connect({ url: 'mongodb://localhost/marble_unittest' });

let Q = require('q');
let _ = require('lodash');
let Job = require('../../../lib/db/mongo/job.model');
let common = require('../../../lib/common');
let testdata = require('./testdata');

describe('Mongoose Job', function() {
  beforeEach(function(done) {
    Q.all([
      Job.remove({}).exec(),
    ])
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  describe('creation', function() {
    it('should create a job with steps', function(done) {
      var jobData = testdata.jobData1;
      db.createJob(jobData)
      .then(function(job) {
        return Q(Job.find({}).exec());
      })
      .then(function(jobs) {
        jobs.should.be.an.Array.and.have.length(1);
        let job = jobs[0];

        job.status   .should.equal(common.status.new);
        job.queueName.should.equal(jobData.queueName);
        job.data     .should.eql(jobData.data);

        should.equal(job.startedAt,  null);
        should.equal(job.finishedAt, null);
        should.equal(job.handledAt,  null);
        job.lockedUntil.getTime().should.be.lessThan((new Date()).getTime());

        job.errorMessage.should.equal('');

        job.numSteps         .should.equal(jobData.steps.length);
        job.numStepsProcessed.should.equal(0);
        job.numStepsErrored  .should.equal(0);
        job.currentStepIndex .should.equal(0);

        job.steps.should.be.an.Array.and.have.length(3);

        job.steps.forEach(function(step, i) {
          step.status      .should.equal(common.status.new);
          step.action      .should.equal(jobData.steps[i].action);
          step.data        .should.eql  (jobData.steps[i].data);
          step.errorCount  .should.equal(0);
          step.errorMessage.should.equal('');
        });
        done();
      })
      .catch(function(err) {
        console.error(err);
        done(err);
      });

    });

  });

  describe('methods', function() {
    describe('obj', function() {
      it('should work for job with no steps done yet', function(done) {
        var jobData = testdata.jobData1;
        db.createJob(jobData)
        .then(function(job) {
          return Q(Job.findOne({ _id: job.id }).exec());
        })
        .then(function(job) {
          let expected = {
            id    : job._id,
            data  : jobData.data,
            status: common.status.new,
            step: {
              action: jobData.steps[0].action,
              data  : jobData.steps[0].data
            },
            stepIndex: 0,
          };

          job.obj().should.eql(expected);

          done();
        })
        .catch(function(err) {
          console.error(err);
          done(err);
        });
      });
      it('should work for job with all steps done', function(done) {
        let jobData = testdata.jobData1;
        let jobId;
        db.createJob(jobData)
        .then(function(job) {
          jobId = job.id;
          return Q(Job.findOne({ _id: jobId }).exec());
        })
        .then(function(job) {
          job.currentStepIndex = 3;
          job.status = common.status.ok;
          return job.qsave();
        })
        .then(function(job) {
          return Q(Job.findOne({ _id: jobId }).exec());
        })
        .then(function(job) {
          let expected = {
            id    : job._id,
            data  : jobData.data,
            status: common.status.ok,
            step: null
          };

          job.obj().should.eql(expected);

          done();
        })
        .catch(function(err) {
          console.error(err);
          done(err);
        });
      });
      it('should work for job with error status', function(done) {
        let jobData = testdata.jobData1;
        let jobId;
        let errorMessage = 'timeout reaching database';
        db.createJob(jobData)
        .then(function(job) {
          jobId = job.id;
          return Q(Job.findOne({ _id: jobId }).exec());
        })
        .then(function(job) {
          job.currentStepIndex = 3;
          job.status = common.status.error;
          job.errorMessage = errorMessage;
          return job.qsave();
        })
        .then(function(job) {
          return Q(Job.findOne({ _id: jobId }).exec());
        })
        .then(function(job) {
          let expected = {
            id    : job._id,
            data  : jobData.data,
            status: common.status.error,
            error : errorMessage,
            step: null
          };

          job.obj().should.eql(expected);

          done();
        })
        .catch(function(err) {
          console.error(err);
          done(err);
        });
      });
    });
  });

});
