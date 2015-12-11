'use strict';
var should = require('should');
var sinon  = require('sinon');

var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
mockgoose(mongoose);

var db = require('../lib/db/mongo');
db.connect({ url: 'mongodb://localhost/steppe_unittest' });

var Steppe = require('../lib/steppe');
var Q = require('q');
var common = require('../lib/common');

var log4js = require('log4js');
var logger = log4js.getLogger('steppe.spec');

var queueName = 'test1';
var jobArgs = {
  queueName: queueName,
  jobData: { location: 'home' },
  steps: [
    {
      stepData: { fruit: 'banana' },
      action  : 'buy_fruit',
    },
    {
      stepData: { fruit: 'apple' },
      action  : 'eat_fruit',
    },
    {
      stepData: { colour: 'red' },
      action  : 'paint_house',
    },
  ]
};

describe('queue handlers', function() {
  it('should call the queue handlers with the right data', function(done) {
    // given
    var steppe = new Steppe({ logger: logger });

    var stepHandlerStub = sinon.stub();
    stepHandlerStub.returns(Q.resolve());

    var jobFinishedStub  = sinon.stub();
    jobFinishedStub.returns(Q.resolve());

    steppe.defineQueue({
      name       : queueName,
      stepHandler: stepHandlerStub,
      jobFinished: jobFinishedStub,
      period     : '3 seconds',
    });

    db.createJob(jobArgs)
    .then(function(job) {
      // when
      // step 1
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 2
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 3 + job end
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // then
      stepHandlerStub.callCount.should.equal(3);
      stepHandlerStub.getCall(0).args[0].should.eql({
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(1).args[0].should.eql({
        action  : 'eat_fruit',
        stepData: { fruit: 'apple' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(2).args[0].should.eql({
        action  : 'paint_house',
        stepData: { colour: 'red' },
        jobData : { location: 'home' },
      });

      jobFinishedStub.callCount.should.equal(1);
      jobFinishedStub.getCall(0).args[0].should.eql({
        status  : common.status.ok,
        jobData : { location: 'home' },
      });
      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

  it('should call the queue handlers with the right data for fatal error', function(done) {
    // given
    var steppe = new Steppe({ logger: logger });

    var errorMsg = 'no more bananas';
    var stepHandlerStub = sinon.stub();
    stepHandlerStub.returns(Q.reject({error: errorMsg}));

    var jobFinishedStub  = sinon.stub();
    jobFinishedStub.returns(Q.resolve());

    steppe.defineQueue({
      name       : queueName,
      stepHandler: stepHandlerStub,
      jobFinished: jobFinishedStub,
      period     : '3 seconds',
    });

    db.createJob(jobArgs)
    .then(function(job) {
      // when
      // step 1: try 1, error
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 1: try 2, error
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 1: try 3, error, job end
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // then
      stepHandlerStub.callCount.should.equal(3);
      stepHandlerStub.getCall(0).args[0].should.eql({
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(1).args[0].should.eql({
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(2).args[0].should.eql({
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
        jobData : { location: 'home' },
      });

      jobFinishedStub.callCount.should.equal(1);
      jobFinishedStub.getCall(0).args[0].should.eql({
        status  : common.status.error,
        jobData : { location: 'home' },
        error   : errorMsg,
      });
      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

  it('should call the queue handlers with the right data for non-fatal error', function(done) {
    // given
    var steppe = new Steppe({ logger: logger });

    var errorMsg = 'no more bananas';
    var stepHandlerStub = sinon.stub();
    stepHandlerStub.onCall(0).returns(Q.reject({error: errorMsg}));
    stepHandlerStub.returns(Q.resolve());

    var jobFinishedStub  = sinon.stub();
    jobFinishedStub.returns(Q.resolve());

    steppe.defineQueue({
      name       : queueName,
      stepHandler: stepHandlerStub,
      jobFinished: jobFinishedStub,
      period     : '3 seconds',
    });

    db.createJob(jobArgs)
    .then(function(job) {
      // when
      // step 1: try 1, error
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 1: try 2,, success
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 2
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // step 3
      return steppe.findAndProcessJob(queueName);
    })
    .then(function(job) {
      // then
      stepHandlerStub.callCount.should.equal(4);
      
      stepHandlerStub.getCall(0).args[0].should.eql({
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(1).args[0].should.eql({
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(2).args[0].should.eql({
        action  : 'eat_fruit',
        stepData: { fruit: 'apple' },
        jobData : { location: 'home' },
      });
      stepHandlerStub.getCall(3).args[0].should.eql({
        action  : 'paint_house',
        stepData: { colour: 'red' },
        jobData : { location: 'home' },
      });

      jobFinishedStub.callCount.should.equal(1);
      jobFinishedStub.getCall(0).args[0].should.eql({
        status  : common.status.ok,
        jobData : { location: 'home' },
      });
      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

});