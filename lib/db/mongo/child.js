'use strict';

/**
 * @description The PQ item model.
 * @module queueItem/model
 */

let mongoose  = require('mongoose');
let Schema    = mongoose.Schema;
let common    = require('../../common');
let qsave     = require('./qsave.plugin')

/** @class MarbleChild
 *
 * @description
 * This queue system can be used to perform sequential actions, that, when done
 * together, would either take too long, or would make error handling too
 * complex.
 *
 */

let MarbleChildSchema = new Schema({
  id           : { type: String, index: true },

  parentId     : { type: String, index: true },
  queueName    : { type: String, index: true },
  type         : { type: String, index: true },
  sequence     : { type: Number, index: true },

  status       : { type: String, index: true },
  createdDate  : { type: Date,   index: true },
  startedDate  : { type: Date,   index: true },
  processedDate: { type: Date,   index: true },

  errorCount   : { type: Number, index: true, default: 0 },
  errorMessage : { type: String, index: true },
  errorDate    : { type: Date,   index: true },

  data         : { type: Schema.Types.Mixed },
}, {} );

MarbleChildSchema.plugin(qsave);

module.exports = mongoose.model(common.getCollectionName('child'), MarbleChildSchema);
