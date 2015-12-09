'use strict';

let Agenda = require('agenda');

let Q = require('q');
let _ = require('lodash');

let common = require('./common');

let Steppe = function(args) {
  if (!args) {
    args = {};
  }

  let config = getConfig(args);

  var agenda = new Agenda({
    db: {
      address: config.db.url
    }
  });

  if (args.logger) {
    common.setLogger(args.logger);
  }

  let db = require('./db/' + config.db.type);
  db.connect(config.db);

  let self = this;
  let queueDefinitions = {},
      configuration = {},
      agendaStatus = {
        dbConnected: false,
        started: false,
        running: false,
      };

  self.STATUS = common.status;
  self.TYPE   = common.type;

  agenda.on('ready', function() {
    common.getLogger().info('agenda.on ready');
    agendaStatus.dbConnected = true;

    if (agendaStatus.started) {
      startAgenda();
    }
  });

  function startAgenda() {
    common.getLogger().info('startAgenda()');
    agenda.define('__cleanup', {}, self.cleanup);
    agenda.every('10 seconds', '__cleanup');
    _.keys(queueDefinitions).forEach(function(key) {
      let queueDefinition = queueDefinitions[key];
      agenda.define(queueDefinition.name, function(job, done) {
        self.findAndProcessJob(queueDefinition.name);
        done();
      });
      agenda.every(queueDefinition.period, queueDefinition.name);
    });
    agenda.start();
    agendaStatus.running = true;
    agenda.on('error', function(err) {
      console.error(err);
    });
  }

  self.defineQueue = function(queueDefinition) {
    // name         : 'makePhotoAlbum',
    // parentHandler: handleParent,
    // childHandler : handleChild,
    // period       : '20 seconds'
    queueDefinitions[queueDefinition.name] = queueDefinition;
    if (agendaStatus.running) {
      agenda.define(queueDefinition.name, function(job, done) {
        self.findAndProcessQueueItem(queueDefinition.name);
        done();
      });
      agenda.every(queueDefinition.period, queueDefinition.name)
    }
  };

  self.start = function() {
    common.getLogger().info('starting steppe');
    common.getLogger().info(queueDefinitions);
    agendaStatus.started = true;
    if (agendaStatus.dbConnected) {
      common.getLogger().info('db already connected -> starting agenda')
      startAgenda();
    }
    
    // agenda.on('ready', function() {
    //   agenda.start();
    // });
  };

  self.createJob = function(args) {
    return db.createJob(args);
  };

  self.cleanup = function(job, done) {
    // console.info('cleanup');
    done();
  }

  self.findAndProcessJob = function(queueName) {
    let qd = queueDefinitions[queueName];

    return db.findUnfinishedJob({ queueName: queueName })
    .then(function(job) {
      if (!job) {
        return;
      }

      if (!job.step) {
        common.getLogger().error('Got job without step. Should not happen.');
        return;
      }

      common.getLogger().debug('[job:%s] Step %s (%s): Calling handler.',
        job.id, job.stepIndex, job.step.action);

      // This step could either succeed or error.
      // Because we want to update the result of this step in either case,
      // we have a separate then/catch block here.
      // After that, we get the updated job object. At that point, we can
      // decide whether we need to call the job handler.
      return qd.stepHandler({
        action  : job.step.action,
        stepData: job.step.data,
        jobData : job.data,
      })
      .then(function(result) {
        common.getLogger().debug('[job:%s] Step %s: Handled ok.',
          job.id, job.stepIndex);
        if (result && result.hasOwnProperty('jobData')) {
          common.getLogger().debug('[job:%s] Step %s: Updating job data.',
            job.id, job.stepIndex);
        }
        return db.stepOk({ jobId: job.id, result: result });
      })
      .catch(function(result) {
        let error = result && result.error ? result.error : 'unknown error';
        return db.stepError({ jobId: job.id, error: error });
      });
    })
    .then(function(job) {
      if (!job) {
        return;
      }
      if (job.status === common.status.ok || job.status === common.status.error) {
        common.getLogger().info('[job:%s] All steps done. Calling job handler.',
          job.id);

        var jobHandledResult = {
          status: job.status,
          jobData: job.data,
        };
        if (job.status === common.status.error) {
          jobHandledResult.error = job.error;
        }
        
        return qd.jobHandler(jobHandledResult)
        .then(function(result) {
          common.getLogger().debug('[job:%s] Job handler called ok.',
            job.id);
          return db.jobHandled({ jobId: job.id, success: true, result: result });
        })
        .catch(function(err) {
          common.getLogger().error('[job:%s] Job handler error: %s',
            job.id, err);
          return db.jobHandled({ jobId: job.id, success: false, error: err });
        });
      }
    })
    .catch(function(err) {
      common.getLogger().error('Unknown error handling job:');
      common.getLogger().error(err);
    });
  }
}

function getConfig(args) {
  return {
    db: {
      type: 'mongo',
      url: 'mongodb://localhost/steppetest'
    }
  }
}

module.exports = Steppe;
