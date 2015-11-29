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
  console.log('connecting to mongo');
  mongoose.connect(args.url);
  console.log('connected to mongo');
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
  return job.qsave();
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

    let ret = {
      id    : job._id,
      data  : job.data,
      status: job.status,
      step  : null,
    };

    var step = job.getCurrentStep();

    if (step) {
      ret.step = {
        action: step.action,
        data  : step.data
      };
    }

    return ret;
  });

}

function stepOk(args) {
  let jobId = args.jobId;

  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    if (job.currentStepIndex === 0) {
      job.startedAt = new Date();
    }

    let step = job.steps[job.currentStepIndex];

    step.status = common.status.ok;
    step.finishedAt = new Date();

    job.status = common.status.working;
    job.currentStepIndex += 1;
    job.numStepsProcessed += 1;

    job.lockedUntil = new Date();
    return job.qsave();
  });
}

function stepError(args) {
  let jobId = args.jobId;
  let error = args.error;
  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    let step = job.steps[job.currentStepIndex];

    step.errorCount += 1;

    if (step.errorCount > 3) {
      step.status = common.status.error;
      step.finishedAt = new Date();

      job.status = common.status.error;
      job.finishedAt = new Date();
    }
    else {
      // nothing
      // step.status = common.status.working;
      // step.finishedAt = new Date();
      // job.currentStepIndex += 1;
    }

    job.lockedUntil = new Date();
    return job.qsave();
  });
}

function jobHandled(args) {
  let jobId = args.jobId;

  return Q(Job.findOne({ _id: jobId }).exec())
  .then(function(job) {
    job.status = common.status.ok;
    return job.qsave();
  });
}

