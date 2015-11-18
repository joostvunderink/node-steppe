'use strict';

/**
 * @description The Marble item model.
 * @module marbleItem/model
 */

let mongoose  = require('mongoose');
let Schema    = mongoose.Schema;
let common    = require('../../common');
let qsave     = require('./qsave.plugin')

/** @class MarbleParent
 *
 * @description
 * This queue system can be used to perform sequential actions, that, when done
 * together, would either take too long, or would make error handling too
 * complex.
 *
 */

let MarbleParentSchema = new Schema({
  id           : { type: String, index: true },
  queueName    : { type: String, index: true },
  status       : { type: String, index: true },
  createdDate  : { type: Date,   index: true },
  startedDate  : { type: Date,   index: true, default: null },
  processedDate: { type: Date,   index: true, default: null },
  handledDate  : { type: Date,   index: true, default: null },
  errorDate    : { type: Date,   index: true, default: null },

  errorCount   : { type: Number, index: true, default: 0 },
  errorMessage : { type: String, index: true, default: '' },

  numChildren          : { type: Number, index: true },
  numChildrenProcessed : { type: Number, index: true, default: 0 },
  numChildrenErrored   : { type: Number, index: true, default: 0 },

  data         : { type: Schema.Types.Mixed },
}, {});

MarbleParentSchema.plugin(qsave);

module.exports = mongoose.model(common.getCollectionName('parent'), MarbleParentSchema);
