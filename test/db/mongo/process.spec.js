'use strict';

let should = require('should');

let mongoose = require('mongoose');
let mockgoose = require('mockgoose');
mockgoose(mongoose);
let db = require('../../../lib/db/mongo');
db.connect({ url: 'mongodb://localhost/steppe_unittest' });

let Q = require('q');
let Job = require('../../../lib/db/mongo/job.model');
let common = require('../../../lib/common');
let testdata = require('./testdata');

describe('Mongoose processing a job', function() {
  beforeEach(function(done) {
    Q(Job.remove({}).exec())
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should process a single step successfully', function(done) {
    // given
    var jobData = testdata.jobData1;
    db.createJob(jobData)
    .then(function(createdJob) {
      // when
      return db.stepOk({
        jobId: createdJob.id
      });
    })
    .then(function() {
      // then
      return Q(Job.find({}).exec());
    })
    .then(function(jobs) {
      jobs.should.be.an.Array.and.have.length(1);
      let job = jobs[0];

      job.status.should.equal(common.status.working);
      job.queueName.should.equal(jobData.queueName);
      job.data.should.eql(jobData.data);

      job.startedAt.getTime().should.be.lessThan((new Date()).getTime());
      job.lockedUntil.getTime().should.be.lessThan((new Date()).getTime());
      should.equal(job.finishedAt, null);
      should.equal(job.handledAt, null);

      job.errorMessage.should.equal('');

      job.numSteps.should.equal(jobData.steps.length);
      job.numStepsProcessed.should.equal(1);
      job.numStepsErrored.should.equal(0);

      let step = job.steps[0];

      step.status.should.equal(common.status.ok);

      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

  it('should process a single step with error', function(done) {
    // given
    var jobData = testdata.jobData1;
    var errorMessage = 'out of bananas';
    db.createJob(jobData)
    .then(function(createdJob) {
      // when
      return db.stepError({
        jobId: createdJob.id,
        error: errorMessage
      });
    })
    .then(function() {
      // then
      return Q(Job.find({}).exec());
    })
    .then(function(jobs) {
      jobs.should.be.an.Array.and.have.length(1);
      let job = jobs[0];

      job.status.should.equal(common.status.working);
      job.queueName.should.equal(jobData.queueName);
      job.data.should.eql(jobData.data);

      job.startedAt.getTime().should.be.lessThan((new Date()).getTime());
      job.lockedUntil.getTime().should.be.lessThan((new Date()).getTime());
      should.equal(job.finishedAt, null);
      should.equal(job.handledAt, null);

      job.errorMessage.should.equal('');

      job.numSteps.should.equal(jobData.steps.length);
      job.numStepsProcessed.should.equal(0);
      job.numStepsErrored.should.equal(0);

      let step = job.steps[0];

      step.status.should.equal(common.status.working);
      step.errorCount.should.equal(1);
      step.errorMessage.should.equal(errorMessage);

      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

  it('should go into error state on 3 errors for 1 step', function(done) {
    // given
    var jobData = testdata.jobData1;
    var errorMessage = 'out of bananas';
    var createdJob;
    db.createJob(jobData)
    .then(function(cj) {
      createdJob = cj;
      // when
      return db.stepError({
        jobId: createdJob.id,
        error: errorMessage
      });
    })
    .then(function() {
      return db.stepError({
        jobId: createdJob.id,
        error: errorMessage
      });
    })
    .then(function() {
      return db.stepError({
        jobId: createdJob.id,
        error: errorMessage
      });
    })
    .then(function() {
      // then
      return Q(Job.find({}).exec());
    })
    .then(function(jobs) {
      jobs.should.be.an.Array.and.have.length(1);
      let job = jobs[0];

      job.status.should.equal(common.status.error);
      job.queueName.should.equal(jobData.queueName);
      job.data.should.eql(jobData.data);

      job.startedAt.getTime().should.be.lessThan((new Date()).getTime());
      job.lockedUntil.getTime().should.be.lessThan((new Date()).getTime());
      job.finishedAt.getTime().should.be.lessThan((new Date()).getTime());
      should.equal(job.handledAt, null);

      job.errorMessage.should.equal(errorMessage);

      job.numSteps.should.equal(jobData.steps.length);
      job.numStepsProcessed.should.equal(0);
      job.numStepsErrored.should.equal(0);

      let step = job.steps[0];

      step.status.should.equal(common.status.error);
      step.errorCount.should.equal(3);
      step.errorMessage.should.equal(errorMessage);

      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });
});
