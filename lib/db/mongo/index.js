'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let Job = require('./job.model');
let Q = require('q');
let common = require('../../common');
let moment = require('moment');

module.exports = {
  connect          : connect,

  createJob        : createJob,
  findUnfinishedJob: findUnfinishedJob,
  stepOk           : stepOk,
  stepError        : stepError,
  jobHandled       : jobHandled,
};

function connect(args) {
  common.getLogger().info('connecting to mongo');
  mongoose.connect(args.url);
  common.getLogger().info('connected to mongo');
}


function createJob(args) {
  let queueName = args.queueName;
  let data      = args.data;
  let steps     = args.steps;

  var jobCreationArgs = {
    queueName  : args.queueName,
    data       : data,
    status     : common.status.new,
    createdAt: new Date(),
    lockedUntil: new Date(),
    numSteps   : args.steps.length,
    currentStep: 0,

    steps: args.steps.map(function(step) {
      return {
        status: common.status.new,
        action: step.action,
        data  : step.data,
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
  let searchArgs = {
    queueName: args.queueName,
    status: { $in: [common.status.new, common.status.working ]},
    lockedUntil: { $lt: new Date() }
  };

  let updateArgs = {
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
  let jobId = args.jobId;
  let result = args.result;

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

    let step = job.steps[job.currentStepIndex];

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
  let jobId = args.jobId;
  let error = args.error;
  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    if (job.currentStepIndex === 0) {
      job.startedAt = new Date();
      job.status = common.status.working;
    }

    let step = job.steps[job.currentStepIndex];
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
  let jobId = args.jobId;

  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    job.handledAt = new Date();
    return job.qsave().then(function(job) { return job.obj() });
  });
}

