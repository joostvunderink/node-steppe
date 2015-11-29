'use strict';

/**
 * @description The Marble item model.
 * @module marbleItem/model
 */

let mongoose  = require('mongoose');
let Schema    = mongoose.Schema;
let common    = require('../../common');
let qsave     = require('./qsave.plugin')

/** @class MarbleJob
 *
 * @description
 * This is a single job, that consists of multiple steps.
 * It can be used to perform sequential actions, that, when done
 * together, would either take too long, or would make error handling too
 * complex.
 *
 */

let MarbleJobSchema = new Schema({
  queueName    : { type: String, index: true },
  status       : { type: String, index: true },
  data         : { type: Schema.Types.Mixed },

  createdAt  : { type: Date, index: true },
  startedAt  : { type: Date, index: true, default: null },
  finishedAt : { type: Date, index: true, default: null },
  handledAt  : { type: Date, index: true, default: null },
  lockedUntil: { type: Date, index: false, default: null },
  
  errorMessage: { type: String, index: true, default: '' },

  steps: [{
    action: { type: String },
    data  : { type: Schema.Types.Mixed },
    status: { type: String },
    
    errorCount   : { type: Number, index: true, default: 0 },
    errorMessage : { type: String, index: true, default: '' },
  }],

  currentStepIndex  : { type: Number, default: 0 },
  numSteps          : { type: Number, index: true },
  numStepsProcessed : { type: Number, index: true, default: 0 },
  numStepsErrored   : { type: Number, index: true, default: 0 },
}, {});

MarbleJobSchema.plugin(qsave);

MarbleJobSchema.methods.getCurrentStep = function() {
  var self = this;
  if (self.currentStepIndex <= self.numSteps) {
    return self.steps[self.currentStepIndex];
  }
  return null;
}

module.exports = mongoose.model(common.getCollectionName('job'), MarbleJobSchema);
