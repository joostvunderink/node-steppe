'use strict';

/**
 * @description The Job model.
 */

var mongoose  = require('mongoose');
var Schema    = mongoose.Schema;
var common    = require('../../common');
var qsave     = require('./qsave.plugin')

/** @class Job
 *
 * @description
 * This is a single job, that consists of multiple steps.
 * It can be used to perform sequential actions, that, when done
 * together, would either take too long, or would make error handling too
 * complex.
 *
 */

var JobSchema = new Schema({
  queueName    : { type: String, index: true },
  status       : { type: String, index: true },
  data         : { type: Schema.Types.Mixed },

  createdAt  : { type: Date, index: true },
  startedAt  : { type: Date, index: true, default: null },
  finishedAt : { type: Date, index: true, default: null },
  handledAt  : { type: Date, index: true, default: null },
  lockedUntil: { type: Date, index: false, default: null },
  
  errorMessage: { type: String, default: '' },

  steps: [{
    action: { type: String },
    data  : { type: Schema.Types.Mixed },
    status: { type: String },
    
    errorCount   : { type: Number, index: true, default: 0 },
    errorMessage : { type: String, default: '' },
  }],

  currentStepIndex  : { type: Number, index: true, default: 0 },
  numSteps          : { type: Number, index: true },
  numStepsProcessed : { type: Number, index: true, default: 0 },
  numStepsErrored   : { type: Number, index: true, default: 0 },
}, {});

JobSchema.plugin(qsave);

JobSchema.methods.obj = function() {
  var self = this;
  var ret = {
    id     : self._id,
    jobData: self.data,
    status : self.status,
    step   : null,
  };

  if (self.status === common.status.error) {
    ret.error = self.errorMessage;
  }

  var step = self.getCurrentStep();

  if (step) {
    ret.stepIndex = self.currentStepIndex;
    ret.step = {
      action  : step.action,
      stepData: step.data
    };
  }

  return ret;
};

JobSchema.methods.getCurrentStep = function() {
  var self = this;
  if (self.currentStepIndex <= self.numSteps) {
    return self.steps[self.currentStepIndex];
  }
  return null;
}

module.exports = mongoose.model(common.getCollectionName('job'), JobSchema);
