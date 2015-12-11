'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Job = require('./job.model');
var Q = require('q');
var common = require('../../common');
var moment = require('moment');

module.exports = {
  connect          : connect,

  createJob        : createJob,
  findUnfinishedJob: findUnfinishedJob,
  stepOk           : stepOk,
  stepError        : stepError,
  jobHandled       : jobHandled,
};

function connect(args) {
  if (mongoose.connection.readyState) {
    common.getLogger().debug('Already connected to mongodb.')
  }
  else {
    common.getLogger().debug('Connecting to mongodb.');
    mongoose.connect(args.url);
    common.getLogger().info('Connected to mongodb.');
  }
}


function createJob(args) {
  var queueName = args.queueName;
  var jobData   = args.jobData;
  var steps     = args.steps;

  var jobCreationArgs = {
    queueName  : args.queueName,
    data       : jobData,
    status     : common.status.new,
    createdAt: new Date(),
    lockedUntil: new Date(),
    numSteps   : args.steps.length,
    currentStep: 0,

    steps: args.steps.map(function(step) {
      return {
        status: common.status.new,
        action: step.action,
        data  : step.stepData,
      }
    })
  };
  var job = new Job(jobCreationArgs);
  return job.qsave()
  .then(function(savedJob) {
    return savedJob.obj();
  });
}

function findUnfinishedJob(args) {
  var searchArgs = {
    queueName: args.queueName,
    status: { $in: [common.status.new, common.status.working ]},
    lockedUntil: { $lt: new Date() }
  };

  var updateArgs = {
    lockedUntil: moment().add(1, 'minute').toDate(),
    status     : common.status.working,
  };

  return Q(Job.findOneAndUpdate(searchArgs, updateArgs).exec())
  .then(function(job) {
    if (!job) {
      return null;
    }

    return job.obj();
  });

}

function stepOk(args) {
  var jobId = args.jobId;
  var result = args.result;

  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    if (job.currentStepIndex === 0) {
      job.startedAt = new Date();
      job.status = common.status.working;
    }

    // The step can modify the job data, so later steps can access
    // this new/updated data.
    if (result && result.hasOwnProperty('jobData')) {
      job.data = result.jobData;
    }

    var step = job.steps[job.currentStepIndex];

    step.status = common.status.ok;
    step.finishedAt = new Date();

    job.currentStepIndex += 1;
    job.numStepsProcessed += 1;

    // Last step succeeded? Then the job is done.
    if (job.currentStepIndex === job.steps.length) {
      job.finishedAt = new Date();
      job.status = common.status.ok;
    }

    job.lockedUntil = new Date();
    return job.qsave().then(function(job) { return job.obj() });
  });
}

function stepError(args) {
  var jobId = args.jobId;
  var error = args.error;
  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    if (job.currentStepIndex === 0) {
      job.startedAt = new Date();
      job.status = common.status.working;
    }

    var step = job.steps[job.currentStepIndex];
    step.errorCount += 1;
    step.errorMessage = error.toString();
    step.status = common.status.working;

    common.getLogger().error('[job:%s] Step %s: error #%s: %s',
      jobId, job.currentStepIndex, step.errorCount, error.toString());

    // TODO: get max error count from queue def.
    if (step.errorCount >= 3) {
      common.getLogger().error('[job:%s] Step %s: fatal error: %s. Job failed.',
        jobId, job.currentStepIndex, error)
      step.status = common.status.error;
      step.finishedAt = new Date();

      job.status = common.status.error;
      job.errorMessage = error.toString();
      job.finishedAt = new Date();
    }

    job.lockedUntil = new Date();
    return job.qsave().then(function(job) { return job.obj() });
  });
}

function jobHandled(args) {
  var jobId = args.jobId;

  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    job.handledAt = new Date();
    return job.qsave().then(function(job) { return job.obj() });
  });
}

