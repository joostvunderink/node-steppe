'use strict';

/**
 * @description The Marble queue model.
 * @module queue/model
 */

let mongoose  = require('mongoose');
let Schema    = mongoose.Schema;
let common    = require('../../common');
let qsave     = require('./qsave.plugin')

/** @class MarbleQueue
 *
 * @description
 * This queue system can be used to perform sequential actions, that, when done
 * together, would either take too long, or would make error handling too
 * complex.
 *
 */

let MarbleQueueSchema = new Schema({
  id           : { type: String, index: true },

  queueName    : { type: String, index: true },
}, {});

MarbleQueueSchema.plugin(qsave);

module.exports = mongoose.model(common.getCollectionName('queue'), MarbleQueueSchema);
